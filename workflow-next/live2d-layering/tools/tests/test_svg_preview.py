"""Exercise rendered pixels, input preservation and cached Python rendering."""
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

from PIL import Image


SCRIPT = Path(__file__).resolve().parents[1] / 'svg_preview.py'
SPEC = importlib.util.spec_from_file_location('svg_preview', SCRIPT)
PREVIEW = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PREVIEW)
ART = '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60">
<defs>
  <linearGradient id="paint"><stop stop-color="red"/><stop offset="1" stop-color="yellow"/></linearGradient>
  <clipPath id="clip"><rect width="20" height="20"/></clipPath>
  <mask id="mask" maskUnits="userSpaceOnUse" x="0" y="0" width="40" height="30">
    <rect width="40" height="15" fill="white"/>
  </mask>
</defs>
<rect id="base" width="100%" height="100%" fill="#eeeeee"/>
<g transform="translate(10 10)"><g id="hair" clip-path="url(#clip)" mask="url(#mask)">
  <rect width="40" height="30" fill="url(#paint)"/>
</g></g>
<g id="ribbon"><rect x="40" y="10" width="20" height="20" fill="blue"/></g>
<g style="display:none"><g id="hidden"><rect x="30" y="40" width="10" height="10" fill="yellow"/></g></g>
</svg>'''


class PreviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='astra-preview-test-')
        self.folder = Path(self.temp.name)
        self.svg = self.folder / '角色.svg'
        self.svg.write_text(ART, encoding='utf-8')

    def tearDown(self):
        self.temp.cleanup()

    def render(self, name='result.png', *options):
        output = self.folder / name
        before = self.svg.read_bytes()
        PREVIEW.preview(PREVIEW.parser().parse_args([str(self.svg), str(output), *map(str, options)]))
        self.assertEqual(before, self.svg.read_bytes())
        with Image.open(output) as im:
            return im.copy()

    def cell_pixel(self, image, index, x, y, size=(80, 60), columns=3):
        return image.getpixel(((index % columns)*size[0]+x,
                               (index//columns)*(size[1]+PREVIEW.LABEL_HEIGHT)+PREVIEW.LABEL_HEIGHT+y))

    def test_dependency_check_renders_without_creating_files(self):
        before = set(self.folder.iterdir())
        result = subprocess.run([sys.executable, str(SCRIPT), '--check-deps'],
                                cwd=self.folder, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        status = json.loads(result.stdout)
        self.assertEqual(status['svg_render'], 'ok')
        self.assertEqual(status['libvips'], '8.18.6')
        self.assertEqual(status['pyvips'], '3.2.0')
        self.assertEqual(set(self.folder.iterdir()), before)

    def test_missing_pillow_reports_the_dependency_manifest(self):
        result = subprocess.run([sys.executable, '-S', str(SCRIPT), '--check-deps'],
                                capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('requires Pillow', result.stderr)
        self.assertIn('requirements.txt', result.stderr)
        self.assertNotIn('Traceback', result.stderr)

    def test_missing_renderer_reports_dependency_manifest(self):
        loader = '''import builtins, runpy, sys
original = builtins.__import__
def missing(name, *args, **kwargs):
    if name == 'pyvips':
        raise ImportError('Fixture: pyvips is unavailable')
    return original(name, *args, **kwargs)
builtins.__import__ = missing
sys.argv = [sys.argv[1], '--check-deps']
runpy.run_path(sys.argv[0], run_name='__main__')
'''
        result = subprocess.run([sys.executable, '-c', loader, str(SCRIPT)],
                                capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('requires pyvips[binary]', result.stderr)
        self.assertIn('requirements.txt', result.stderr)
        self.assertNotIn('Traceback', result.stderr)

    def test_isolation_preserves_transforms_clips_masks_and_gradients(self):
        image = self.render('only.png', '--only', 'hair', '--only', 'ribbon')
        self.assertEqual(image.mode, 'RGBA')
        self.assertEqual(image.getpixel((5, 5))[3], 0)
        self.assertEqual(image.getpixel((15, 15))[3], 255)
        self.assertEqual(image.getpixel((15, 27))[3], 0)  # Mask cuts here.
        self.assertEqual(image.getpixel((35, 15))[3], 0)  # Clip cuts here.
        self.assertNotEqual(image.getpixel((11, 15)), image.getpixel((28, 15)))
        self.assertEqual(image.getpixel((45, 15)), (0, 0, 255, 255))

    def test_one_batch_for_parts_toggle_and_hidden_control(self):
        with mock.patch.object(PREVIEW, 'render_svg', wraps=PREVIEW.render_svg) as run:
            image = self.render('board.png', '--part', 'ribbon', '--part', 'hidden', '--toggle', 'hair')
        self.assertEqual(run.call_count, 4)
        self.assertEqual(self.cell_pixel(image, 1, 45, 15), (0, 0, 255))
        self.assertEqual(self.cell_pixel(image, 2, 35, 45), (255, 255, 0))
        self.assertEqual(self.cell_pixel(image, 3, 15, 15), (238, 238, 238))
        hidden = self.render('hidden.png', '--hide', 'hair')
        self.assertEqual(hidden.getpixel((15, 15)), (238, 238, 238, 255))

    def test_crop_matches_direct_renderer_with_letterbox_and_percent_geometry(self):
        self.svg.write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"
          viewBox="10 20 100 100"><rect x="10" y="20" width="50%" height="100%" fill="red"/>
          <circle cx="70" cy="80" r="10" fill="blue"/></svg>''', encoding='utf-8')
        full = self.folder / 'direct.png'
        full.write_bytes(PREVIEW.render_svg(self.svg.read_bytes()))
        actual = self.render('cropped.png', '--crop', 40, 10, 100, 80)
        with Image.open(full) as im:
            expected = im.convert('RGBA').crop((40, 10, 140, 90))
        self.assertEqual(actual.size, expected.size)
        self.assertEqual(actual.tobytes(), expected.tobytes())

    def test_reference_previous_blends_and_differences(self):
        solid = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="%s"/></svg>'
        self.svg.write_text(solid % 'red', encoding='utf-8')
        previous = self.folder / '旧版.svg'
        previous.write_text(solid % 'blue', encoding='utf-8')
        reference = self.folder / 'reference.png'
        Image.new('RGB', (40, 40), '#00ff00').save(reference)
        saved = (previous.read_bytes(), reference.read_bytes())
        image = self.render('compare.png', '--reference', reference, '--reference-crop', 0, 0, 40, 40,
                            '--compare', previous, '--blend', .25, '--diff')
        colors = [(0, 255, 0), (255, 0, 0), (63, 191, 0), (255, 255, 0),
                  (0, 0, 255), (63, 0, 191), (255, 0, 255)]
        for i, color in enumerate(colors):
            self.assertEqual(self.cell_pixel(image, i, 10, 10, size=(20, 20)), color)
        self.assertEqual(saved, (previous.read_bytes(), reference.read_bytes()))
        # Legacy --reference defaults to the original three-cell layout.
        legacy = self.render('legacy.png', '--reference', previous)
        self.assertEqual(legacy.size, (60, 20+PREVIEW.LABEL_HEIGHT))

    def test_edge_overlay_uses_isolated_alpha_shape_even_when_fill_matches_reference(self):
        self.svg.write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
          <g id="group"><rect x="5" y="5" width="10" height="10" fill="white"/></g>
          <g id="other"><rect x="16" y="5" width="2" height="10" fill="blue"/></g>
        </svg>''', encoding='utf-8')
        reference = self.folder / 'reference.png'
        Image.new('RGB', (20, 20), 'white').save(reference)
        image = self.render('edges.png', '--reference', reference, '--only', 'group', '--edge-overlay')
        self.assertEqual(self.cell_pixel(image, 3, 0, 0, size=(20, 20)), (255, 255, 255))
        self.assertEqual(self.cell_pixel(image, 3, 10, 10, size=(20, 20)), (255, 255, 255))
        edge = self.cell_pixel(image, 3, 5, 10, size=(20, 20))
        self.assertGreater(edge[0], edge[1])
        self.assertGreater(edge[2], edge[1])
        self.assertEqual(self.cell_pixel(image, 3, 16, 10, size=(20, 20)), (255, 255, 255))

    def test_edge_overlay_follows_rendered_mask_and_not_gradient_color(self):
        reference = self.folder / 'reference.png'
        Image.new('RGB', (80, 60), 'white').save(reference)
        image = self.render('mask-edges.png', '--reference', reference,
                            '--only', 'hair', '--edge-overlay')
        # The selected gradient is clipped to x=10..29 and masked to y=10..24.
        self.assertEqual(self.cell_pixel(image, 3, 20, 17), (255, 255, 255))
        self.assertEqual(self.cell_pixel(image, 3, 40, 17), (255, 255, 255))
        for x, y in ((10, 17), (29, 17), (20, 24)):
            edge = self.cell_pixel(image, 3, x, y)
            self.assertGreater(edge[0], edge[1], (x, y))

    def test_checker_background_and_validation_before_render(self):
        image = self.render('checker.png', '--only', 'ribbon', '--background', 'checker')
        self.assertEqual(image.getpixel((1, 1)), (238, 238, 238))
        self.assertEqual(image.getpixel((17, 1)), (204, 204, 204))
        source_bytes = self.svg.read_bytes()
        for flags in [('--part', 'missing'), ('--hide', 'clip'), ('--crop', 0, 0, 81, 60),
                      ('--blend', 'nan'), ('--diff',), ('--edge-overlay',),
                      ('--reference-crop', 0, 0, 10, 10)]:
            with self.subTest(flags=flags), mock.patch.object(PREVIEW, 'render_svg') as run:
                with self.assertRaises(ValueError):
                    self.render('invalid.png', *flags)
                run.assert_not_called()
                self.assertFalse((self.folder / 'invalid.png').exists())
        reference = self.folder / 'reference.png'
        Image.new('RGB', (2, 2)).save(reference)
        for output in [reference, self.svg]:
            with self.assertRaises(ValueError):
                PREVIEW.preview(PREVIEW.parser().parse_args([
                    str(self.svg), str(output), '--reference', str(reference)]))
        with self.assertRaises(ValueError):
            self.render('mismatch.png', '--reference', reference)
        self.assertEqual(source_bytes, self.svg.read_bytes())

    def test_invalid_clip_and_missing_resources_stop_before_render(self):
        fixtures = [
            ('<defs><g id="surface"><rect width="30" height="30"/></g>'
             '<clipPath id="bad_clip"><use href="#surface"/></clipPath></defs>'
             '<rect width="30" height="30" clip-path="url(#bad_clip)"/>', 'bad_clip'),
            ('<defs><clipPath id="nested"><g><rect width="30" height="30"/></g>'
             '</clipPath></defs>', 'nested'),
            ('<defs><path id="surface" d="M0 0H30V30H0Z"/>'
             '<use id="alias" href="#surface"/><clipPath id="indirect">'
             '<use href="#alias"/></clipPath></defs>', 'indirect'),
            ('<rect fill="url(#gone)"/>', 'gone'),
            ('<use href="#missing"/>', 'missing'),
            ('<path id="twice"/><path id="twice"/>', 'twice'),
        ]
        for content, diagnostic in fixtures:
            with self.subTest(diagnostic=diagnostic):
                self.svg.write_text('<svg xmlns="http://www.w3.org/2000/svg" '
                                    'width="80" height="60">'+content+'</svg>', encoding='utf-8')
                original = self.svg.read_bytes()
                with mock.patch.object(PREVIEW, 'render_svg') as run:
                    with self.assertRaisesRegex(ValueError, diagnostic):
                        self.render('invalid.png')
                    run.assert_not_called()
                self.assertFalse((self.folder/'invalid.png').exists())
                self.assertEqual(self.svg.read_bytes(), original)

    def test_transformed_compound_clip_intersection_and_valid_mask_group(self):
        self.svg.write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60">
          <defs>
            <path id="ring" d="M0 0H30V30H0Z M10 10H20V20H10Z" clip-rule="evenodd"/>
            <rect id="second" width="10" height="30"/>
            <g id="mask_shapes"><rect width="80" height="60" fill="white"/></g>
            <mask id="valid_mask"><use href="#mask_shapes"/></mask>
            <clipPath id="receiver" clipPathUnits="userSpaceOnUse">
              <use href="#ring" transform="translate(5 5)" clip-rule="evenodd"/>
              <use href="#second" transform="translate(45 5)" clip-rule="evenodd"/>
            </clipPath>
            <clipPath id="aperture"><rect width="80" height="25"/></clipPath>
          </defs>
          <g clip-path="url(#receiver)"><g clip-path="url(#aperture)">
            <rect id="effect" width="80" height="60" fill="red" mask="url(#valid_mask)"/>
          </g></g></svg>''', encoding='utf-8')
        image = self.render()
        for point in [(8, 8), (48, 10)]:
            self.assertEqual(image.getpixel(point), (255, 0, 0, 255))
        for point in [(1, 1), (18, 18), (38, 10), (48, 28), (60, 10)]:
            self.assertEqual(image.getpixel(point)[3], 0, point)

    def test_unchanged_toggle_warns_without_extra_render(self):
        with mock.patch.object(PREVIEW, 'render_svg', wraps=PREVIEW.render_svg) as run:
            with mock.patch.object(PREVIEW.sys, 'stderr', new_callable=io.StringIO) as stderr:
                self.render('hidden-toggle.png', '--toggle', 'hidden')
        self.assertEqual(run.call_count, 2)
        self.assertIn('--toggle hidden has no visible change', stderr.getvalue())

    def test_duplicate_cells_share_one_render(self):
        with mock.patch.object(PREVIEW, 'render_svg', wraps=PREVIEW.render_svg) as run:
            image = self.render('reused.png', '--only', 'ribbon', '--part', 'ribbon', '--part', 'ribbon')
        self.assertEqual(run.call_count, 1)
        for i in range(3):
            self.assertEqual(self.cell_pixel(image, i, 45, 15), (0, 0, 255))


if __name__ == '__main__':
    unittest.main()
