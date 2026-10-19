"""Validate eye dispatch plans against the selected reference and flat options.

Python 3.8+, standard library only. Geometry/symmetry still require visual review.
"""

import argparse
import hashlib
import json
import math
import re
from pathlib import Path


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key: " + key)
        result[key] = value
    return result


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"),
                      object_pairs_hook=unique_object)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def safe_id(value):
    return isinstance(value, str) and re.fullmatch(
        r"[A-Za-z_][A-Za-z0-9_-]*", value
    ) is not None and value.upper() not in {
        "CON", "PRN", "AUX", "NUL",
        *("COM" + str(n) for n in range(1, 10)),
        *("LPT" + str(n) for n in range(1, 10)),
    }


def validate_plan(plan, options, reference_sha256, part_ids):
    require(isinstance(plan, dict), "plan must be an object")
    require(isinstance(options, dict), "options must be an object")
    require(isinstance(part_ids, list) and part_ids and
            all(safe_id(item) for item in part_ids),
            "group part IDs must be nonempty, path-safe identifiers")
    require(len(set(part_ids)) == len(part_ids), "duplicate group part IDs")
    require(plan.get("part_ids") == part_ids,
            "plan part_ids must match group.part_ids in order")
    require(plan.get("locked") is True, "plan must be locked before drawing")
    require(plan.get("eye_hair_order") in ("behind", "in_front"),
            "eye_hair_order must place the whole eye behind or in_front of hair")
    symmetric = plan.get("eyes_symmetric")
    require(type(symmetric) is bool, "plan eyes_symmetric must be boolean")
    require(type(options.get("eyes_symmetric")) is bool and
            options["eyes_symmetric"] == symmetric,
            "plan and options eyes_symmetric disagree")
    require(plan.get("reference_sha256") == reference_sha256,
            "reference SHA-256 mismatch; rebuild the plan for this reference")

    eyes = plan.get("eyes")
    require(isinstance(eyes, list) and eyes, "eyes must be a nonempty list")
    for eye in eyes:
        require(isinstance(eye, dict), "each eye must be an object")
        require(safe_id(eye.get("id")) and
                eye.get("id") == eye.get("part_id") and
                eye["part_id"] in part_ids,
                "eye id must equal a group part_id")
    queue = [eye["part_id"] for eye in eyes]
    require(len(set(queue)) == len(queue), "duplicate eyes in queue")

    require("mirror" in plan, "mirror field is required")
    mirror = plan["mirror"]
    if not symmetric:
        require(queue == part_ids,
                "asymmetric queue must contain every eye in group order")
        require(mirror is None, "asymmetric plan must set mirror to null")
        return

    require(len(part_ids) == 2 and len(queue) == 1,
            "symmetric plan requires two parts and one source eye")
    require(isinstance(mirror, dict), "symmetric plan requires mirror object")
    require(mirror.get("source") == queue[0],
            "mirror source must equal the queued eye")
    require(mirror.get("target") in part_ids and
            mirror["target"] != mirror["source"],
            "mirror target must be the other eye")
    axis = mirror.get("axis")
    require(isinstance(axis, list) and len(axis) == 2,
            "axis must contain two points")
    for point in axis:
        require(isinstance(point, list) and len(point) == 2,
                "each axis point must have two coordinates")
        require(all(type(v) in (int, float) and math.isfinite(v)
                    for v in point), "axis coordinates must be finite numbers")
    require(axis[0] != axis[1], "mirror axis points must differ")


def check_plan_hash(plan_bytes, expected=None):
    digest = hashlib.sha256(plan_bytes).hexdigest()
    require(expected is None or digest == expected.lower(),
            "locked plan changed; do not switch strategy without user instruction")
    return digest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", required=True, type=Path)
    parser.add_argument("--options", required=True, type=Path)
    parser.add_argument("--reference", required=True, type=Path)
    parser.add_argument("--part-id", required=True, action="append")
    parser.add_argument("--expected-sha256", help="Frozen plan hash recorded before drawing")
    args = parser.parse_args()
    try:
        plan_hash = check_plan_hash(args.plan.read_bytes(), args.expected_sha256)
        plan = read_json(args.plan)
        digest = hashlib.sha256(args.reference.read_bytes()).hexdigest()
        validate_plan(plan, read_json(args.options), digest, args.part_id)
    except (OSError, ValueError, OverflowError) as exc:
        parser.exit(1, "Invalid eye plan: " + str(exc) + "\n")
    print(json.dumps({"valid": True, "plan_sha256": plan_hash, "eyes_symmetric": plan["eyes_symmetric"],
                      "queue": [eye["id"] for eye in plan["eyes"]]},
                     ensure_ascii=False))


if __name__ == "__main__":
    main()
