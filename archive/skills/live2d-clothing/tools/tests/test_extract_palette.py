"""Check caller-selected sampling, provenance and unrestricted group rendering."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from PIL import Image


SCRIPT = Path(__file__).resolve().parents[1] / 'extract_palette.py'
SPEC = importlib.util.spec_from_file_location('extract_palette', SCRIPT)
CORE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CORE)


class PaletteTests(unittest.TestCase):
    def test_methods_and_real_pixel_provenance(self):
        image = Image.new('RGBA', (3, 1))
        image.putdata([(0, 0, 0, 255), (100, 10, 20, 255), (255, 255, 255, 255)])
        samples = CORE.extract_samples(image, [
            {'name': 'point', 'method': 'point', 'x': 0, 'y': 0},
            *[{'name': method, 'method': method, 'box': [0, 0, 3, 1]}
              for method in ('nearest', 'mean', 'median')],
            {'name': 'external', 'method': 'provided', 'hex': '#123456',
             'role': 'custom_cluster', 'x': 0, 'y': 0, 'actual_pixel': [0, 0], 'basis': 'caller calculation'},
        ])
        self.assertEqual([s['rgb'] for s in samples],
                         [[0, 0, 0], [100, 10, 20], [118, 88, 92], [100, 10, 20], [18, 52, 86]])
        self.assertEqual([s['actual_pixel'] for s in samples], [[0, 0], [1, 0], None, None, None])
        self.assertEqual([s['color_origin'] for s in samples],
                         ['source_pixel', 'source_pixel', 'source_statistic', 'source_statistic', 'provided'])
        self.assertEqual(samples[-1]['basis'], 'caller calculation')

    def test_arbitrary_roles_are_kept_and_alpha_is_caller_controlled(self):
        image = Image.new('RGBA', (2, 1))
        image.putdata([(100, 80, 60, 20), (200, 180, 160, 255)])
        items = [{'name': 'both', 'role': 'unlisted', 'method': 'mean', 'box': [0, 0, 2, 1]},
                 {'name': 'opaque', 'role': 'another', 'method': 'mean', 'box': [0, 0, 2, 1], 'min_alpha': 255}]
        samples = CORE.extract_samples(image, items)
        self.assertEqual(samples[0]['rgb'], [150, 130, 110])
        self.assertEqual(samples[1]['rgb'], [200, 180, 160])
        self.assertEqual(CORE.palette_groups(samples, {'unused': 'Unused', 'another': 'Chosen label'}),
                         [('another', 'Chosen label'), ('unlisted', 'unlisted')])

    def test_adapters_can_override_presentation_and_render_external_colors(self):
        root = SCRIPT.parent
        with tempfile.TemporaryDirectory(prefix='astra-palette-test-') as folder:
            folder = Path(folder)
            image = folder/'reference.png'
            Image.new('RGB', (8, 8), (10, 20, 30)).save(image)
            source = image.read_bytes()
            definition = folder/'samples.json'
            definition.write_text(json.dumps({'title': 'Caller title', 'groups': {'bespoke': 'Caller group'},
                'samples': [{'name': '自选色', 'role': 'bespoke', 'hex': '#ABCDEF', 'usage': 'caller method', 'box': [0, 0, 8, 8]}]},
                ensure_ascii=False), encoding='utf-8')
            scripts = [SCRIPT] + sorted(root.parent.rglob('tools/palette.py'))
            for index, script in enumerate(scripts):
                output = folder/('%d.png' % index)
                result = subprocess.run([sys.executable, '-B', str(script), str(image), str(definition), str(output)],
                                        capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                data = json.loads(output.with_suffix('.json').read_text(encoding='utf-8'))
                self.assertEqual(data['presentation']['title'], 'Caller title')
                self.assertEqual(data['samples'][0]['role'], 'bespoke')
                self.assertEqual(data['samples'][0]['hex'], '#ABCDEF')
                self.assertIsNone(data['samples'][0]['actual_pixel'])
                with Image.open(output) as board:
                    self.assertEqual(board.getpixel((600, 220)), (171, 205, 239))
            self.assertEqual(image.read_bytes(), source)

    def test_legacy_inputs_and_invalid_samples(self):
        image = Image.new('RGBA', (5, 5), (1, 2, 3, 255))
        sample = {'name': 'legacy', 'part_id': 'existing', 'x': 2, 'y': 2, 'radius': 1, 'role': 'any'}
        actual = CORE.extract_samples(image, [sample])[0]
        self.assertEqual((actual['rgb'], actual['actual_pixel']), ([1, 2, 3], [2, 2]))
        for item in [dict(sample, box=[-1, 0, 2, 2]), dict(sample, min_alpha=256),
                     {'name': 'bad', 'method': 'provided', 'rgb': [256, 0, 0]},
                     {'name': 'bad', 'method': 'provided', 'rgb': [1, 2, 3], 'hex': '#FFFFFF'}]:
            with self.subTest(item=item), self.assertRaises(ValueError):
                CORE.extract_samples(image, [item])


if __name__ == '__main__':
    unittest.main()
