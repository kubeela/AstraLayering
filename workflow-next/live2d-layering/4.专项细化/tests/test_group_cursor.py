"""Behavioral checks for group-only dispatch over a configurable tree."""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


TOOL = Path(__file__).resolve().parents[1] / "tools" / "group_cursor.py"


class GroupCursorTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.tree = self.root / "groups.json"
        self.state = self.root / "groups.dispatch.json"
        self.tree.write_text(json.dumps({"groups": [
            {"name": "head", "groups": [
                {"name": "face", "groups": [
                    {"name": "eyes", "groups": [
                        {"name": "left_eye", "groups": []},
                        {"name": "right_eye", "groups": []},
                    ]},
                ]},
            ]},
            {"name": "body", "groups": [], "parts": [{"name": "torso"}]},
        ]}), encoding="utf-8")

    def command(self, *args, succeeds=True):
        result = subprocess.run(
            [sys.executable, str(TOOL), "--file", str(self.tree),
             "--state", str(self.state), *args],
            capture_output=True, text=True, check=False,
        )
        if succeeds:
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads(result.stdout)
        self.assertNotEqual(result.returncode, 0)
        return result.stderr

    def init(self):
        return self.command(
            "init", "--root-key", "groups", "--child-edge", "groups:group",
            "--child-edge", "parts:part", "--terminal-type", "part",
            "--dispatch-type", "group", "--route-name", "group:eyes",
        )

    def patch(self, value):
        path = self.root / "patch.json"
        path.write_text(json.dumps(value), encoding="utf-8")
        return path

    def test_breadth_first_growth_and_group_only_state(self):
        self.assertEqual(self.init()["groups"], 6)
        self.assertEqual(self.init()["action"], "already_initialized")
        head = self.command("next")
        self.assertEqual(head["target"]["path"], "head")
        self.assertEqual(head["route"], "generic")
        self.command("checkpoint", "--pointer", "group_completion")
        new = self.command("expand", "--parent", head["target"]["id"],
                           "--patch", str(self.patch({
                               "groups": [{"name": "headdress", "groups": [], "parts": []}],
                               "parts": [{"name": "head_base"}],
                           })))
        self.assertEqual(new["added"], 2)
        self.assertNotIn("id", next(node for node in new["nodes"]
                                    if node["kind"] == "part"))
        resumed = self.command("next")
        self.assertEqual(resumed["action"], "active")
        self.assertEqual(resumed["target"], head["target"])
        self.assertEqual(resumed["pointer"], "group_completion")
        self.command("complete")
        self.assertEqual(self.command("next")["target"]["path"], "body")
        self.command("complete")
        face = self.command("next")
        self.assertEqual(face["target"]["path"], "head/face")
        self.command("complete")
        self.assertEqual(self.command("next")["target"]["path"], "head/headdress")
        progress = json.loads(self.state.read_text(encoding="utf-8"))
        self.assertNotIn("body/torso", progress["nodes"])
        self.assertNotIn("head/head_base", progress["nodes"])
        self.assertEqual(progress["nodes"]["head/face/eyes"]["status"], "pending")

    def test_breadth_first_preserves_document_order(self):
        tree = json.loads(self.tree.read_text(encoding="utf-8"))
        tree["groups"].append({"name": "lower_body", "groups": [],
                                "parts": [{"name": "leg"}]})
        self.tree.write_text(json.dumps(tree), encoding="utf-8")
        self.init()
        self.assertEqual(self.command("next")["target"]["path"], "head")
        self.command("complete")
        self.assertEqual(self.command("next")["target"]["path"], "body")
        self.command("complete")
        self.assertEqual(self.command("next")["target"]["path"], "lower_body")
        self.command("complete")
        self.assertEqual(self.command("next")["target"]["path"], "head/face")

    def test_parent_completion_does_not_complete_descendants(self):
        self.init()
        self.assertEqual(self.command("next")["target"]["path"], "head")
        self.command("complete")
        self.assertEqual(self.command("next")["target"]["path"], "body")
        self.command("complete")
        self.assertEqual(self.command("next")["target"]["path"], "head/face")
        self.command("complete")
        eyes = self.command("next")
        self.assertEqual(eyes["target"]["path"], "head/face/eyes")
        self.assertEqual(eyes["route"], "group:eyes")
        self.command("complete")
        left = self.command("next")
        self.assertEqual(left["target"]["path"], "head/face/eyes/left_eye")
        self.assertIn("group must contain", self.command("complete", succeeds=False))
        self.command("expand", "--parent", left["target"]["id"],
                     "--patch", str(self.patch({"parts": [{"name": "eye_base"}]})))
        self.command("complete")
        right = self.command("next")
        self.assertEqual(right["target"]["path"], "head/face/eyes/right_eye")
        self.command("expand", "--parent", right["target"]["id"],
                     "--patch", str(self.patch({"parts": [{"name": "eye_base"}]})))
        self.command("complete")
        self.assertEqual(self.command("next")["action"], "done")

    def test_completed_direct_structure_is_immutable(self):
        self.init()
        self.command("next")
        self.command("complete")
        self.assertEqual(self.command("next")["target"]["path"], "body")
        self.command("complete")
        changed = json.loads(self.tree.read_text(encoding="utf-8"))
        changed["groups"][1]["parts"].append({"name": "extra"})
        self.tree.write_text(json.dumps(changed), encoding="utf-8")
        self.assertIn("completed node changed direct children",
                      self.command("next", succeeds=False))

    def test_explicit_reopen_allows_later_repair(self):
        self.init()
        self.command("next")
        self.command("complete")
        body = self.command("next")
        self.command("complete")
        self.assertEqual(self.command("reopen", "--target", body["target"]["id"])
                         ["action"], "reopened")
        selected = self.command("next")
        self.assertEqual(selected["target"]["path"], "body")
        self.command("expand", "--parent", selected["target"]["id"],
                     "--patch", str(self.patch({"parts": [{"name": "neck"}]})))
        self.command("complete")
        self.assertEqual(json.loads(self.state.read_text())["nodes"]["body"]["status"], "done")

    def test_invalid_expansion_preserves_files(self):
        self.init()
        self.command("next")
        self.command("complete")
        body = self.command("next")
        before = self.tree.read_bytes()
        state_before = self.state.read_bytes()
        self.command("expand", "--parent", body["target"]["id"],
                     "--patch", str(self.patch({"parts": [{"name": "torso"}]})),
                     succeeds=False)
        self.assertEqual(self.tree.read_bytes(), before)
        self.assertEqual(self.state.read_bytes(), state_before)

    def test_arbitrary_tree_keys_are_supported(self):
        self.tree.write_text(json.dumps({"nodes": [
            {"name": "root", "branches": [
                {"name": "branch", "atoms": [{"name": "detail"}]},
            ]},
        ]}), encoding="utf-8")
        self.command("init", "--root-key", "nodes",
                     "--child-edge", "nodes:branch",
                     "--child-edge", "branches:branch",
                     "--child-edge", "atoms:atom",
                     "--terminal-type", "atom", "--dispatch-type", "branch")
        self.assertEqual(self.command("next")["target"]["path"], "root")
        self.command("complete")
        self.assertEqual(self.command("next")["target"]["path"], "root/branch")
        self.command("complete")
        self.assertEqual(self.command("next")["action"], "done")
        self.assertNotIn("root/branch/detail",
                         json.loads(self.state.read_text())["nodes"])

    def test_mirror_records_are_appended_in_the_round_the_members_exist(self):
        self.tree.write_text(json.dumps({"subject": "character", "groups": [
            {"name": "head", "groups": []}]}), encoding="utf-8")
        self.init()
        head = self.command("next")["target"]
        eyes = {"name": "paired_eyes",
                "members": ["head/right_eye", "head/left_eye"]}
        self.command("expand", "--parent", head["id"], "--patch", str(self.patch({
            "groups": [{"name": "right_eye", "groups": []},
                       {"name": "left_eye", "groups": []}], "parts": [], "mirror_pairs": [eyes]})))
        self.command("complete")
        right = self.command("next")["target"]
        self.assertEqual(right["path"], "head/right_eye")
        self.command("expand", "--parent", right["id"], "--patch", str(self.patch({
            "groups": [{"name": "eyeball", "groups": []}], "parts": []})))
        self.assertEqual(json.loads(self.tree.read_text())["mirror_pairs"], [eyes])
        self.command("complete")
        left = self.command("next")["target"]
        eyeballs = {"name": "paired_eyeballs",
                    "members": ["head/right_eye/eyeball", "head/left_eye/eyeball"]}
        self.command("expand", "--parent", left["id"], "--patch", str(self.patch({
            "groups": [{"name": "eyeball", "groups": []}], "parts": [], "mirror_pairs": [eyeballs]})))
        self.assertEqual(json.loads(self.tree.read_text())["mirror_pairs"], [eyes, eyeballs])
        progress = json.loads(self.state.read_text())
        self.assertNotIn("paired_eyes", progress["nodes"])
        self.assertEqual(progress["nodes"]["head/right_eye/eyeball"]["status"], "pending")
        self.assertEqual(progress["nodes"]["head/left_eye"]["status"], "active")

    def test_invalid_mirror_pair_rolls_back_children_and_progress(self):
        self.tree.write_text(json.dumps({"subject": "character", "groups": [
            {"name": "head", "groups": []}]}), encoding="utf-8")
        self.init()
        head = self.command("next")["target"]
        before = self.tree.read_bytes(), self.state.read_bytes()
        self.command("expand", "--parent", head["id"], "--patch", str(self.patch({
            "groups": [{"name": "right_eye", "groups": []}], "parts": [], "mirror_pairs": [
                {"name": "paired_eyes",
                 "members": ["head/right_eye", "head/left_eye"]}]})), succeeds=False)
        self.assertEqual((self.tree.read_bytes(), self.state.read_bytes()), before)

    def test_mirror_metadata_does_not_override_document_order(self):
        self.tree.write_text(json.dumps({"groups": [{"name": "head", "groups": [
            {"name": "left_eye", "groups": [], "parts": [{"name": "eye"}]},
            {"name": "right_eye", "groups": [], "parts": [{"name": "eye"}]},
        ]}], "mirror_pairs": [{"name": "paired_eyes", "members": [
            "head/right_eye", "head/left_eye",
        ]}]}), encoding="utf-8")
        self.init()
        self.assertEqual(self.command("next")["target"]["path"], "head")
        self.command("complete")
        self.assertEqual(self.command("next")["target"]["path"], "head/left_eye")
        self.command("complete")
        self.assertEqual(self.command("next")["target"]["path"], "head/right_eye")
        self.command("complete")
        self.assertEqual(self.command("next")["action"], "done")

    def test_resume_and_reopen_keep_shared_artifacts_and_other_progress(self):
        artifacts = {
            "block-layers/groups.svg": b"current group contours",
            "refinement/character.svg": b"current character artwork",
            "structure/rendering.json": b'{"layers": []}',
        }
        for relative, content in artifacts.items():
            path = self.root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
        files_before = {path.relative_to(self.root) for path in self.root.rglob("*") if path.is_file()}
        self.init()
        self.command("next")
        self.command("complete")
        body = self.command("next")["target"]
        self.command("checkpoint", "--pointer", "part_volume")
        resumed = self.command("next")
        self.assertEqual(resumed["action"], "active")
        self.assertEqual(resumed["target"], body)
        self.assertEqual(resumed["pointer"], "part_volume")
        self.command("complete")
        self.command("reopen", "--target", body["id"])
        self.assertEqual(self.command("next")["target"], body)
        progress = json.loads(self.state.read_text())
        self.assertEqual(progress["nodes"]["head"]["status"], "done")
        self.assertEqual(progress["nodes"]["body"]["status"], "active")
        for relative, content in artifacts.items():
            self.assertEqual((self.root / relative).read_bytes(), content)
        files_after = {path.relative_to(self.root) for path in self.root.rglob("*") if path.is_file()}
        self.assertEqual(files_after - files_before, {Path("groups.dispatch.json")})

    def test_parallel_state_is_rejected_without_changing_saved_files(self):
        self.init()
        for version in (5, 6):
            with self.subTest(version=version):
                state = json.loads(self.state.read_text())
                state["version"] = version
                state["active"] = {"sequences": []}
                self.state.write_text(json.dumps(state))
                before = self.tree.read_bytes(), self.state.read_bytes()
                self.assertIn("parallel dispatch state cannot be resumed",
                              self.command("next", succeeds=False))
                self.assertEqual((self.tree.read_bytes(), self.state.read_bytes()), before)

    def test_parallel_commands_are_removed(self):
        self.init()
        before = self.tree.read_bytes(), self.state.read_bytes()
        for command in ("aggregate", "repair"):
            with self.subTest(command=command):
                self.assertIn("invalid choice", self.command(command, succeeds=False))
                self.assertEqual((self.tree.read_bytes(), self.state.read_bytes()), before)


if __name__ == "__main__":
    unittest.main()
