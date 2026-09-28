"""Behavioral checks for the persisted group/part dispatch cursor."""

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
        self.tree.write_text(json.dumps({
            "subject": "character",
            "groups": [
                {"name": "face", "groups": [
                    {"name": "eyes", "groups": [
                        {"name": "left_eye", "groups": []},
                        {"name": "right_eye", "groups": []},
                    ]},
                    {"name": "mouth", "groups": []},
                    {"name": "face_base", "groups": []},
                ]},
                {"name": "hair", "groups": [{"name": "bangs", "groups": []}]},
            ],
        }), encoding="utf-8")

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

    def test_dynamic_children_nested_calls_and_resume(self):
        routes = (
            "--root-key", "groups", "--child-edge", "groups:group",
            "--child-edge", "parts:part", "--terminal-type", "part",
            "--route-name", "group:face", "--route-name", "group:eyes",
            "--route-name", "group:mouth", "--route-name", "group:hair",
        )
        self.assertEqual(self.command("init", *routes)["nodes"], 8)
        self.assertEqual(self.command("init", *routes)["action"], "already_initialized")
        face = self.command("next")
        self.assertEqual(face["targets"][0]["path"], "face")
        self.command("checkpoint", "--pointer", "face/layers")

        patch = self.root / "patch.json"
        patch.write_text(json.dumps({
            "groups": [{"name": "ears", "groups": [], "parts": [
                {"name": "left_ear"}, {"name": "right_ear"},
            ]}],
            "parts": [{"name": "nose"}],
        }), encoding="utf-8")
        self.assertEqual(self.command("expand", "--parent", face["targets"][0]["id"],
                                      "--patch", str(patch))["added"], 4)
        self.assertEqual(self.command("next")["pointer"], "face/layers")

        eyes = self.command("call", "--match-node", "group:eyes", "--route", "group:eyes")
        self.assertEqual(eyes["targets"][0]["path"], "face/eyes")
        self.command("complete", "--coverage", "subtree")
        self.assertEqual(self.command("call", "--match-node", "group:eyes",
                                      "--route", "group:eyes")["action"], "skipped")
        self.command("call", "--match-node", "group:mouth", "--route", "group:mouth")
        self.command("complete", "--coverage", "node")
        other = self.command("call", "--remaining", "--route", "generic")
        self.assertEqual({item["path"] for item in other["targets"]}, {
            "face/face_base", "face/ears/left_ear", "face/ears/right_ear", "face/nose",
        })
        self.command("complete", "--coverage", "node")
        self.command("complete", "--coverage", "node")
        self.assertEqual(self.command("next")["targets"][0]["path"], "hair")
        self.command("complete", "--coverage", "subtree")
        self.assertEqual(self.command("next")["action"], "done")

        final = json.loads(self.tree.read_text(encoding="utf-8"))
        progress = json.loads(self.state.read_text(encoding="utf-8"))
        self.assertNotIn("_dispatch", final)
        self.assertEqual(progress["nodes"]["face/eyes"]["completed_by"], "group:eyes")
        self.assertEqual(progress["nodes"]["face/ears"]["status"], "done")

    def test_invalid_expansion_preserves_document(self):
        self.command("init", "--root-key", "groups",
                     "--child-edge", "groups:group", "--child-edge", "parts:part",
                     "--terminal-type", "part", "--route-name", "group:face")
        face = self.command("next")
        before = self.tree.read_bytes()
        state_before = self.state.read_bytes()
        patch = self.root / "bad.json"
        patch.write_text(json.dumps({"parts": [{"name": "eyes"}]}), encoding="utf-8")
        self.command("expand", "--parent", face["targets"][0]["id"],
                     "--patch", str(patch), succeeds=False)
        self.assertEqual(self.tree.read_bytes(), before)
        self.assertEqual(self.state.read_bytes(), state_before)

    def test_new_child_remains_for_outer_traversal(self):
        self.tree.write_text(json.dumps({"groups": [
            {"name": "outer", "groups": []},
        ]}), encoding="utf-8")
        self.command("init", "--root-key", "groups",
                     "--child-edge", "groups:group", "--child-edge", "parts:part",
                     "--terminal-type", "part", "--route-name", "group:outer",
                     "--route-name", "part:jewel")
        outer = self.command("next")
        patch = self.root / "child.json"
        patch.write_text(json.dumps({"groups": [
            {"name": "new_group", "groups": [], "parts": [{"name": "jewel"}]},
        ]}), encoding="utf-8")
        self.command("expand", "--parent", outer["targets"][0]["id"],
                     "--patch", str(patch))
        self.command("complete", "--coverage", "node")
        child = self.command("next")
        self.assertEqual(child["route"], "part:jewel")
        self.assertEqual(child["targets"][0]["path"], "outer/new_group/jewel")
        self.command("complete", "--coverage", "node")
        self.assertEqual(self.command("next")["action"], "done")

    def test_arbitrary_tree_keys_use_the_same_cursor(self):
        self.tree.write_text(json.dumps({"nodes": [
            {"name": "root", "branches": [
                {"name": "branch", "atoms": [{"name": "detail"}]},
            ]},
        ]}), encoding="utf-8")
        self.command("init", "--root-key", "nodes",
                     "--child-edge", "nodes:branch",
                     "--child-edge", "branches:branch",
                     "--child-edge", "atoms:atom",
                     "--terminal-type", "atom",
                     "--route-name", "branch:root")
        root = self.command("next")
        self.assertEqual(root["route"], "branch:root")
        self.command("complete", "--coverage", "node")
        detail = self.command("next")
        self.assertEqual(detail["targets"][0]["path"], "root/branch/detail")
        self.assertEqual(detail["route"], "generic")
        self.command("complete", "--coverage", "node")
        self.assertEqual(self.command("next")["action"], "done")

    def test_new_structure_is_reconciled_into_separate_state(self):
        self.tree.write_text(json.dumps({"groups": [
            {"name": "outer", "groups": []},
        ]}), encoding="utf-8")
        self.command("init", "--root-key", "groups",
                     "--child-edge", "groups:group", "--child-edge", "parts:part",
                     "--terminal-type", "part", "--route-name", "group:outer")
        self.command("next")
        self.command("complete", "--coverage", "node")
        updated = json.loads(self.tree.read_text(encoding="utf-8"))
        updated["groups"][0]["parts"] = [{"name": "detail"}]
        self.tree.write_text(json.dumps(updated), encoding="utf-8")
        selected = self.command("next")
        self.assertEqual(selected["targets"][0]["path"], "outer/detail")
        self.assertNotIn("_dispatch", json.loads(self.tree.read_text(encoding="utf-8")))
        self.assertIn("outer/detail", json.loads(self.state.read_text(encoding="utf-8"))["nodes"])


if __name__ == "__main__":
    unittest.main()
