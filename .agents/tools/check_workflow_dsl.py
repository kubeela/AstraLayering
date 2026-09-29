"""Lint the production skills without executing workers or generating artwork.

Requires PyYAML. Run without arguments to check both production skills.
"""
from pathlib import Path
import argparse
import re
import sys

import yaml


SKILLS_ROOT = Path(__file__).resolve().parents[1] / 'skills'
DEFAULT_ROOTS = [SKILLS_ROOT / 'live2d-layering',
                 SKILLS_ROOT / 'live2d-clothing']


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

    def check_target(run, block, scope, loop=None):
        if not isinstance(run, str) or not run.strip():
            error(scope, 'run must be a nonempty relative directory')
            return
        targets = [run]
        if '{' in run:
            # The current kind dispatcher explicitly lists its template domain.
            if not loop or not loop.get('priority') or '{group.kind}' not in run:
                error(scope, 'cannot statically resolve run template domain')
                return
            targets = [run.replace('{group.kind}', kind) for kind in loop['priority']]
        for name in targets:
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
