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
    return sorted(p for p in directory.iterdir()
                  if p.is_dir() and re.match(r'^[1-9]\d*\.', p.name))


def aliases_only(block):
    outputs = block.get('outputs', {})
    return (bool(outputs) and isinstance(outputs, dict)
            and all(isinstance(v, str) and v.startswith(('inputs.', 'nodes.')) for v in outputs.values())
            and not any(k in block for k in ('imagegen', 'writes_options', 'review')))


def validate_config(path, config):
    errors = []
    directory = path.parent
    skill_root = next((p.resolve() for p in (directory, *directory.parents) if (p / 'SKILL.md').is_file()), None)
    if skill_root is None:
        return [f'{path}: no containing SKILL.md']

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
                   'writes_options', 'dispatch'}
        unsupported = set(block) - allowed
        if unsupported:
            error(scope, f'unsupported node keys: {sorted(unsupported)}')
            return
        if 'dispatch' in block:
            dispatch = block['dispatch']
            if (not isinstance(dispatch, dict) or any(key in block for key in
                    ('run', 'if', 'imagegen', 'review', 'writes_options'))
                    or list(directory.glob('*.model')) or prompts(directory) or children(directory)):
                error(scope, 'dispatch must be a task-free node')
                return
            required = {
                'order': 'breadth_first_keyword_priority', 'mode': 'serial',
                'identity': 'state.nodes[{path}].id',
                'pointer': 'checkpointed_step',
                'once': 'completed_group_id', 'expand': 'append_direct_children',
                'complete': 'after_group_output_and_review',
                'completion_unit': 'group',
            }
            for key, expected in required.items():
                if dispatch.get(key) != expected:
                    error(scope, f'dispatch.{key} must be {expected}')
            bindings = block.get('inputs', {})
            document = dispatch.get('document')
            tool = dispatch.get('tool')
            if (not isinstance(bindings, dict) or not isinstance(document, str)
                    or not document.startswith('inputs.')
                    or document[7:] not in bindings
                    or not isinstance(tool, str) or not tool.startswith('inputs.')
                    or not isinstance(bindings.get(tool[7:]), dict)
                    or 'asset' not in bindings[tool[7:]]):
                error(scope, 'dispatch document and tool must bind declared inputs')
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
            priority = dispatch.get('priority_keywords')
            if (not isinstance(priority, list) or len(priority) != len(set(priority))
                    or any(not isinstance(name, str) or not re.fullmatch(name_pattern, name)
                           for name in priority)):
                error(scope, 'dispatch.priority_keywords must be a unique list of keywords')
            if dispatch.get('completion_requires') != [
                    'direct_children_exist', 'current_group_direct_parts_finished',
                    'current_group_review_passed']:
                error(scope, 'dispatch.completion_requires must define group completion gates')
            if dispatch.get('lifecycle') != {
                    'start': 'init', 'select': 'next', 'run': 'enter_route',
                    'active': 'resume_pointer', 'complete': 'complete',
                    'done': 'final_review_then_publish',
                    'after_change': 'select', 'repair': 'reopen', 'on_error': 'stop'}:
                error(scope, 'dispatch.lifecycle must define the complete cursor loop')
            if dispatch.get('carry') != ['svg'] or block.get('outputs') != {
                    'groups': document, 'state': state, 'svg': 'carry.svg'}:
                error(scope, 'dispatch must publish its tree, state, and final SVG carry')
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
            final_review = block.get('final_review')
            if not isinstance(final_review, dict) or 'run' not in final_review:
                error(scope, 'dispatch requires final_review.run')
            else:
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
                check_target(review['run'], review, scope + '.review')

    check_assets(config)
    if 'id' in config:
        visit(config, config['id'])
    elif set(config) - {'inputs', 'options'}:
        error('root', 'root input definition cannot dispatch a task')
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('roots', nargs='*', type=Path)
    args = parser.parse_args()
    errors, count = [], 0
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
            except (ValueError, yaml.YAMLError, OSError) as exc:
                errors.append(f'{path}: {exc}')
    for item in errors:
        print(item, file=sys.stderr)
    print(f'{count} workflow configurations checked; {len(errors)} errors')
    return bool(errors)


if __name__ == '__main__':
    sys.exit(main())
