import importlib.util
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


if __name__ == "__main__":
    unittest.main()
