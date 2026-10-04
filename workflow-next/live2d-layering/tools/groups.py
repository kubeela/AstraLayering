"""Validate the initial group tree and one-level group/part growth proposals."""

import argparse
import json
import os
from pathlib import Path
import re
import sys
import tempfile


NAME = re.compile(r"[a-z][a-z0-9]*(?:_[a-z0-9]+)*\Z")


def validate_header(document):
    if (not isinstance(document, dict) or not {"subject", "groups"} <= set(document)
            or set(document) - {"subject", "groups", "mirror_pairs"}):
        raise ValueError("顶层必须包含 subject、groups，可选 mirror_pairs")
    if document["subject"] not in ("character", "other"):
        raise ValueError("subject 必须为 character 或 other")


def validate_mirror_pairs(document, index):
    """Ordered mirror associations; tree ownership and progress stay separate."""
    mirror_pairs = document.get("mirror_pairs", [])
    if not isinstance(mirror_pairs, list):
        raise ValueError("mirror_pairs 必须是数组")
    names, members_used = set(), set()
    for pair in mirror_pairs:
        if (not isinstance(pair, dict) or set(pair) != {"name", "members"}
                or not isinstance(pair["name"], str)
                or not NAME.fullmatch(pair["name"]) or pair["name"] in names):
            raise ValueError("镜像关联包含唯一的 name 和 members")
        names.add(pair["name"])
        members = pair["members"]
        if (not isinstance(members, list)
                or len(members) != 2
                or any(not isinstance(path, str) or index.get(path) != "group"
                       for path in members)):
            raise ValueError("镜像关联须引用两个已有 group 的完整路径")
        if len(set(members)) != 2 or members[0].count("/") != members[1].count("/"):
            raise ValueError("镜像成员须为同层的两个不同 group")
        if members_used.intersection(members):
            raise ValueError("同一个 group 至多属于一条镜像关联")
        members_used.update(members)


def validate_initial(document):
    validate_header(document)

    def visit(nodes):
        if not isinstance(nodes, list) or not nodes:
            raise ValueError("groups 必须是非空数组")
        seen = set()
        for node in nodes:
            if not isinstance(node, dict) or not {"name", "groups"} <= set(node):
                raise ValueError("groups 的节点必须包含 name、groups")
            if set(node) - {"name", "groups", "note"}:
                raise ValueError("groups 含有初始分组以外的字段")
            name = node["name"]
            if not isinstance(name, str) or not NAME.fullmatch(name):
                raise ValueError(f"无效的 group 名称：{name!r}")
            if name in seen:
                raise ValueError(f"同级 group 重名：{name}")
            seen.add(name)
            if "note" in node and (not isinstance(node["note"], str) or not node["note"].strip()):
                raise ValueError(f"{name} 的 note 必须是非空字符串")
            children = node["groups"]
            if not isinstance(children, list):
                raise ValueError(f"{name} 的 groups 必须是数组")
            if children:
                raise ValueError(f"{name} 的初始分组只能有一层 group")

    visit(document["groups"])
    validate_mirror_pairs(document, {node["name"]: "group" for node in document["groups"]})


def read_and_validate(path):
    document = json.loads(path.read_text(encoding="utf-8"))
    validate_initial(document)
    return document


def validate_children(document, group_path, patch):
    """Check a proposed addition without changing the tree or dispatch state."""
    validate_header(document)
    if (not isinstance(group_path, str) or not group_path
            or any(not NAME.fullmatch(name) for name in group_path.split("/"))):
        raise ValueError("group_path 必须为完整的 group 路径")
    lookup, index = {}, {}

    def siblings(group_nodes, part_nodes, parent_path="", direct_only=False):
        if not isinstance(group_nodes, list) or not isinstance(part_nodes, list):
            raise ValueError("groups、parts 必须是数组")
        seen = set()
        for kind, nodes in (("group", group_nodes), ("part", part_nodes)):
            for node in nodes:
                required = {"name", "groups"} if kind == "group" else {"name"}
                allowed = required | {"note"}
                if kind == "group":
                    allowed.add("parts")
                if (not isinstance(node, dict) or not required <= set(node)
                        or set(node) - allowed):
                    raise ValueError(f"{kind} 节点字段不符合结构格式")
                name = node["name"]
                if not isinstance(name, str) or not NAME.fullmatch(name):
                    raise ValueError(f"无效的 {kind} 名称：{name!r}")
                if name in seen:
                    raise ValueError(f"同级 group/part 重名：{name}")
                seen.add(name)
                if "note" in node and (not isinstance(node["note"], str)
                                       or not node["note"].strip()):
                    raise ValueError(f"{name} 的 note 必须是非空字符串")
                path = f"{parent_path}/{name}" if parent_path else name
                if not direct_only:
                    index[path] = kind
                if kind == "group":
                    children = node["groups"]
                    parts = node.get("parts", [])
                    if direct_only:
                        if children != [] or parts != []:
                            raise ValueError("本轮只新增一层直属 group/part")
                    else:
                        lookup[path] = node
                        siblings(children, parts, path)
        return seen

    if not isinstance(document["groups"], list) or not document["groups"]:
        raise ValueError("顶层 groups 必须是非空数组")
    siblings(document["groups"], [])
    validate_mirror_pairs(document, index)
    target = lookup.get(group_path)
    if target is None:
        raise ValueError(f"找不到 group：{group_path}")
    if (not isinstance(patch, dict) or not {"groups", "parts"} <= set(patch)
            or set(patch) - {"groups", "parts", "mirror_pairs"}):
        raise ValueError("孩子清单必须包含 groups、parts，可选 mirror_pairs")
    proposed = siblings(patch["groups"], patch["parts"], group_path, direct_only=True)
    existing = {node["name"] for edge in ("groups", "parts")
                for node in target.get(edge, [])}
    repeated = existing & proposed
    if repeated:
        raise ValueError(f"已有直属节点重名：{', '.join(sorted(repeated))}")
    if not existing and not proposed:
        raise ValueError("当前 group 至少需要一个直属 group 或 part")
    # Validate against this round's resulting tree, including newly added groups.
    index.update({f"{group_path}/{node['name']}": kind
                  for kind, edge in (("group", "groups"), ("part", "parts"))
                  for node in patch[edge]})
    additions = patch.get("mirror_pairs", [])
    if not isinstance(additions, list):
        raise ValueError("mirror_pairs 必须是数组")
    validate_mirror_pairs({"mirror_pairs": document.get("mirror_pairs", []) + additions}, index)
    for pair in additions:
        if not any(path.rpartition("/")[0] == group_path
                   for path in pair["members"]):
            raise ValueError("新增镜像关联至少关联当前 group 的一个直属 group")


def check_children(groups, group_path, patch):
    document = json.loads(groups.read_text(encoding="utf-8"))
    children = json.loads(patch.read_text(encoding="utf-8"))
    validate_children(document, group_path, children)


def publish_initial(draft, out):
    if draft.resolve() == out.resolve():
        raise ValueError("草稿与正式输出必须是不同文件")
    document = read_and_validate(draft)
    out.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=out.parent,
                                         prefix=f".{out.name}.", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(document, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, out)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    publish = subparsers.add_parser("publish-initial")
    publish.add_argument("--draft", type=Path, required=True)
    publish.add_argument("--out", type=Path, required=True)
    check = subparsers.add_parser("check-initial")
    check.add_argument("--groups", type=Path, required=True)
    children = subparsers.add_parser("check-children")
    children.add_argument("--groups", type=Path, required=True)
    children.add_argument("--group-path", required=True)
    children.add_argument("--patch", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "publish-initial":
            publish_initial(args.draft, args.out)
        elif args.command == "check-children":
            check_children(args.groups, args.group_path, args.patch)
        else:
            read_and_validate(args.groups)
    except (OSError, ValueError) as exc:
        print(exc, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
