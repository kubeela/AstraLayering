"""Lint workflow declarations without executing workers or generating artwork.

Requires PyYAML. Run without arguments to check skills under workflow-next.
"""
from pathlib import Path
import argparse
import re
import sys

import yaml


DEFAULT_ROOTS = [Path(__file__).resolve().parents[1]]


class UniqueLoader(yaml.SafeLoader):
    pass


def unique_mapping(loader, node):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node)
        if key in result:
            raise ValueError(f'duplicate YAML key: {key}')
        result[key] = loader.construct_object(value_node)
    return result


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)


def load_config(path):
    result = yaml.load(path.read_text(encoding='utf-8-sig'), Loader=UniqueLoader)
    if not isinstance(result, dict):
        raise ValueError('YAML must be an object')
    return result


def prompts(directory):
    return sorted(p for p in directory.glob('*.txt')
                  if p.name in ('提示词.txt', '生成提示词.txt') or p.name.endswith('prompt.txt'))


def children(directory):
    return sorted((p for p in directory.iterdir()
                   if p.is_dir() and re.match(r'^[1-9]\d*\.', p.name)),
                  key=lambda p: tuple(int(n) for n in re.match(r'^[\d.]+', p.name)[0].split('.') if n))


def aliases_only(block):
    outputs = block.get('outputs', {})
    return (bool(outputs) and isinstance(outputs, dict)
            and all(isinstance(v, str) and v.startswith(('inputs.', 'nodes.', 'carry.'))
                    for v in outputs.values())
            and not any(k in block for k in ('imagegen', 'writes_options', 'review')))


def validate_config(path, config):
    errors = []
    directory = path.parent
    skill_root = next((p.resolve() for p in (directory, *directory.parents) if (p / 'SKILL.md').is_file()), None)
    if skill_root is None:
        return [f'{path}: no containing SKILL.md']
    if directory.resolve() != skill_root and children(directory):
        return [f'{path}: numbered-child containers must omit 流程.yaml; '
                'declare inputs and outputs on their actual tasks']

    def resource(name, scope):
        if (not isinstance(name, str) or not name or Path(name).is_absolute()
                or re.match(r'^[A-Za-z]:', name) or '..' in Path(name).parts):
            error(scope, f'resource must be relative to SKILL.md without escaping it: {name}')
            return None
        target = (skill_root / name).resolve()
        if target != skill_root and skill_root not in target.parents:
            error(scope, f'resource escapes this skill: {name}')
            return None
        return target

    def error(scope, message):
        errors.append(f'{path} [{scope}]: {message}')

    def check_assets(value):
        if isinstance(value, dict):
            if 'asset' in value:
                name = value['asset']
                target = resource(name, 'asset')
                if target is not None:
                    if not target.exists():
                        error('asset', f'missing resource: {name}')
                    if target.suffix in ('.py', '.cjs', '.js') and target.parent.name != 'tools':
                        error('asset', f'executable tool must be in skill or step tools/: {name}')
            for item in value.values():
                check_assets(item)
        elif isinstance(value, list):
            for item in value:
                check_assets(item)

    def check_working_dir(block, scope, required=False):
        value = block.get('working_dir')
        if value is None and not required:
            return
        if (not isinstance(value, str) or not value
                or value != '{working_dir}' and not Path(value).is_absolute()):
            error(scope, 'working_dir must be {working_dir} or an absolute directory')

    def check_target(run, block, scope):
        if not isinstance(run, str) or not run.strip():
            error(scope, 'run must be a nonempty relative directory')
            return
        if '{' in run:
            error(scope, 'run templates require an explicit dispatch route')
            return
        for name in [run]:
            target = resource(name, scope)
            if target is None:
                continue
            if not target.is_dir():
                error(scope, f'run directory missing: {name}')
                continue
            models = list(target.glob('*.model'))
            local_prompts = prompts(target)
            numbered = children(target)
            if numbered:
                if models or local_prompts:
                    error(scope, f'container also defines a local task: {name}')
                if target == directory.resolve():
                    error(scope, 'local pure containers omit run and expand numbered children')
                continue
            if len(models) != 1:
                error(scope, f'expected exactly one task model: {name}')
            imagegen = block.get('imagegen')
            selected = imagegen.get('prompt') if isinstance(imagegen, dict) else block.get('prompt')
            if selected:
                prompt_path = resource(selected, scope + '.prompt')
                if prompt_path is not None and (not prompt_path.is_file() or prompt_path.parent != target):
                    error(scope, f'prompt missing: {selected}')
            elif len(local_prompts) != 1:
                error(scope, f'expected one prompt or an explicit prompt: {name}')
            if target == directory.resolve() and bool(imagegen) != any(p.name == 'imagegen.model' for p in models):
                error(scope, 'local imagegen configuration and model marker disagree')

    def visit(block, scope):
        if not isinstance(block, dict):
            error(scope, 'expected an object')
            return
        allowed = {'id', 'inputs', 'outputs', 'worker', 'if', 'then', 'else',
                   'run', 'prompt', 'imagegen', 'review', 'final_review',
                   'writes_options', 'dispatch', 'working_dir'}
        unsupported = set(block) - allowed
        if unsupported:
            error(scope, f'unsupported node keys: {sorted(unsupported)}')
            return
        check_working_dir(block, scope, required='run' in block or 'dispatch' in block)
        if 'dispatch' in block:
            dispatch = block['dispatch']
            if (not isinstance(dispatch, dict) or any(key in block for key in
                    ('run', 'if', 'imagegen', 'review', 'writes_options'))
                    or list(directory.glob('*.model')) or prompts(directory) or children(directory)):
                error(scope, 'dispatch must be a task-free node')
                return
            supported = {'document', 'state', 'tool', 'item', 'order', 'tree',
                         'routes', 'fallback', 'carry'}
            if set(dispatch) - supported:
                error(scope, f'unsupported dispatch keys: {sorted(set(dispatch) - supported)}')
            if dispatch.get('order') != 'breadth_first':
                error(scope, 'dispatch.order must be breadth_first')
            if dispatch.get('item') != 'tool.next.target':
                error(scope, 'dispatch.item must bind tool.next.target')
            bindings = block.get('inputs', {})
            document = dispatch.get('document')
            tool = dispatch.get('tool')
            if (not isinstance(bindings, dict) or not isinstance(document, str)
                    or not document.startswith('dispatch.inputs.')
                    or document[16:] not in bindings):
                error(scope, 'dispatch.document must bind dispatch.inputs.<declared name>')
            if (not isinstance(tool, dict) or set(tool) != {'asset'}
                    or not isinstance(tool.get('asset'), str)):
                error(scope, 'dispatch.tool must declare its orchestrator asset directly')
            state = dispatch.get('state')
            if (not isinstance(state, str) or Path(state).is_absolute()
                    or '..' in Path(state).parts or not state.endswith('.json')):
                error(scope, 'dispatch state must be a work-root-relative JSON path')
            tree = dispatch.get('tree')
            name_pattern = r'[a-z][a-z0-9]*(?:_[a-z0-9]+)*'
            types = set()
            dispatched = set()
            if not isinstance(tree, dict):
                error(scope, 'dispatch.tree must declare a root key and child edges')
            else:
                edges = tree.get('child_edges')
                root_key = tree.get('root_key')
                terminal = tree.get('terminal_types')
                dispatch_types = tree.get('dispatch_types')
                if (not isinstance(edges, dict) or not edges
                        or not isinstance(root_key, str) or root_key not in edges
                        or not all(isinstance(key, str) and re.fullmatch(name_pattern, key)
                                   and isinstance(kind, str) and re.fullmatch(name_pattern, kind)
                                   for key, kind in edges.items())
                        or not isinstance(terminal, list)
                        or len(terminal) != len(set(terminal))
                        or not set(terminal) <= set(edges.values())
                        or not isinstance(dispatch_types, list) or not dispatch_types
                        or len(dispatch_types) != len(set(dispatch_types))
                        or not set(dispatch_types) <= set(edges.values()) - set(terminal)):
                    error(scope, 'invalid dispatch.tree root, edges, terminal, or dispatch types')
                else:
                    types = set(edges.values())
                    dispatched = set(dispatch_types)
            carry = dispatch.get('carry')
            valid_carry = (isinstance(carry, dict) and bool(carry)
                    and not any(not isinstance(name, str) or not re.fullmatch(name_pattern, name)
                           or name in {'groups', 'state'}
                           or initial is not None and (
                               not isinstance(initial, str)
                               or not initial.startswith('dispatch.inputs.')
                               or not isinstance(bindings, dict)
                               or initial[16:] not in bindings)
                           for name, initial in carry.items()))
            if not valid_carry:
                error(scope, 'dispatch.carry must map artifact names to dispatch.inputs.<name> or null')
            outputs = block.get('outputs')
            expected_outputs = {'groups': document, 'state': state}
            if valid_carry:
                expected_outputs.update({name: 'carry.' + name for name in carry})
            if outputs != expected_outputs:
                error(scope, 'dispatch outputs must publish its tree, state, and named carry artifacts')
            routes = dispatch.get('routes')
            if not isinstance(routes, dict) or set(routes) != dispatched:
                error(scope, 'dispatch.routes must map every dispatched node type')
            else:
                for kind in routes:
                    mapping = routes[kind]
                    if not isinstance(mapping, dict):
                        error(scope, f'dispatch.routes.{kind} must be a map')
                        continue
                    for name, target in mapping.items():
                        if not isinstance(name, str) or not re.fullmatch(r'[a-z][a-z0-9]*(?:_[a-z0-9]+)*', name):
                            error(scope, f'invalid route name: {name}')
                        check_target(target, {}, f'{scope}.routes.{kind}.{name}')
            check_target(dispatch.get('fallback'), {}, scope + '.fallback')
            if 'final_review' in block:
                final_review = block['final_review']
                if not isinstance(final_review, dict) or 'run' not in final_review:
                    error(scope, 'final_review requires run')
                else:
                    check_working_dir(final_review, scope + '.final_review', required=True)
                    check_target(final_review['run'], final_review, scope + '.final_review')
            return
        if 'if' in block:
            if any(k in block for k in ('run', 'imagegen', 'review', 'outputs', 'writes_options')):
                error(scope, 'put task execution and outputs inside the selected branch')
            if 'then' not in block:
                error(scope, 'if requires then')
            for key in ('then', 'else'):
                if key in block:
                    visit(block[key], scope + '.' + key)
            return
        if 'run' in block:
            check_target(block['run'], block, scope)
        elif children(directory):
            if list(directory.glob('*.model')) or prompts(directory):
                error(scope, 'container cannot also define a local task')
        elif not aliases_only(block):
            error(scope, 'task requires explicit run; no implicit local dispatch')
        if 'review' in block:
            review = block['review']
            if not isinstance(review, dict) or 'run' not in review:
                error(scope, 'review requires run')
            else:
                check_working_dir(review, scope + '.review', required=True)
                check_target(review['run'], review, scope + '.review')

    check_assets(config)
    if 'id' in config:
        visit(config, config['id'])
    elif set(config) - {'inputs', 'options', 'working_dir'}:
        error('root', 'root input definition cannot dispatch a task')
    else:
        check_working_dir(config, 'root', required=True)
    return errors


REFERENCE = re.compile(r'^(inputs|nodes|options|self|carry|dispatch)\.')
EXPRESSION_REFERENCES = re.compile(r'\b(?:inputs|nodes|options|self|carry|dispatch)\.[a-zA-Z_0-9.]+')
ITEM_FIELDS = {'id', 'kind', 'name', 'path', 'parent_path'}


def output_values(block):
    result = {}
    outputs = block.get('outputs', {})
    if isinstance(outputs, dict):
        for name, value in outputs.items():
            result.setdefault(name, []).append(value)
    for key in ('then', 'else'):
        child = block.get(key)
        if isinstance(child, dict):
            for name, values in output_values(child).items():
                result.setdefault(name, []).extend(values)
    return result


def validate_bindings(skill_root, configs):
    """Check explicit namespaces and saved artifact paths across one skill."""
    errors = []
    root = configs.get(skill_root / '流程.yaml', {})
    root_inputs = root.get('inputs', {})
    root_options = root.get('options', {})
    if not isinstance(root_inputs, dict):
        errors.append(f'{skill_root / "流程.yaml"}: root inputs must be a map')
        root_inputs = {}
    if not isinstance(root_options, dict):
        errors.append(f'{skill_root / "流程.yaml"}: root options must be a map')
        root_options = {}
    nodes = {config['id']: (path, config) for path, config in configs.items()
             if isinstance(config.get('id'), str)}
    dispatches = [(path, config) for path, config in configs.items()
                  if isinstance(config.get('dispatch'), dict)]

    def contexts(path):
        result = []
        for dispatch_path, config in dispatches:
            dispatch = config['dispatch']
            targets = [dispatch.get('fallback')]
            routes = dispatch.get('routes', {})
            for mapping in routes.values() if isinstance(routes, dict) else []:
                if isinstance(mapping, dict):
                    targets.extend(mapping.values())
            for target in targets:
                if isinstance(target, str):
                    directory = (skill_root / target).resolve()
                    if path.parent == directory or directory in path.parents:
                        result.append((dispatch_path, config))
                        break
        return result

    def normalized(value):
        return str(Path(value))

    def order(path):
        result = []
        for part in path.relative_to(skill_root).parts:
            number = re.match(r'^([\d.]+)', part)
            if number:
                result.append((0, tuple(int(n) for n in number[1].split('.') if n), part))
            else:
                result.append((1, (), part))
        return tuple(result)

    def resolve(value, context, path, self_outputs=None, seen=frozenset()):
        if not isinstance(value, str) or value in seen:
            return set()
        if not REFERENCE.match(value):
            return {normalized(value)}
        seen = seen | {value}
        parts = value.split('.')
        candidates = []
        if len(parts) == 3 and parts[0] == 'nodes' and parts[1] in nodes:
            candidates = output_values(nodes[parts[1]][1]).get(parts[2], [])
        elif len(parts) == 3 and parts[:2] == ['dispatch', 'inputs'] and context:
            candidate = context[1].get('inputs', {}).get(parts[2])
            if isinstance(candidate, dict):
                candidate = candidate.get('from')
            candidates = [candidate]
        elif len(parts) == 2 and parts[0] == 'carry' and context:
            candidates = [context[1]['dispatch'].get('carry', {}).get(parts[1])]
            for earlier_path, earlier_config in configs.items():
                if context in contexts(earlier_path) and order(earlier_path) < order(path):
                    candidates.extend(output_values(earlier_config).get(parts[1], []))
        elif len(parts) == 2 and parts[0] == 'self':
            candidates = (self_outputs or {}).get(parts[1], [])
        result = set()
        for candidate in candidates:
            result.update(resolve(candidate, context, path, self_outputs, seen))
        return result

    for path, config in configs.items():
        if path == skill_root / '流程.yaml':
            continue
        owners = contexts(path)
        if 'dispatch' in config:
            owners = [(path, config)]
        for context in owners or [None]:
            is_item = context is not None and context[0] != path
            dispatch_inputs = context[1].get('inputs', {}) if context else {}
            carry = context[1]['dispatch'].get('carry', {}) if context else {}

            def error(scope, message):
                errors.append(f'{path} [{scope}]: {message}')

            def reference(value, scope, self_outputs=None):
                if not isinstance(value, str) or not REFERENCE.match(value):
                    return
                parts = value.split('.')
                if parts[0] == 'inputs':
                    if len(parts) != 2 or parts[1] not in root_inputs:
                        error(scope, f'{value} is not a declared root input; '
                              'use nodes.*, dispatch.inputs.*, or carry.* for workflow data')
                elif parts[0] == 'nodes':
                    if (len(parts) != 3 or parts[1] not in nodes
                            or parts[2] not in output_values(nodes[parts[1]][1])):
                        error(scope, f'unknown upstream output: {value}')
                    else:
                        other_path = nodes[parts[1]][0]
                        other_owners = contexts(other_path)
                        if other_owners and context not in other_owners:
                            error(scope, f'output belongs to another dispatch route: {value}')
                        elif (other_owners and order(other_path) >= order(path)
                              or not other_owners and order(other_path) >= order(context[0] if is_item else path)):
                            error(scope, f'output is not from an earlier task: {value}')
                elif parts[0] == 'options':
                    if len(parts) != 2 or parts[1] not in root_options:
                        error(scope, f'unknown root option: {value}')
                elif parts[0] == 'self':
                    if len(parts) != 2 or parts[1] not in (self_outputs or {}):
                        error(scope, f'self.* is only a reviewed task output: {value}')
                elif parts[0] == 'carry':
                    if len(parts) != 2 or parts[1] not in carry:
                        error(scope, f'unknown dispatch carry: {value}')
                elif (len(parts) == 3 and parts[1] == 'inputs'
                      and parts[2] in dispatch_inputs):
                    pass
                elif (len(parts) == 3 and parts[1] == 'item'
                      and parts[2] in ITEM_FIELDS and is_item):
                    pass
                else:
                    error(scope, f'unknown dispatch binding: {value}')

            def placeholders(value, bindings, scope):
                if not isinstance(value, str):
                    return
                for name in re.findall(r'\{([^{}]+)\}', value):
                    if name not in bindings:
                        error(scope, f'placeholder {{{name}}} has no declared task input')

            def visit(block, scope, inherited=None, self_outputs=None):
                if not isinstance(block, dict):
                    return
                declared = block.get('inputs', {})
                if not isinstance(declared, dict):
                    error(scope, 'inputs must be a map')
                    return
                bindings = dict(inherited or {})
                bindings.update(declared)
                for name, value in declared.items():
                    if isinstance(value, dict):
                        if set(value) - {'asset', 'from', 'required'}:
                            error(scope + '.inputs.' + name, 'typed external inputs belong only in the root definition')
                        value = value.get('from')
                    reference(value, scope + '.inputs.' + name, self_outputs)
                condition = block.get('if')
                if isinstance(condition, str):
                    for value in EXPRESSION_REFERENCES.findall(condition):
                        reference(value, scope + '.if', self_outputs)
                elif isinstance(condition, dict):
                    for value in condition.values():
                        reference(value, scope + '.if', self_outputs)
                imagegen = block.get('imagegen')
                if isinstance(imagegen, dict):
                    for name in imagegen.get('inputs', []):
                        if name not in bindings:
                            error(scope + '.imagegen', f'undeclared imagegen input: {name}')
                placeholders(block.get('worker'), bindings, scope + '.worker')
                outputs = block.get('outputs', {})
                if not isinstance(outputs, dict):
                    error(scope, 'outputs must be a map')
                    return
                sources = set()
                for value in bindings.values():
                    if isinstance(value, dict):
                        value = value.get('from')
                    sources.update(resolve(value, context, path, self_outputs))
                for name, value in outputs.items():
                    target_scope = scope + '.outputs.' + name
                    if not isinstance(value, str) or not value:
                        error(target_scope, 'output must be an explicit reference or saved path')
                        continue
                    reference(value, target_scope, self_outputs)
                    if REFERENCE.match(value):
                        continue
                    placeholders(value, bindings, target_scope)
                    parts = Path(value).parts
                    if Path(value).is_absolute() or '..' in parts or re.match(r'^[A-Za-z]:', value):
                        error(target_scope, 'saved output must remain relative to working_dir')
                    if parts and parts[0].lower() in {'tmp', 'temp'}:
                        error(target_scope, 'declared deliverables must be saved outside temporary directories')
                    same_input = bindings.get(name)
                    if isinstance(same_input, dict):
                        same_input = same_input.get('from')
                    updates_artifact = (self_outputs is None
                            and isinstance(same_input, str)
                            and same_input.startswith(('nodes.', 'dispatch.inputs.', 'carry.'))
                            and normalized(value) in resolve(same_input, context, path, self_outputs))
                    if normalized(value) in sources and not updates_artifact:
                        error(target_scope, f'saved output overwrites an input artifact: {value}')
                for key in ('then', 'else'):
                    visit(block.get(key), scope + '.' + key, bindings, self_outputs)
                reviewed_outputs = output_values(block)
                for key in ('review', 'final_review'):
                    visit(block.get(key), scope + '.' + key, bindings, reviewed_outputs)
                dispatch = block.get('dispatch')
                if isinstance(dispatch, dict):
                    reference(dispatch.get('document'), scope + '.dispatch.document')
                    for name, value in dispatch.get('carry', {}).items():
                        reference(value, scope + '.dispatch.carry.' + name)

            visit(config, config.get('id', 'node'))
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('roots', nargs='*', type=Path)
    args = parser.parse_args()
    errors, count = [], 0
    skill_configs = {}
    for root in args.roots or DEFAULT_ROOTS:
        files = sorted(root.rglob('流程.yaml'))
        if not files:
            errors.append(f'{root}: no workflow configurations')
        ids = set()
        for path in files:
            count += 1
            try:
                config = load_config(path)
                identity = config.get('id')
                if identity is not None:
                    if identity in ids:
                        errors.append(f'{path}: duplicate node id {identity}')
                    ids.add(identity)
                errors.extend(validate_config(path, config))
                skill_root = next((p.resolve() for p in (path.parent, *path.parent.parents)
                                   if (p / 'SKILL.md').is_file()), None)
                if skill_root is not None:
                    skill_configs.setdefault(skill_root, {})[path.resolve()] = config
            except (ValueError, yaml.YAMLError, OSError) as exc:
                errors.append(f'{path}: {exc}')
    for skill_root, configs in skill_configs.items():
        errors.extend(validate_bindings(skill_root, configs))
    for item in errors:
        print(item, file=sys.stderr)
    print(f'{count} workflow configurations checked; {len(errors)} errors')
    return bool(errors)


if __name__ == '__main__':
    sys.exit(main())
