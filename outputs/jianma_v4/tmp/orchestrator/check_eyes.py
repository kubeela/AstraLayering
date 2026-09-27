"""Check structural invariants of a continued, layered eyes SVG."""

import re
import sys
from collections import Counter
from pathlib import Path
from lxml import etree


def read_svg(path: Path):
    root = etree.parse(str(path)).getroot()
    nodes = list(root.iter())
    ids = [node.get("id") for node in nodes if node.get("id")]
    duplicate_ids = sorted(key for key, count in Counter(ids).items() if count > 1)
    id_set = set(ids)
    unresolved = sorted({
        match
        for node in nodes
        for value in node.attrib.values()
        for match in re.findall(r"url\(#([^)]*)\)", value)
        if match not in id_set
    })
    unresolved += sorted({
        value[1:]
        for node in nodes
        for name, value in node.attrib.items()
        if etree.QName(name).localname == "href" and value.startswith("#")
        and value[1:] not in id_set
    })
    image_nodes = [node for node in nodes if etree.QName(node).localname == "image"]
    parts = {node.get("data-part") for node in nodes if node.get("data-part")}
    groups = {
        child.get("id"): etree.tostring(child)
        for child in root
        if etree.QName(child).localname == "g" and child.get("id")
    }
    return root, id_set, duplicate_ids, unresolved, image_nodes, parts, groups


def main():
    baseline_path, candidate_path, parts_path = map(Path, sys.argv[1:4])
    baseline = read_svg(baseline_path)
    candidate = read_svg(candidate_path)
    expected_parts = set(re.findall(r"^\s+- id: ([\w-]+)$", parts_path.read_text(encoding="utf-8"), re.M))
    root = candidate[0]
    changed = [key for key in baseline[6] if key in candidate[6] and baseline[6][key] != candidate[6][key]]
    missing_groups = sorted(set(baseline[6]) - set(candidate[6]))
    missing_parts = sorted(expected_parts - candidate[5])
    missing_old_ids = sorted(baseline[1] - candidate[1])
    effect_refs = sorted({
        value
        for node in root.iter()
        for name in ("data-source-id", "data-target-id")
        if (value := node.get(name)) and value not in candidate[1]
    })
    effect_parts = sorted({
        value
        for node in root.iter()
        for name in ("data-source-part", "data-target-part")
        if (value := node.get(name)) and value not in expected_parts
    })
    findings = {
        "canvas": (root.get("width"), root.get("height"), root.get("viewBox")),
        "expected_parts": len(expected_parts),
        "actual_parts": len(candidate[5]),
        "duplicate_ids": candidate[2],
        "unresolved_url_references": candidate[3],
        "unresolved_effect_node_references": effect_refs,
        "unresolved_effect_part_references": effect_parts,
        "image_elements": len(candidate[4]),
        "missing_parts": missing_parts,
        "missing_baseline_groups": missing_groups,
        "missing_baseline_ids": missing_old_ids,
        "changed_baseline_groups": changed,
        "new_top_level_groups": sorted(set(candidate[6]) - set(baseline[6])),
    }
    for key, value in findings.items():
        print(f"{key}: {value}")
    if (candidate[2] or candidate[3] or candidate[4] or missing_parts or missing_groups
            or effect_refs or effect_parts or root.get("viewBox") != "0 0 941 1672"):
        sys.exit(1)


if __name__ == "__main__":
    main()
