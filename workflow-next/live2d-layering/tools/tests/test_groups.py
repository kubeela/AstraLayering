import importlib.util
import copy
import json
from pathlib import Path
import tempfile
import unittest


TOOL = Path(__file__).resolve().parents[1] / "groups.py"
spec = importlib.util.spec_from_file_location("groups_tool", TOOL)
groups = importlib.util.module_from_spec(spec)
spec.loader.exec_module(groups)


def example():
    return {"subject": "character", "groups": [
        {"name": "head", "groups": [], "note": "包括脸、头发和头饰"},
        {"name": "neck", "groups": []},
        {"name": "body", "groups": []},
        {"name": "arms", "groups": []},
        {"name": "pelvis", "groups": []},
        {"name": "legs", "groups": []},
    ]}


class InitialGroupTests(unittest.TestCase):
    def test_initial_mirror_pairs_validate_only_existing_groups(self):
        document = {"subject": "other", "groups": [
            {"name": "left_wing", "groups": []},
            {"name": "right_wing", "groups": []}], "batches": [
                {"name": "paired_wings", "mode": "mirror",
                 "members": ["left_wing", "right_wing"]}]}
        groups.validate_initial(document)
        for mode in ("copy", "serial", "parallel"):
            invalid = copy.deepcopy(document)
            invalid["batches"][0]["mode"] = mode
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                groups.validate_initial(invalid)
        document["batches"][0]["members"][1] = "right_wing/tip"
        with self.assertRaises(ValueError):
            groups.validate_initial(document)

    def test_publishes_valid_one_level_tree(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            draft = root / "tmp" / "draft.json"
            draft.parent.mkdir()
            draft.write_text(json.dumps(example()), encoding="utf-8")
            output = root / "structure" / "groups.json"
            groups.publish_initial(draft, output)
            self.assertEqual(json.loads(output.read_text()), example())

    def test_rejects_child_group_empty_root_parts_and_display_order(self):
        for change in ("child_group", "empty_root", "parts", "display_order"):
            with self.subTest(change=change):
                document = example()
                head = document["groups"][0]
                if change == "child_group":
                    head["groups"] = [{"name": "face", "groups": []}]
                elif change == "empty_root":
                    document["groups"] = []
                else:
                    head[change] = [] if change == "parts" else 10
                with self.assertRaises(ValueError):
                    groups.validate_initial(document)

    def test_invalid_draft_preserves_existing_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            draft = root / "draft.json"
            draft.write_text('{"subject": "character", "groups": []}', encoding="utf-8")
            output = root / "groups.json"
            output.write_text("existing", encoding="utf-8")
            with self.assertRaises(ValueError):
                groups.publish_initial(draft, output)
            self.assertEqual(output.read_text(), "existing")


class ChildProposalTests(unittest.TestCase):
    def test_pair_grows_with_second_side_and_preserves_previous_records(self):
        document = {"subject": "character", "groups": [{"name": "head", "groups": [
            {"name": "right_eye", "groups": [{"name": "eyeball", "groups": []}]},
            {"name": "left_eye", "groups": []}]}], "batches": [
                {"name": "paired_eyes", "mode": "mirror",
                 "members": ["head/right_eye", "head/left_eye"]}]}
        patch = {"groups": [{"name": "eyeball", "groups": []}], "parts": [],
                 "batches": [{"name": "paired_eyeballs", "mode": "mirror",
                              "members": ["head/right_eye/eyeball", "head/left_eye/eyeball"]}]}
        before = copy.deepcopy((document, patch))
        groups.validate_children(document, "head/left_eye", patch)
        self.assertEqual((document, patch), before)
        patch["groups"] = []
        patch["parts"] = [{"name": "eye_fold"}]
        with self.assertRaisesRegex(ValueError, "已有 group"):
            groups.validate_children(document, "head/left_eye", patch)

    def test_batch_cannot_reuse_members_or_register_unrelated_groups(self):
        document = example()
        batch = {"name": "paired_regions", "mode": "mirror", "members": ["head", "body"]}
        patch = {"groups": [], "parts": [{"name": "nose"}], "batches": [batch]}
        with self.assertRaisesRegex(ValueError, "直属 group"):
            groups.validate_children(document, "head", patch)
        document["groups"][0]["groups"] = [
            {"name": "left_eye", "groups": []}, {"name": "right_eye", "groups": []}]
        batch["members"] = ["head/left_eye", "head/right_eye"]
        document["batches"] = [copy.deepcopy(batch)]
        batch["name"] = "another_pair"
        with self.assertRaisesRegex(ValueError, "至多属于一个"):
            groups.validate_children(document, "head", patch)

    def test_mixed_direct_children_validate_without_changing_inputs(self):
        document = example()
        patch = {"groups": [{"name": "hair", "groups": []}],
                 "parts": [{"name": "face_shape", "note": "脸部完整底形"}]}
        before = copy.deepcopy((document, patch))
        groups.validate_children(document, "head", patch)
        self.assertEqual((document, patch), before)

    def test_locates_nested_group_and_rejects_part_as_target(self):
        document = example()
        document["groups"][0]["groups"] = [{"name": "face", "groups": [],
                                             "parts": [{"name": "nose"}]}]
        groups.validate_children(document, "head/face", {"groups": [], "parts": [{"name": "mouth"}]})
        with self.assertRaisesRegex(ValueError, "找不到 group"):
            groups.validate_children(document, "head/face/nose", {"groups": [], "parts": [{"name": "tip"}]})

    def test_rejects_duplicate_names_across_types_and_existing_children(self):
        document = example()
        document["groups"][0]["parts"] = [{"name": "nose"}]
        for patch in [
            {"groups": [{"name": "eyes", "groups": []}], "parts": [{"name": "eyes"}]},
            {"groups": [], "parts": [{"name": "nose"}]},
            {"groups": [{"name": "nose", "groups": []}], "parts": []},
        ]:
            with self.subTest(patch=patch), self.assertRaisesRegex(ValueError, "重名"):
                groups.validate_children(document, "head", patch)

    def test_rejects_nested_proposals_and_non_structural_fields(self):
        invalid = [
            {"groups": [{"name": "eyes", "groups": [{"name": "left_eye", "groups": []}]}], "parts": []},
            {"groups": [{"name": "eyes", "groups": [], "parts": [{"name": "iris"}]}], "parts": []},
            {"groups": [], "parts": [{"name": "nose", "groups": []}]},
            {"groups": [], "parts": [{"name": "nose", "display_order": 3}]},
            {"groups": [], "parts": [{"name": "left-eye"}]},
            {"groups": {}, "parts": []},
            {"parts": [{"name": "nose"}]},
        ]
        for patch in invalid:
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                groups.validate_children(example(), "head", patch)

    def test_empty_proposal_requires_existing_children(self):
        document = example()
        patch = {"groups": [], "parts": []}
        with self.assertRaisesRegex(ValueError, "至少需要一个"):
            groups.validate_children(document, "body", patch)
        document["groups"][2]["parts"] = [{"name": "torso"}]
        groups.validate_children(document, "body", patch)

    def test_file_check_keeps_tree_and_proposal_unchanged(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            tree = root / "groups.json"
            patch = root / "children.json"
            tree.write_text(json.dumps(example()), encoding="utf-8")
            patch.write_text(json.dumps({"groups": [], "parts": [{"name": "torso"}]}), encoding="utf-8")
            before = tree.read_bytes(), patch.read_bytes()
            self.assertEqual(groups.main(["check-children", "--groups", str(tree),
                                         "--group-path", "body", "--patch", str(patch)]), 0)
            self.assertEqual((tree.read_bytes(), patch.read_bytes()), before)

    def test_rejects_invalid_target_and_malformed_existing_tree(self):
        patch = {"groups": [], "parts": [{"name": "torso"}]}
        for target in ("", "/body", "body/../head", "missing"):
            with self.subTest(target=target), self.assertRaises(ValueError):
                groups.validate_children(example(), target, patch)
        document = example()
        document["groups"][0]["parts"] = [{"name": "invalid", "groups": []}]
        with self.assertRaises(ValueError):
            groups.validate_children(document, "body", patch)


if __name__ == "__main__":
    unittest.main()
