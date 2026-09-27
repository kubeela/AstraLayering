"""Independent structural checks for the second eyes run."""

import re
import sys
from collections import Counter
from pathlib import Path

from lxml import etree


def inspect(path):
    root = etree.parse(str(path)).getroot()
    nodes = list(root.iter())
    ids = [node.get("id") for node in nodes if node.get("id")]
    groups = {
        node.get("id")
        for node in root
        if etree.QName(node).localname == "g" and node.get("id")
    }
    return root, nodes, ids, groups


def main():
    baseline, candidate, parts_file = map(Path, sys.argv[1:4])
    base_root, _, base_ids, base_groups = inspect(baseline)
    root, nodes, ids, groups = inspect(candidate)
    id_set = set(ids)
    part_ids = set(re.findall(r"^\s+- id: ([\w-]+)$", parts_file.read_text(encoding="utf-8"), re.M))
    represented_parts = {node.get("data-part") for node in nodes if node.get("data-part")}

    refs = []
    for node in nodes:
        for attr, value in node.attrib.items():
            refs.extend(re.findall(r"url\(#([^)]*)\)", value))
            if etree.QName(attr).localname == "href" and value.startswith("#"):
                refs.append(value[1:])
            if attr in ("data-source-id", "data-target-id") and value:
                refs.append(value)

    missing_refs = sorted(set(refs) - id_set)
    invalid_effect_parts = sorted({
        value
        for node in nodes
        for attr in ("data-source-part", "data-target-part")
        if (value := node.get(attr)) and value not in part_ids
    })
    duplicate_ids = sorted(key for key, count in Counter(ids).items() if count != 1)
    images = sum(etree.QName(node).localname == "image" for node in nodes)
    missing_parts = sorted(part_ids - represented_parts)
    missing_groups = sorted(base_groups - groups)
    missing_ids = sorted(set(base_ids) - id_set)
    canvas = (root.get("width"), root.get("height"), root.get("viewBox"))

    result = {
        "canvas": canvas,
        "part_count": len(represented_parts),
        "id_count": len(ids),
        "duplicate_ids": duplicate_ids,
        "unresolved_references": missing_refs,
        "invalid_effect_parts": invalid_effect_parts,
        "embedded_images": images,
        "missing_parts": missing_parts,
        "missing_baseline_groups": missing_groups,
        "missing_baseline_ids": missing_ids,
        "added_top_level_groups": sorted(groups - base_groups),
    }
    for key, value in result.items():
        print(f"{key}: {value}")
    errors = (duplicate_ids or missing_refs or invalid_effect_parts or images or
              missing_parts or missing_groups or canvas != ("941", "1672", "0 0 941 1672"))
    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
