"""Dispatch safety: one source only for mirrors; otherwise every eye is queued."""

import copy
import importlib.util
import unittest
from pathlib import Path


SCRIPT = (Path(__file__).resolve().parents[2] / "templates" / "部件专项" /
          "eyes" / "1.眼部参考准备" / "1.1.对称性与制作计划" / "validate_plan.py")
SPEC = importlib.util.spec_from_file_location("eye_plan", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
PARTS = ["eye_left", "eye_right"]
SHA = "a" * 64


def make_plan(symmetric):
    return {
        "locked": True, "eye_hair_order": "behind",
        "eyes_symmetric": symmetric, "reference_sha256": SHA,
        "part_ids": PARTS[:],
        "eyes": [{"id": p, "part_id": p}
                 for p in (["eye_right"] if symmetric else PARTS)],
        "mirror": {"source": "eye_right", "target": "eye_left",
                   "axis": [[20, 10], [23, 50]]} if symmetric else None,
    }


class PlanTests(unittest.TestCase):
    def check(self, plan, options=None, digest=SHA, parts=None):
        MODULE.validate_plan(
            plan, options if options is not None else
            {"simplify": False, "eyes_symmetric": plan["eyes_symmetric"]},
            digest, PARTS if parts is None else parts)

    def test_valid_queues(self):
        self.check(make_plan(True))
        self.check(make_plan(False))

    def test_missing_duplicate_or_foreign_eye(self):
        for eyes in [[], [{"id": "eye_left", "part_id": "eye_left"}],
                     [{"id": "eye_left", "part_id": "eye_left"}] * 2,
                     [{"id": "../eye", "part_id": "../eye"}]]:
            plan = make_plan(False)
            plan["eyes"] = eyes
            with self.subTest(eyes=eyes), self.assertRaises(ValueError):
                self.check(plan)

    def test_symmetric_source_and_target(self):
        for changes in [{"source": "eye_left"}, {"target": "eye_right"},
                        {"target": "missing"}]:
            plan = make_plan(True)
            plan["mirror"].update(changes)
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.check(plan)
        plan = make_plan(True)
        plan["eyes"] = make_plan(False)["eyes"]
        with self.assertRaises(ValueError):
            self.check(plan)

    def test_asymmetric_must_not_mirror_or_reorder(self):
        plan = make_plan(False)
        plan["mirror"] = make_plan(True)["mirror"]
        with self.assertRaises(ValueError):
            self.check(plan)
        plan = make_plan(False)
        plan["eyes"].reverse()
        with self.assertRaises(ValueError):
            self.check(plan)

    def test_stale_reference_options_and_group(self):
        plan = make_plan(True)
        for options, digest, parts in [
            ({"eyes_symmetric": False}, SHA, PARTS),
            ({"eyes_symmetric": "true"}, SHA, PARTS),
            ({"eyes_symmetric": True}, "b" * 64, PARTS),
            ({"eyes_symmetric": True}, SHA, ["eye_left"]),
        ]:
            with self.subTest(options=options, digest=digest, parts=parts):
                with self.assertRaises(ValueError):
                    self.check(plan, options, digest, parts)

    def test_invalid_axis(self):
        for axis in [None, [[0, 1]], [[0, 1], [0, 1]],
                     [[True, 0], [0, 1]], [[0, 0], [float("nan"), 1]],
                     [[0, 0], [float("inf"), 1]]]:
            plan = make_plan(True)
            plan["mirror"]["axis"] = axis
            with self.subTest(axis=axis), self.assertRaises(ValueError):
                self.check(plan)

    def test_single_eye_can_only_use_asymmetric_plan(self):
        plan = make_plan(False)
        plan["part_ids"] = ["eye_left"]
        plan["eyes"] = plan["eyes"][:1]
        self.check(plan, parts=["eye_left"])
        plan["eyes_symmetric"] = True
        with self.assertRaises(ValueError):
            self.check(plan, parts=["eye_left"])

    def test_validation_does_not_modify_plan(self):
        plan = make_plan(True)
        before = copy.deepcopy(plan)
        self.check(plan)
        self.assertEqual(plan, before)

    def test_plan_must_be_locked_with_whole_eye_layer_order(self):
        for key, value in [("locked", False), ("locked", "true"),
                           ("eye_hair_order", "lash_overlay")]:
            plan = make_plan(True)
            plan[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                self.check(plan)

    def test_frozen_hash_rejects_late_strategy_switch(self):
        import json
        initial = json.dumps(make_plan(True)).encode()
        frozen = MODULE.check_plan_hash(initial)
        self.assertEqual(MODULE.check_plan_hash(initial, frozen), frozen)
        changed = json.dumps(make_plan(False)).encode()
        with self.assertRaises(ValueError):
            MODULE.check_plan_hash(changed, frozen)

    def test_duplicate_json_fields_rejected(self):
        with self.assertRaises(ValueError):
            MODULE.unique_object([("eyes_symmetric", True),
                                  ("eyes_symmetric", False)])


if __name__ == "__main__":
    unittest.main()
