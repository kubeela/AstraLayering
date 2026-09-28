"""Exercise node handoff, rendered order and the existing Jianma regression.

Requires the existing Pillow, PyYAML, Node and sharp preview dependencies.
No model/image-generation calls and no edits to committed illustration outputs.
"""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw
import yaml

STEP = Path(__file__).resolve().parents[1]
SKILL = STEP.parent
REPO = SKILL.parent.parent
sys.path.insert(0, str(STEP/'tools'))
sys.path.insert(0, str(SKILL/'2.皮套结构识别/tools'))
import face_compare as face
import display_order as display
from svg_preview import RenderBatch, SVG_NS


def structure(parts=False):
    return {'subject': 'character', 'groups': [
        {'name': 'face', 'groups': [
            {'name': 'face_base', 'groups': []},
            ({'name': 'eyes', 'groups': [], 'parts': [{'name': 'left_eye'}]} if parts else
             {'name': 'eyes', 'groups': [{'name': 'left_eye', 'groups': []}]})]},
        {'name': 'hair', 'groups': [{'name': 'bangs', 'groups': []}]}]}


def artwork(parts=False):
    root = ET.Element('{%s}svg' % SVG_NS, {'width': '100', 'height': '100', 'viewBox': '0 0 100 100'})
    for identity, group_path, part_path, x, y, w, h, color in [
        ('base', 'face/face_base', None, 30, 20, 40, 65, '#ffcc88'),
        ('eye', 'face/eyes' if parts else 'face/eyes/left_eye', 'face/eyes/left_eye' if parts else None, 40, 40, 10, 8, '#00ff00'),
        ('hair', 'hair/bangs', None, 20, 30, 60, 25, '#0000ff')]:
        group = ET.SubElement(root, '{%s}g' % SVG_NS, {'id': identity, 'data-group-path': group_path})
        if part_path:
            group.set('data-part-path', part_path)
        ET.SubElement(group, '{%s}rect' % SVG_NS,
                      dict(zip(('x', 'y', 'width', 'height', 'fill'), map(str, (x, y, w, h, color)))))
    return root


class HandoffTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='astra-handoff-')
        self.out = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def cli(self, command, *args, expected=0):
        result = subprocess.run([sys.executable, str(SKILL/'2.皮套结构识别/tools/display_order.py'), command, *map(str, args)], capture_output=True, text=True)
        self.assertEqual(result.returncode, expected, result.stdout+result.stderr)

    def render(self, root):
        batch = RenderBatch(self.out, (100, 100))
        image = batch.add(root, (100, 100), (0, 0, 100, 100))
        batch.run()
        with Image.open(image) as source:
            return source.convert('RGBA')

    def test_orchestrator_binds_final_structure_then_applies_order_before_review(self):
        # Follow actual YAML outputs and inputs, preserving the final node ID used by step 4.
        semantic_node = yaml.safe_load((SKILL/'2.皮套结构识别/2.1.语义分组/流程.yaml').read_text())
        display_node = yaml.safe_load((SKILL/'2.皮套结构识别/2.2.显影关系/流程.yaml').read_text())
        draw_node = yaml.safe_load((STEP/'流程.yaml').read_text())
        published = {}
        semantic_path = self.out/semantic_node['outputs']['groups']
        face.save(semantic_path, structure())
        published[f"nodes.{semantic_node['id']}.groups"] = semantic_path
        self.assertEqual(published[display_node['inputs']['semantic_groups']], semantic_path)
        document = display.read_json(semantic_path)
        document['groups'][0]['display_order'] = 10
        document['groups'][0]['groups'][1]['display_order'] = 30
        document['groups'][1]['display_order'] = 20
        final_path = self.out/display_node['outputs']['groups']
        face.save(final_path, document)
        self.cli('validate', '--groups', final_path, '--semantic', semantic_path)
        published[f"nodes.{display_node['id']}.groups"] = final_path
        self.assertEqual(published[draw_node['inputs']['groups']], final_path)
        draft, candidate = self.out/'draft.svg', self.out/draw_node['outputs']['svg']
        ET.ElementTree(artwork()).write(draft)
        self.cli('apply', '--groups', final_path, '--svg', draft, '--out', candidate)
        self.cli('check', '--groups', final_path, '--svg', candidate)
        root = ET.parse(candidate).getroot()
        self.assertEqual(self.render(root).getpixel((45, 44)), (0, 255, 0, 255))
        self.assertEqual([n.get('id') for n in root if n.tag.endswith('}g')], ['base', 'hair', 'eye'])
        self.assertEqual(json.loads(root[0].text), document)
        self.assertEqual(display.read_json(semantic_path), structure())
        # A parameter-only change cannot pass while the actual DOM order stays stale.
        document['groups'][0]['groups'][1]['display_order'] = 5
        face.save(final_path, document)
        self.cli('check', '--groups', final_path, '--svg', candidate, expected=1)
        self.cli('apply', '--groups', final_path, '--svg', candidate, '--out', candidate)
        self.assertEqual(self.render(ET.parse(candidate).getroot()).getpixel((45, 44)), (0, 0, 255, 255))

    def test_semantic_mutation_missing_units_and_nested_svg_do_not_silently_pass(self):
        semantic, document = structure(), structure()
        document['groups'][0]['name'] = 'head'
        face.save(self.out/'semantic.json', semantic)
        face.save(self.out/'groups.json', document)
        self.cli('validate', '--groups', self.out/'groups.json', '--semantic', self.out/'semantic.json', expected=1)
        face.save(self.out/'groups.json', semantic)
        entries = display.resolve(self.out/'groups.json')
        root = artwork();root.remove(root[-1])
        with self.assertRaisesRegex(ValueError, 'missing'):
            display.drawing_groups(root, entries)
        root = artwork();root[0].append(root[1]);root.remove(root[1])
        with self.assertRaisesRegex(ValueError, 'nested'):
            display.drawing_groups(root, entries)

    def test_unmasked_complete_shape_can_be_checked_independently_of_display(self):
        root = artwork(parts=True)
        defs = ET.SubElement(root, '{%s}defs' % SVG_NS)
        clip = ET.SubElement(defs, '{%s}clipPath' % SVG_NS, {'id': 'slice'})
        ET.SubElement(clip, '{%s}rect' % SVG_NS, {'x': '40', 'y': '40', 'width': '5', 'height': '8'})
        root[1].set('clip-path', 'url(#slice)')
        full = face.full_group(root, 'face/eyes/left_eye')
        self.assertEqual(face.component_areas(self.render(full)), [80])
        whole_group = face.full_group(root, 'face/eyes')
        self.assertEqual(face.component_areas(self.render(whole_group)), [80])
        self.assertEqual(root[1].get('clip-path'), 'url(#slice)')

    def test_native_source_trace_accepts_matching_face_rejects_shift_and_stale_reference(self):
        reference, target = self.out/'reference.png', self.out/'target.json'
        image = Image.new('RGB', (100, 100), 'white')
        ImageDraw.Draw(image).rectangle((30, 20, 69, 84), fill='#ffcc88')
        image.save(reference)
        guide = {'group_path': 'face/face_base', 'roi': [20, 10, 60, 80], 'tolerance_px': 2,
                 'rows': [{'y': y, 'left': [26, 34], 'right': [65, 73]} for y in (30, 40, 50, 60, 70)]}
        face.trace(reference, guide, target)
        root = artwork();svg = self.out/'candidate.svg';ET.ElementTree(root).write(svg)
        self.assertEqual(face.check(reference, target, svg, self.out/'matching'), 0)
        root[0][0].set('x', '25');root[0][0].set('width', '45');ET.ElementTree(root).write(svg)
        self.assertEqual(face.check(reference, target, svg, self.out/'wide'), 1)
        report = face.load(self.out/'wide/report.json')
        self.assertIn('edge_max_px', report['failed'])
        self.assertLess(report['rows'][0]['center_shift_px'], -2)
        image.putpixel((0, 0), (0, 0, 0));image.save(reference)
        with self.assertRaisesRegex(ValueError, 'hash'):
            face.check(reference, target, svg, self.out/'stale')

    def test_partial_sampling_does_not_claim_unmeasured_width_and_missing_rows_fail(self):
        target = {'rows': [{'y': y, 'left': 5} for y in (3, 4, 5)], 'guide': {'tolerance_px': 2}}
        alpha = Image.new('L', (20, 20))
        self.assertEqual(face.measure(alpha, target)['status'], 'revise')
        ImageDraw.Draw(alpha).rectangle((5, 3, 15, 5), fill=255)
        measured = face.measure(alpha, target)
        self.assertIsNone(measured['metrics']['width_max_px'])
        self.assertIn('center_max_px', measured['unmeasured'])

    def test_jianma_old_face_and_eye_fragments_require_revision(self):
        reference = REPO/'outputs/jianma2d/references/base-subject.png'
        svg = REPO/'outputs/jianma2d/block-layers/character.svg'
        target = self.out/'target.json'
        before = face.sha(svg)
        face.trace(reference, face.load(STEP/'tests/fixtures/jianma-face-guide.json'), target)
        self.assertEqual(face.check(reference, target, svg, self.out/'review'), 1)
        report = face.load(self.out/'review/report.json')
        self.assertGreaterEqual(report['metrics']['edge_max_px'], 4)
        self.assertEqual(report['eye_components_px']['face/eyes/left_eye'], [256, 10])
        self.assertEqual(report['eye_components_px']['face/eyes/right_eye'], [229, 7])
        self.assertEqual(before, face.sha(svg))


if __name__ == '__main__':
    unittest.main()
