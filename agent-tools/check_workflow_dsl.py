"""Lint dispatch declarations; does not execute workers or generate artwork.

Requires PyYAML. Run without arguments to check the three active workflow roots.
"""
from pathlib import Path
import argparse
import re
import sys

import yaml


REPO = Path(__file__).resolve().parents[1]
DEFAULT_ROOTS = [REPO / '.agents/skills/live2d-layering',
                 REPO / '.agents/skills/live2d-clothing',
                 REPO / 'workflows/expressions']


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
    skill_root = next((p for p in (directory, *directory.parents) if (p / 'SKILL.md').is_file()), None)
    tool_root = Path(__file__).resolve().parent

    def error(scope, message):
        errors.append(f'{path} [{scope}]: {message}')

    def check_assets(value):
        if isinstance(value, dict):
            if 'asset' in value:
                name = value['asset']
                if not isinstance(name, str):
                    error('asset', 'asset must be a relative path')
                else:
                    target = (directory / name).resolve()
                    if not target.exists():
                        error('asset', f'missing resource: {name}')
                    if skill_root not in target.parents and tool_root not in target.parents:
                        error('asset', f'resource must belong to this skill or agent-tools: {name}')
                    if target.suffix in ('.py', '.cjs', '.js') and tool_root not in target.parents:
                        error('asset', f'executable tool must be in agent-tools: {name}')
            for item in value.values():
                check_assets(item)
        elif isinstance(value, list):
            for item in value:
                check_assets(item)

    def check_target(run, block, scope, loop=None):
        if not isinstance(run, str) or not run.strip():
            error(scope, 'run must be a nonempty relative directory')
            return
        if Path(run).is_absolute() or re.match(r'^[A-Za-z]:', run):
            error(scope, 'run must be relative to this YAML')
            return
        targets = [run]
        if '{' in run:
            # The current kind dispatcher explicitly lists its template domain.
            if not loop or not loop.get('priority') or '{group.kind}' not in run:
                error(scope, 'cannot statically resolve run template domain')
                return
            targets = [run.replace('{group.kind}', kind) for kind in loop['priority']]
        for name in targets:
            target = (directory / name).resolve()
            if skill_root and target != skill_root and skill_root not in target.parents:
                error(scope, f'run must stay inside this skill: {name}')
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
                if not (target / selected).is_file():
                    error(scope, f'prompt missing: {selected}')
            elif len(local_prompts) != 1:
                error(scope, f'expected one prompt or an explicit prompt: {name}')
            if target == directory.resolve() and bool(imagegen) != any(p.name == 'imagegen.model' for p in models):
                error(scope, 'local imagegen configuration and model marker disagree')

    def visit(block, scope):
        if not isinstance(block, dict):
            error(scope, 'expected an object')
            return
        if 'if' in block:
            if any(k in block for k in ('run', 'foreach', 'imagegen', 'review', 'outputs', 'writes_options')):
                error(scope, 'put task execution and outputs inside the selected branch')
            if 'then' not in block:
                error(scope, 'if requires then')
            for key in ('then', 'else'):
                if key in block:
                    visit(block[key], scope + '.' + key)
            return
        if 'foreach' in block:
            if 'run' in block:
                error(scope, 'loop dispatch belongs in foreach.run only')
            loop = block['foreach']
            if not isinstance(loop, dict):
                error(scope, 'foreach must be an object')
                return
            if 'run' in loop:
                check_target(loop['run'], block, scope + '.foreach', loop)
            elif list(directory.glob('*.model')) or prompts(directory) or not children(directory):
                error(scope, 'local loop task requires foreach.run; only pure child containers may omit it')
        elif 'run' in block:
            check_target(block['run'], block, scope)
        elif not aliases_only(block):
            if (list(directory.glob('*.model')) or prompts(directory) or not children(directory)
                    or any(k in block for k in ('imagegen', 'writes_options', 'outputs', 'review'))):
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
