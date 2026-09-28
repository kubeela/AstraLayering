"""Check real DSL bindings and keyform tool behavior; not a character art trial."""
from copy import deepcopy
import itertools
import json
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

import yaml

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS / 'expressions'))
from expression_assets import pose, validate_materials
from validate_contract import validate_data

ROOT = TOOLS.parent / 'workflows/expressions'
EXAMPLES = TOOLS / 'expressions/examples'
SVG = EXAMPLES / 'contract-fixture.svg'
RIG = json.loads((EXAMPLES / 'controls.example.json').read_text(encoding='utf-8'))


def fixture_materials():
    bindings = {k: deepcopy(v) for k, v in RIG['bindings'].items() if v['type'] == 'path_morph'}
    used = {p for b in bindings.values() for p in b['parameters']}
    return {
        'schema_version': '0.1.0', 'character_id': RIG['character_id'],
        'parameters': {p: deepcopy(RIG['parameters'][p]) for p in used},
        'bindings': bindings, 'anchors': deepcopy(RIG['anchors']),
        'components': [
            {'id': 'eye', 'owner_node': 'expression_eyes', 'svg_ids': ['eye_aperture'],
             'parameter_ids': ['eye.left.open'], 'role': 'eye aperture and clip',
             'motion': 'open and close', 'style_notes': 'schematic test fixture'},
            {'id': 'mouth', 'owner_node': 'expression_mouth', 'svg_ids': ['mouth_contour'],
             'parameter_ids': ['mouth.open', 'mouth.form'], 'role': 'mouth opening',
             'motion': 'open by form grid', 'style_notes': 'schematic test fixture'},
        ],
    }


class MaterialsTests(unittest.TestCase):
    def test_art_targets_can_precede_morph_grid_and_use_existing_commands(self):
        materials = fixture_materials()
        materials['bindings'] = {}
        validate_materials(materials, SVG)
        command = {
            'schema_version': '0.1.0', 'document_type': 'command',
            'character_id': RIG['character_id'],
            'actions': [{'op': 'reset'}, {'op': 'set_parameters',
                'values': {'eye.left.open': .5, 'mouth.open': 1, 'mouth.form': 0},
                'transition_s': 0}],
        }
        # The same target command is usable by the final rig without a new format.
        validate_data(RIG, SVG, command)
        invalid = deepcopy(command)
        invalid['actions'][1]['values']['mouth.open'] = 9
        with self.assertRaises(ValueError):
            validate_data(RIG, SVG, invalid)

    def test_handoff_and_real_pose(self):
        materials = fixture_materials()
        validate_materials(materials, SVG)
        original = SVG.read_bytes()
        with tempfile.TemporaryDirectory(prefix='astra-keyforms-') as directory:
            output = Path(directory) / 'half.svg'
            pose(SVG, materials, {'eye.left.open': .5, 'mouth.open': .5, 'mouth.form': .5}, output)
            nodes = {e.get('id'): e for e in ET.parse(output).iter() if e.get('id')}
            self.assertIn('C 30 21 50 21 60 30', nodes['eye_aperture'].get('d'))
            self.assertIn('C 40 69.5 60 69.5 70 72.5', nodes['mouth_contour'].get('d'))
            self.assertEqual(nodes['eye_clip'][0].get('href'), '#eye_aperture')
            self.assertEqual(original, SVG.read_bytes())
            with self.assertRaises(ValueError):
                pose(SVG, materials, {}, SVG)

    def test_errors_are_real_geometry_and_ownership_failures(self):
        cases = [
            lambda m: m['bindings']['mouth_shape']['keys'].pop(),
            lambda m: m['bindings']['eye_aperture']['keys'][0].update(d='M 0 0 L 1 1 Z'),
            lambda m: m['bindings']['eye_aperture'].update(svg_id='missing'),
            lambda m: m['components'][0]['svg_ids'].append('mouth_contour'),
            lambda m: m['components'][0].update(owner_node='missing'),
            lambda m: m['components'][0].update(parameter_ids=[]),
            lambda m: m['anchors']['lower_lid'].update(command_index=99),
            lambda m: m['bindings']['eye_aperture']['keys'][1].update(d='M 20 31 C 30 12 50 12 60 30 C 50 40 45 42 40 42 C 35 42 25 40 20 30 Z'),
        ]
        for edit in cases:
            with self.subTest(edit=edit):
                materials = fixture_materials()
                edit(materials)
                with self.assertRaises(ValueError):
                    validate_materials(materials, SVG)

    def test_pose_then_existing_png_renderer(self):
        with tempfile.TemporaryDirectory(prefix='astra-keyform-render-') as directory:
            directory = Path(directory)
            output, png = directory / 'pose.svg', directory / 'pose.png'
            pose(SVG, fixture_materials(), {'mouth.open': 1}, output)
            subprocess.run([sys.executable, str(TOOLS / 'svg_preview.py'), str(output), str(png)], check=True, capture_output=True)
            from PIL import Image
            with Image.open(png) as image:
                self.assertEqual(image.size, (120, 120))
                self.assertIsNotNone(image.getbbox())


class WorkflowTests(unittest.TestCase):
    def nodes(self):
        return [(p, yaml.safe_load(p.read_text(encoding='utf-8'))) for p in sorted(ROOT.glob('[12].*/*/流程.yaml'))]

    def test_resources_use_skill_or_agent_tools(self):
        def local_file(base, value):
            if value.startswith(('http:', 'https:', '#', 'data:', 'blob:')):
                return
            target = (base / value.split('#', 1)[0].split('?', 1)[0]).resolve()
            self.assertTrue(ROOT in target.parents or TOOLS in target.parents, 'resource outside skill/agent-tools: ' + value)
            self.assertTrue(target.is_file(), str(target))

        for name in ('SKILL.md', 'README.md', 'docs/workflow-dsl.md'):
            document = ROOT / name
            for value in re.findall(r'\]\(([^)]+)\)', document.read_text(encoding='utf-8')):
                local_file(document.parent, value)

        class Assets(HTMLParser):
            def handle_starttag(inner, tag, attributes):
                for key, value in attributes:
                    if key == 'src' and value:
                        local_file(TOOLS / 'preview', value)

        for html in (TOOLS / 'preview').glob('*.html'):
            Assets().feed(html.read_text(encoding='utf-8'))

    def test_models_assets_and_branch_dataflow(self):
        nodes = self.nodes()
        self.assertEqual(len(nodes), 9)
        self.assertEqual(len({c['id'] for _, c in nodes}), len(nodes))
        root_inputs = yaml.safe_load((ROOT / '流程.yaml').read_text(encoding='utf-8'))['inputs']
        for path, config in nodes:
            models = [p.name for p in path.parent.glob('*.model')]
            self.assertEqual(models, ['imagegen.model'] if config['id'] == 'expression_style' else ['gpt-6-sol-xhigh.model'])
            prompts = list(path.parent.glob('*提示词.txt'))
            self.assertEqual(len(prompts), 1)
            for value in config['inputs'].values():
                if isinstance(value, dict) and 'asset' in value:
                    asset = (path.parent / value['asset']).resolve()
                    self.assertTrue(asset.is_file(), str(asset))
                    self.assertTrue(ROOT in asset.parents or TOOLS in asset.parents, 'asset outside skill/agent-tools: ' + str(asset))
                    self.assertNotIn('live2d-tutorial-text', str(asset))
        # Both reference branches and every subset of drawing responsibilities.
        for generation, *active in itertools.product([False, True], repeat=5):
            with self.subTest(generation=generation, active=active):
                published = {}
                globals_ = {key: '@root/' + key for key in root_inputs}
                global_state = globals_.copy()
                def resolve(value, local, path):
                    if isinstance(value, dict):
                        if 'asset' in value:
                            return str((path.parent / value['asset']).resolve())
                        return resolve(value['from'], local, path)
                    if value.startswith('inputs.'):
                        return local[value.split('.', 1)[1]]
                    if value.startswith('nodes.'):
                        _, identity, name = value.split('.')
                        return published[identity][name]
                    return '@output/' + value
                draws = dict(zip(['expression_eyes', 'expression_mouth', 'expression_face_effects', 'expression_symbols'], active))
                previous_svg = globals_['base_svg']
                for path, config in nodes:
                    local = {key: resolve(value, globals_, path) for key, value in config['inputs'].items()}
                    branch = config
                    if 'if' in config:
                        self.assertNotIn('run', config)
                        branch = config['then' if (generation if config['id'] == 'expression_style' else draws[config['id']]) else 'else']
                    active_task = (generation if config['id'] == 'expression_style' else draws.get(config['id'], True))
                    if active_task:
                        self.assertEqual(branch.get('run'), '.')
                    else:
                        self.assertNotIn('run', branch)
                    result = {key: resolve(value, local, path) for key, value in branch['outputs'].items()}
                    if 'imagegen' in branch:
                        for key in branch['imagegen']['inputs']:
                            self.assertIn(key, local)
                        self.assertNotIn('specification', branch['imagegen']['inputs'])
                    if config['id'] in draws:
                        self.assertEqual(local['svg'], previous_svg)
                        if not draws[config['id']]:
                            self.assertEqual(result['svg'], local['svg'])
                            self.assertEqual(result['materials'], local['materials'])
                        previous_svg = result['svg']
                    if config['id'] == 'expression_key_review':
                        self.assertNotIn('expression_face_effects', published)
                        self.assertNotIn('expression_symbols', published)
                        self.assertEqual(local['candidate'], previous_svg)
                        self.assertEqual(local['keyforms'], published['expression_mouth']['keyforms'])
                        # Model a repair changing the published paths: downstream
                        # must consume the reviewed versions, not the old candidate.
                        result['svg'] = '@reviewed/character.svg'
                        result['materials'] = '@reviewed/materials.json'
                        result['keyforms'] = '@reviewed/keyforms'
                        previous_svg = result['svg']
                    if config['id'] == 'expression_face_effects':
                        self.assertEqual(local['materials'], published['expression_key_review']['materials'])
                        self.assertEqual(local['keyforms'], published['expression_key_review']['keyforms'])
                    if config['id'] in ('expression_bindings', 'expression_delivery'):
                        self.assertEqual(local['materials'], published['expression_symbols']['materials'])
                        self.assertEqual(local['keyforms'], published['expression_key_review']['keyforms'])
                    if config['id'] == 'expression_bindings':
                        self.assertEqual(local['svg'], previous_svg)
                        self.assertEqual(local['shape_review'], published['expression_key_review']['report'])
                    published[config['id']] = result
                self.assertEqual(globals_, global_state)
                self.assertEqual(published['expression_symbols']['svg'], previous_svg)
                self.assertEqual(published['expression_delivery']['final_svg'], '@output/final/character.svg')
                self.assertEqual(published['expression_delivery']['final_controls'], '@output/final/controls.json')


if __name__ == '__main__':
    unittest.main()
