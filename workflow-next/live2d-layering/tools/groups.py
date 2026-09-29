"""Validate and publish the initial group tree for step 2."""

import argparse
import json
import os
from pathlib import Path
import re
import sys
import tempfile


NAME = re.compile(r"[a-z][a-z0-9]*(?:_[a-z0-9]+)*\Z")


def validate_initial(document):
    if not isinstance(document, dict) or set(document) != {"subject", "groups"}:
        raise ValueError("顶层字段必须恰好为 subject、groups")
    if document["subject"] not in ("character", "other"):
        raise ValueError("subject 必须为 character 或 other")

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


def read_and_validate(path):
    document = json.loads(path.read_text(encoding="utf-8"))
    validate_initial(document)
    return document


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
    args = parser.parse_args(argv)
    try:
        if args.command == "publish-initial":
            publish_initial(args.draft, args.out)
        else:
            read_and_validate(args.groups)
    except (OSError, ValueError) as exc:
        print(exc, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
