"""Check every direct child's rendered shape against an input parent guide.

Uses the same Python renderer as svg_preview.py. A nonzero exit status rejects
overflow, missing bindings or empty shapes; inputs are never edited.
"""
import argparse
import copy
import io
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

from groups import validate_children
try:
    from svg_preview import (MAX_PIXELS, RESOURCES, crop_svg, isolate, local_tag,
                             read_svg, render_svg, style)
except SystemExit as exc:
    print(str(exc), file=sys.stderr)
    raise SystemExit(2)
from PIL import Image, ImageChops, ImageFilter


ALPHA_THRESHOLD = 128


def target_children(document, group_path):
    validate_children(document, group_path, {"groups": [], "parts": []})
    nodes = document["groups"]
    for name in group_path.split("/"):
        target = next(node for node in nodes if node["name"] == name)
        nodes = target["groups"]
    return [(kind, group_path + "/" + child["name"])
            for edge, kind in (("groups", "group"), ("parts", "part"))
            for child in target.get(edge, [])]


def selected_shape(root, kind, path):
    """Keep one binding, excluding other bindings nested inside its container."""
    attribute = "data-" + kind + "-path"
    doc = copy.deepcopy(root)
    targets = [node for node in doc.iter() if node.get(attribute) == path]
    if not targets:
        raise ValueError("Missing %s binding: %s" % (kind, path))
    for node in targets:
        if local_tag(node) != "g" or not node.get("id"):
            raise ValueError("A bound drawing must be a <g> with an id: " + path)
        if node.get("data-group-path") and node.get("data-part-path"):
            raise ValueError("A drawing cannot have both group and part bindings: " + path)
    ids = [node.get("id") for node in targets]
    isolate(doc, ids)
    parents = {child: parent for parent in doc.iter() for child in parent}
    needed = set(targets)
    for node in targets:
        while node in parents:
            node = parents[node]
            needed.add(node)

    def visit(node):
        if local_tag(node) in RESOURCES:
            return
        if node not in needed and (node.get("data-group-path") or node.get("data-part-path")):
            style(node, "display:none!important")
            return
        for child in node:
            visit(child)

    visit(doc)
    return doc, ids


def alpha_image(root, size, box=None, scale=1):
    box = box or (0, 0, *size)
    output_size = (box[2] * scale, box[3] * scale)
    if output_size[0] * output_size[1] > MAX_PIXELS:
        raise ValueError("Check region too large; reduce --scale")
    cropped = crop_svg(copy.deepcopy(root), size, box, output_size)
    data = render_svg(ET.tostring(cropped, encoding="utf-8", xml_declaration=True))
    with Image.open(io.BytesIO(data)) as image:
        return image.convert("RGBA").getchannel("A")


def occupied(alpha):
    return alpha.point(lambda value: 255 if value >= ALPHA_THRESHOLD else 0)


def union_box(first, second, size):
    x0 = max(0, min(first[0], second[0]) - 1)
    y0 = max(0, min(first[1], second[1]) - 1)
    x1 = min(size[0], max(first[2], second[2]) + 1)
    y1 = min(size[1], max(first[3], second[3]) + 1)
    return x0, y0, x1 - x0, y1 - y0


def source_box(box, region, scale):
    return [region[0] + box[0] / scale, region[1] + box[1] / scale,
            (box[2] - box[0]) / scale, (box[3] - box[1]) / scale]


def diagnostic(parent, child, outside, out, index, scale, protected):
    path = out.parent / (out.stem + "-images") / ("%02d-outside.png" % index)
    if path.resolve() in protected:
        raise ValueError("Diagnostic output would overwrite an input")
    board = Image.new("RGB", parent.size, "white")
    board.paste((219, 228, 242), mask=parent)
    board.paste((120, 190, 160), mask=child)
    edge = ImageChops.subtract(parent, parent.filter(ImageFilter.MinFilter(3)))
    board.paste((40, 90, 180), mask=edge)
    board.paste((235, 35, 55), mask=outside)
    x0, y0, x1, y1 = outside.getbbox()
    margin = 8 * scale
    crop = (max(0, x0 - margin), max(0, y0 - margin),
            min(board.width, x1 + margin), min(board.height, y1 + margin))
    path.parent.mkdir(parents=True, exist_ok=True)
    board.crop(crop).save(path)
    return str(path), crop


def check(parent_svg, candidate_svg, groups, group_path, out, scale=4):
    protected = {path.resolve() for path in (parent_svg, candidate_svg, groups)}
    if out.resolve() in protected:
        raise ValueError("Report output would overwrite an input")
    if parent_svg.resolve() == candidate_svg.resolve():
        raise ValueError("Input parent guide and candidate must be different files")
    if scale < 1 or scale > 8:
        raise ValueError("--scale must be between 1 and 8")
    document = json.loads(groups.read_text(encoding="utf-8"))
    children = target_children(document, group_path)
    parent_root, size = read_svg(parent_svg)
    candidate_root, candidate_size = read_svg(candidate_svg)
    if candidate_size != size:
        raise ValueError("Input parent guide and candidate must have the same viewport")
    parent, parent_ids = selected_shape(parent_root, "group", group_path)
    parent_bbox = alpha_image(parent, size).getbbox()
    if parent_bbox is None:
        raise ValueError("Input parent guide is empty: " + group_path)
    results = []
    parent_cache = {}
    for index, (kind, path) in enumerate(children, 1):
        item = {"kind": kind, "path": path, "status": "fail"}
        try:
            child, ids = selected_shape(candidate_root, kind, path)
            item["ids"] = ids
            child_bbox = alpha_image(child, size).getbbox()
            if child_bbox is None:
                raise ValueError("Child guide is empty: " + path)
            region = union_box(parent_bbox, child_bbox, size)
            if region not in parent_cache:
                # Keep one cached parent region; process children sequentially.
                parent_cache = {region: occupied(alpha_image(parent, size, region, scale))}
            parent_mask = parent_cache[region]
            child_mask = occupied(alpha_image(child, size, region, scale))
            if child_mask.getbbox() is None:
                raise ValueError("Child has no filled area at the checking resolution: " + path)
            outside = ImageChops.subtract(child_mask, parent_mask)
            count = outside.histogram()[255]
            item.update(status="fail" if count else "pass", outside_samples=count,
                        outside_area_px2=count / (scale * scale),
                        outside_bbox=source_box(outside.getbbox(), region, scale) if count else None)
            if count:
                image_path, image_crop = diagnostic(parent_mask, child_mask, outside,
                                                     out, index, scale, protected)
                item["diagnostic"] = image_path
                item["diagnostic_crop"] = source_box(image_crop, region, scale)
        except (OSError, ValueError) as exc:
            item["reason"] = str(exc)
        results.append(item)
    report = {"status": "pass" if all(item["status"] == "pass" for item in results) else "fail",
              "group_path": group_path, "parent_svg": str(parent_svg),
              "parent_ids": parent_ids, "candidate_svg": str(candidate_svg),
              "scale": scale, "alpha_threshold": ALPHA_THRESHOLD,
              "coordinate_units": "original viewport pixels", "results": results}
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--parent-svg", type=Path, required=True)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--groups", type=Path, required=True)
    parser.add_argument("--group-path", required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--scale", type=int, default=4,
                        help="Samples per original pixel on each axis (default: 4)")
    args = parser.parse_args(argv)
    try:
        report = check(args.parent_svg, args.candidate, args.groups, args.group_path,
                       args.out, args.scale)
    except (OSError, ValueError) as exc:
        print(exc, file=sys.stderr)
        return 2
    print(json.dumps({"status": report["status"], "report": str(args.out),
                      "failed": [item["path"] for item in report["results"]
                                 if item["status"] != "pass"]}, ensure_ascii=False))
    return 0 if report["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
