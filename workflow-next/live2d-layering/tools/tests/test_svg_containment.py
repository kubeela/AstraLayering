"""Verify containment failures on actual rendered shapes, including holes."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from PIL import Image

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
import svg_containment as BOUNDS


def svg(content, width=80, height=60):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%s" height="%s">'
            '%s</svg>' % (width, height, content))


PARENT = '<g id="body" data-group-path="body"><rect x="10" y="10" width="40" height="40"/></g>'
CHILD = '<g id="child" data-part-path="body/torso"><rect x="15" y="15" width="20" height="20"/></g>'


class ContainmentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="astra-bounds-test-")
        self.folder = Path(self.temp.name)
        self.parent = self.folder / "parent.svg"
        self.candidate = self.folder / "candidate.svg"
        self.groups = self.folder / "groups.json"
        self.out = self.folder / "check.json"
        self.parent.write_text(svg(PARENT), encoding="utf-8")
        self.candidate.write_text(svg(PARENT + CHILD), encoding="utf-8")
        self.tree([{"name": "torso"}])

    def tearDown(self):
        self.temp.cleanup()

    def tree(self, parts, groups=None):
        document = {"subject": "character", "groups": [
            {"name": "body", "groups": groups or [], "parts": parts}]}
        self.groups.write_text(json.dumps(document), encoding="utf-8")

    def check(self, **kwargs):
        paths = [self.parent, self.candidate, self.groups]
        originals = [path.read_bytes() for path in paths]
        result = BOUNDS.check(self.parent, self.candidate, self.groups, "body", self.out, **kwargs)
        self.assertEqual(originals, [path.read_bytes() for path in paths])
        self.assertEqual(json.loads(self.out.read_text()), result)
        return result

    def test_all_direct_groups_and_parts_checked_and_nested_parts_not_dispatched(self):
        self.tree([{"name": "torso"}], [{"name": "necklace", "groups": [],
                                         "parts": [{"name": "pendant"}]}])
        self.candidate.write_text(svg(PARENT + CHILD +
            '<g id="necklace" data-group-path="body/necklace">'
            '<circle cx="20" cy="20" r="5"/></g>'), encoding="utf-8")
        result = self.check()
        self.assertEqual(result["status"], "pass")
        self.assertEqual([item["path"] for item in result["results"]],
                         ["body/necklace", "body/torso"])

    def test_exact_shared_boundary_and_sibling_overlap_pass(self):
        self.tree([{"name": "torso"}, {"name": "chest"}])
        self.parent.write_text(svg('<g id="body" data-group-path="body">'
                                   '<circle cx="30" cy="30" r="18"/></g>'))
        self.candidate.write_text(svg(
            '<g id="torso" data-part-path="body/torso"><circle cx="30" cy="30" r="18"/></g>'
            '<g id="chest" data-part-path="body/chest"><circle cx="30" cy="30" r="10"/></g>'))
        self.assertEqual(self.check()["status"], "pass")

    def test_quarter_pixel_overflow_fails_and_creates_red_local_diagnostic(self):
        self.candidate.write_text(svg(
            '<g id="child" data-part-path="body/torso">'
            '<rect x="49" y="20" width="1.25" height="10"/></g>'))
        result = self.check()
        item = result["results"][0]
        self.assertEqual(result["status"], "fail")
        self.assertGreater(item["outside_samples"], 0)
        self.assertEqual(item["outside_bbox"], [50.0, 20.0, .25, 10.0])
        self.assertEqual(item["outside_area_px2"], 2.5)
        with Image.open(item["diagnostic"]) as image:
            self.assertIn((235, 35, 55), image.getdata())

    def test_hole_and_gap_between_disconnected_parent_shapes_fail(self):
        fixtures = [
            ('<path fill-rule="evenodd" d="M10 10H50V50H10Z M20 20H40V40H20Z"/>',
             '<rect x="25" y="25" width="5" height="5"/>'),
            ('<rect x="10" y="10" width="10" height="40"/>'
             '<rect x="40" y="10" width="10" height="40"/>',
             '<rect x="25" y="20" width="5" height="5"/>')]
        for parent, child in fixtures:
            with self.subTest(parent=parent):
                self.parent.write_text(svg('<g id="body" data-group-path="body">'+parent+'</g>'))
                self.candidate.write_text(svg('<g id="child" data-part-path="body/torso">'+child+'</g>'))
                self.assertEqual(self.check()["status"], "fail")

    def test_other_paint_cannot_hide_overflow_and_candidate_cannot_expand_input_boundary(self):
        self.candidate.write_text(svg(
            '<g id="body" data-group-path="body"><rect width="80" height="60"/></g>'
            '<g id="child" data-part-path="body/torso"><rect x="45" y="20" width="10" height="10"/></g>'
            '<g id="cover" data-group-path="other"><rect width="80" height="60" fill="white"/></g>'))
        result = self.check()
        self.assertEqual(result["status"], "fail")
        self.assertEqual(result["results"][0]["outside_bbox"], [50., 20., 5., 10.])

    def test_parent_binding_excludes_nested_child_guides(self):
        self.parent.write_text(svg(PARENT[:-4] +
            '<g id="old" data-part-path="body/old"><rect width="80" height="60"/></g></g>'))
        self.candidate.write_text(svg(
            '<g id="child" data-part-path="body/torso"><rect x="60" y="20" width="5" height="5"/></g>'))
        self.assertEqual(self.check()["status"], "fail")

    def test_transforms_clips_and_masks_define_visible_shape(self):
        self.parent.write_text(svg('<defs><clipPath id="clip"><rect width="20" height="20"/></clipPath>'
            '<mask id="mask"><rect width="80" height="60" fill="white"/>'
            '<rect x="5" y="5" width="5" height="5" fill="black"/></mask></defs>'
            '<g transform="translate(10 10)"><g id="body" data-group-path="body" '
            'clip-path="url(#clip)" mask="url(#mask)"><rect width="40" height="40"/></g></g>'))
        for x, y, expected in [(12, 12, "pass"), (16, 16, "fail"), (31, 12, "fail")]:
            with self.subTest(x=x, y=y):
                self.candidate.write_text(svg('<g id="child" data-part-path="body/torso">'
                                             '<rect x="%d" y="%d" width="2" height="2"/></g>' % (x, y)))
                self.assertEqual(self.check()["status"], expected)
        # A child's clip is respected too, while other nested bindings are excluded.
        self.candidate.write_text(svg('<defs><clipPath id="small"><rect x="12" y="12" width="2" height="2"/></clipPath></defs>'
            '<g id="child" data-part-path="body/torso"><rect width="80" height="60" clip-path="url(#small)"/>'
            '<g id="other" data-group-path="other"><rect width="80" height="60"/></g></g>'))
        self.assertEqual(self.check()["status"], "pass")

    def test_multiple_containers_and_nested_same_path_form_one_shape(self):
        self.candidate.write_text(svg(
            '<g id="first" data-part-path="body/torso"><g id="inside" data-part-path="body/torso">'
            '<rect x="12" y="12" width="5" height="5"/></g></g>'
            '<g id="second" data-part-path="body/torso"><rect x="40" y="40" width="5" height="5"/></g>'))
        result = self.check()
        self.assertEqual(result["status"], "pass")
        self.assertEqual(result["results"][0]["ids"], ["first", "inside", "second"])

    def test_missing_wrong_type_and_empty_bindings_fail(self):
        for content in ["", '<g id="child" data-group-path="body/torso"><rect width="40" height="40"/></g>',
                        '<g id="child" data-part-path="body/torso"/>',
                        '<g id="child" data-part-path="body/torso" opacity="0"><rect width="40" height="40"/></g>']:
            with self.subTest(content=content):
                self.candidate.write_text(svg(content))
                result = self.check()
                self.assertEqual(result["status"], "fail")
                self.assertIn("reason", result["results"][0])

    def test_invalid_inputs_and_output_collision_stop(self):
        for output in [self.groups, self.parent, self.candidate]:
            with self.subTest(output=output):
                before = output.read_bytes()
                with self.assertRaisesRegex(ValueError, "overwrite"):
                    BOUNDS.check(self.parent, self.candidate, self.groups, "body", output)
                self.assertEqual(output.read_bytes(), before)
        self.candidate.write_text(svg(CHILD, width=81))
        with self.assertRaisesRegex(ValueError, "viewport"):
            self.check()
        self.candidate.write_text(svg(CHILD))
        self.tree([])
        with self.assertRaises(ValueError):
            self.check()

    def test_cli_pass_fail_and_error_exit_codes(self):
        command = [sys.executable, str(TOOLS / "svg_containment.py"),
                   "--parent-svg", str(self.parent), "--candidate", str(self.candidate),
                   "--groups", str(self.groups), "--group-path", "body", "--out", str(self.out)]
        run = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(json.loads(run.stdout)["status"], "pass")
        self.candidate.write_text(svg('<g id="child" data-part-path="body/torso">'
                                     '<rect width="80" height="60"/></g>'))
        run = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(run.returncode, 1, run.stderr)
        self.assertEqual(json.loads(run.stdout)["failed"], ["body/torso"])
        run = subprocess.run(command + ["--scale", "0"], capture_output=True, text=True)
        self.assertEqual(run.returncode, 2)
        self.assertNotIn("Traceback", run.stderr)

    def test_missing_dependencies_report_existing_manifest(self):
        run = subprocess.run([sys.executable, "-S", str(TOOLS / "svg_containment.py"), "--help"],
                             capture_output=True, text=True)
        self.assertEqual(run.returncode, 2)
        self.assertIn("requirements.txt", run.stderr)
        self.assertNotIn("Traceback", run.stderr)


if __name__ == "__main__":
    unittest.main()
