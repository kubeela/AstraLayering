"""Dispatch selected node types in a configurable JSON n-ary tree.

The sibling state file marks only dispatched nodes. Terminal components remain
in the source tree, but do not receive workflow status. The orchestrator owns
workers, outputs, and reviews.
"""

import argparse
import copy
import json
import os
import re
import tempfile
from pathlib import Path


NAME = re.compile(r"^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$")
STATES = {"pending", "active", "done"}


def pair(value, label):
    if ":" not in value:
        raise ValueError(f"{label} must use key:value")
    key, item = value.split(":", 1)
    if not NAME.fullmatch(key) or not NAME.fullmatch(item):
        raise ValueError(f"invalid {label}: {value}")
    return key, item


def read_json(path):
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path.name} must contain a JSON object")
    return value


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            "w", encoding="utf-8", dir=path.parent,
            prefix=f".{path.name}.", delete=False,
        ) as stream:
            temporary = Path(stream.name)
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def validate_spec(tree, routes, priority_keywords):
    if not isinstance(tree, dict) or not isinstance(routes, dict):
        raise ValueError("tree specification and routes must be objects")
    root = tree.get("root_key")
    edges = tree.get("child_edges")
    terminals = tree.get("terminal_types")
    dispatched = tree.get("dispatch_types")
    if (not isinstance(root, str) or not NAME.fullmatch(root)
            or not isinstance(edges, dict) or root not in edges
            or not edges or any(not NAME.fullmatch(k) or not isinstance(v, str)
                                 or not NAME.fullmatch(v) for k, v in edges.items())
            or not isinstance(terminals, list)
            or any(not isinstance(v, str) for v in terminals)
            or len(terminals) != len(set(terminals))
            or not set(terminals) <= set(edges.values())
            or not isinstance(dispatched, list) or not dispatched
            or len(dispatched) != len(set(dispatched))
            or not set(dispatched) <= set(edges.values()) - set(terminals)):
        raise ValueError("invalid tree root, child edges, or terminal types")
    if set(routes) != set(dispatched):
        raise ValueError("routes must contain every dispatched node type")
    if (not isinstance(priority_keywords, list)
            or len(priority_keywords) != len(set(priority_keywords))
            or any(not isinstance(name, str) or not NAME.fullmatch(name)
                   for name in priority_keywords)):
        raise ValueError("invalid priority keyword list")
    for kind, names in routes.items():
        if (not isinstance(names, list) or len(names) != len(set(names))
                or any(not isinstance(name, str) or not NAME.fullmatch(name)
                       for name in names)):
            raise ValueError(f"invalid routes for {kind}")


def enumerate_tree(document, tree):
    """Use only YAML-declared edges; return current nodes in depth-first order."""
    root = tree["root_key"]
    edges = tree["child_edges"]
    terminals = set(tree["terminal_types"])
    if not isinstance(document.get(root), list):
        raise ValueError(f"tree root {root} must be an array")
    entries = []

    def siblings(arrays, parent_path, parent):
        names = set()
        for kind, nodes in arrays:
            if not isinstance(nodes, list):
                raise ValueError(f"children of {parent_path or '<root>'} must be arrays")
            for node in nodes:
                if not isinstance(node, dict):
                    raise ValueError(f"invalid {kind} below {parent_path or '<root>'}")
                name = node.get("name")
                if not isinstance(name, str) or not NAME.fullmatch(name) or name in names:
                    raise ValueError(f"invalid or repeated sibling name: {name}")
                names.add(name)
                path = f"{parent_path}/{name}" if parent_path else name
                entry = {
                    "kind": kind, "name": name, "path": path,
                    "parent_path": parent_path or None, "node": node,
                }
                entries.append(entry)
                if kind in terminals:
                    if any(edge in node for edge in edges):
                        raise ValueError(f"terminal node has child edges: {path}")
                else:
                    siblings([(child_kind, node.get(edge, []))
                              for edge, child_kind in edges.items()], path, entry)

    siblings([(edges[root], document[root])], "", None)
    return entries


def make_state(tree, routes, priority_keywords):
    return {
        "version": 4, "tree": tree, "routes": routes,
        "priority_keywords": priority_keywords,
        "next_id": 1, "nodes": {}, "active": None,
    }


def reconcile(document, state):
    if (not isinstance(state, dict) or state.get("version") != 4
            or not isinstance(state.get("next_id"), int) or state["next_id"] < 1
            or not isinstance(state.get("nodes"), dict)
            or state.get("active") is not None
            and not isinstance(state.get("active"), dict)):
        raise ValueError("invalid dispatch state")
    validate_spec(state.get("tree"), state.get("routes"),
                  state.get("priority_keywords"))
    entries = enumerate_tree(document, state["tree"])
    dispatched = set(state["tree"]["dispatch_types"])
    current_paths = {entry["path"] for entry in entries if entry["kind"] in dispatched}
    missing = set(state["nodes"]) - current_paths
    if missing:
        raise ValueError(f"previous nodes were removed or renamed: {sorted(missing)[:3]}")
    changed = False
    ids = set()
    for entry in entries:
        if entry["kind"] not in dispatched:
            continue
        path = entry["path"]
        record = state["nodes"].get(path)
        if record is None:
            record = {
                "id": f"n{state['next_id']}", "kind": entry["kind"],
                "status": "pending",
            }
            state["nodes"][path] = record
            state["next_id"] += 1
            changed = True
        if (not isinstance(record, dict)
                or not isinstance(record.get("id"), str)
                or not re.fullmatch(r"n[1-9]\d*", record["id"])
                or record["id"] in ids
                or record.get("kind") != entry["kind"]
                or record.get("status") not in STATES):
            raise ValueError(f"invalid node state at {path}")
        ids.add(record["id"])
        entry["id"] = record["id"]
        entry["status"] = record["status"]
        if record["status"] == "done":
            actual = sorted(child["path"] for child in entries
                            if child["parent_path"] == path)
            if record.get("completed_children") != actual:
                raise ValueError(f"completed node changed direct children: {path}")
    if ids and state["next_id"] <= max(int(node_id[1:]) for node_id in ids):
        raise ValueError("next_id collides with an existing node")
    by_id = {entry["id"]: entry for entry in entries if "id" in entry}
    active = state["active"]
    if active is not None:
        if (not isinstance(active.get("target"), str) or active["target"] not in by_id
                or not isinstance(active.get("route"), str)):
            raise ValueError("invalid active target")
        if by_id[active["target"]]["status"] != "active":
            raise ValueError("active target status disagrees with state")
    marked = [entry["id"] for entry in entries if entry.get("status") == "active"]
    if marked != ([active["target"]] if active is not None else []):
        raise ValueError("active node and pointer disagree")
    return entries, by_id, changed


def public(entry):
    return {key: entry[key] for key in ("id", "kind", "name", "path", "parent_path")}


def frame_result(frame, by_id, action):
    return {
        "action": action, "route": frame["route"],
        "targets": [public(by_id[frame["target"]])],
        "pointer": frame.get("pointer"),
    }


def select_next(document, state, entries, by_id):
    if state["active"] is not None:
        return frame_result(state["active"], by_id, "active"), False
    pending = [(index, entry) for index, entry in enumerate(entries)
               if "id" in entry and entry["status"] == "pending"]
    if not pending:
        if any(entry["status"] != "done" for entry in entries if "id" in entry):
            raise ValueError("dispatched nodes remain unfinished")
        return {"action": "done"}, False
    keywords = state["priority_keywords"]

    def rank(item):
        index, entry = item
        name = entry["name"]
        depth = entry["path"].count("/")
        if name in keywords:
            return depth, 0, keywords.index(name), index
        match = next((position for position, keyword in enumerate(keywords)
                      if keyword in name), len(keywords))
        return depth, (1 if match < len(keywords) else 2), match, index

    _, entry = min(pending, key=rank)
    route = (f"{entry['kind']}:{entry['name']}"
             if entry["name"] in state["routes"][entry["kind"]] else "generic")
    state["nodes"][entry["path"]]["status"] = "active"
    frame = {"target": entry["id"], "route": route, "pointer": None}
    state["active"] = frame
    return frame_result(frame, by_id, "run"), True


def expand(document, state, entries, by_id, parent_id, patch):
    active = state["active"]
    if active is None or parent_id not in by_id:
        raise ValueError("expand requires an active target")
    parent_entry = by_id[parent_id]
    if parent_id != active["target"]:
        raise ValueError("expand parent must be the active target")
    if (parent_entry["kind"] in state["tree"]["terminal_types"]
            or state["nodes"][parent_entry["path"]]["status"] == "done"):
        raise ValueError("cannot expand a terminal or completed node")
    edges = state["tree"]["child_edges"]
    if (not isinstance(patch, dict) or not patch or set(patch) - set(edges)
            or any(not isinstance(value, list) for value in patch.values())
            or not any(patch.values())):
        raise ValueError("patch must add nodes through declared child edges")
    before = {entry["path"] for entry in entries}
    parent = parent_entry["node"]
    for edge in edges:
        if edge in patch:
            parent.setdefault(edge, []).extend(copy.deepcopy(patch[edge]))
    new_entries = enumerate_tree(document, state["tree"])
    new_paths = [entry["path"] for entry in new_entries if entry["path"] not in before]
    reconciled, _, _ = reconcile(document, state)
    lookup = {entry["path"]: entry for entry in reconciled}
    return [{key: lookup[path][key] for key in
             ("kind", "name", "path", "parent_path")}
            | ({"id": lookup[path]["id"]} if "id" in lookup[path] else {})
            for path in new_paths]


def finish_group(state, entries, by_id):
    if state["active"] is None:
        raise ValueError("nothing is active")
    frame = state["active"]
    entry = by_id[frame["target"]]
    direct = sorted(child["path"] for child in entries
                    if child["parent_path"] == entry["path"])
    if not direct:
        raise ValueError(f"group must contain a direct group or part before completion: {entry['path']}")
    record = state["nodes"][entry["path"]]
    record.update(status="done", completed_by=frame["route"],
                  completed_children=direct)
    state["active"] = None
    return {
        "action": "completed", "route": frame["route"],
        "covered_ids": [entry["id"]],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", required=True, type=Path)
    parser.add_argument("--state", required=True, type=Path)
    commands = parser.add_subparsers(dest="command", required=True)
    init = commands.add_parser("init")
    init.add_argument("--root-key", required=True)
    init.add_argument("--child-edge", action="append", required=True)
    init.add_argument("--terminal-type", action="append", default=[])
    init.add_argument("--dispatch-type", action="append", required=True)
    init.add_argument("--priority-keyword", action="append", default=[])
    init.add_argument("--route-name", action="append", default=[])
    commands.add_parser("next")
    expand_command = commands.add_parser("expand")
    expand_command.add_argument("--parent", required=True)
    expand_command.add_argument("--patch", required=True, type=Path)
    checkpoint = commands.add_parser("checkpoint")
    checkpoint.add_argument("--pointer", required=True)
    commands.add_parser("complete")
    reopen = commands.add_parser("reopen")
    reopen.add_argument("--target", required=True)
    args = parser.parse_args()
    try:
        if args.file.resolve() == args.state.resolve():
            raise ValueError("tree and state must use separate JSON files")
        if args.file.parent.resolve() != args.state.parent.resolve():
            raise ValueError("state JSON must be beside the tree JSON")
        document = read_json(args.file)
        tree_changed = False
        state_changed = False
        if args.command == "init":
            edges = dict(pair(value, "child edge") for value in args.child_edge)
            if len(edges) != len(args.child_edge):
                raise ValueError("child edge keys must be unique")
            routes = {kind: [] for kind in args.dispatch_type}
            for value in args.route_name:
                kind, name = pair(value, "route name")
                if kind not in routes:
                    raise ValueError(f"route type is not declared: {kind}")
                routes[kind].append(name)
            tree = {
                "root_key": args.root_key, "child_edges": edges,
                "terminal_types": args.terminal_type,
                "dispatch_types": args.dispatch_type,
            }
            validate_spec(tree, routes, args.priority_keyword)
            if args.state.exists():
                state = read_json(args.state)
                if (state.get("tree") != tree or state.get("routes") != routes
                        or state.get("priority_keywords") != args.priority_keyword):
                    raise ValueError("saved state uses another tree specification or route table")
                result_action = "already_initialized"
            else:
                state = make_state(tree, routes, args.priority_keyword)
                result_action = "initialized"
                state_changed = True
            entries, by_id, reconciled = reconcile(document, state)
            state_changed |= reconciled
            result = {"action": result_action, "groups": len(by_id)}
        else:
            state = read_json(args.state)
            entries, by_id, state_changed = reconcile(document, state)
            if args.command == "next":
                result, changed = select_next(document, state, entries, by_id)
                state_changed |= changed
            elif args.command == "expand":
                patch = read_json(args.patch)
                added = expand(document, state, entries, by_id, args.parent, patch)
                tree_changed = True
                state_changed = True
                result = {
                    "action": "expanded", "parent": args.parent,
                    "added": len(added), "nodes": added,
                }
            elif args.command == "checkpoint":
                if state["active"] is None:
                    raise ValueError("checkpoint requires an active flow")
                state["active"]["pointer"] = args.pointer
                state_changed = True
                result = {"action": "checkpointed", "pointer": args.pointer}
            elif args.command == "reopen":
                if state["active"] is not None:
                    raise ValueError("reopen requires no active target")
                target = by_id.get(args.target)
                if target is None:
                    target = next((item for item in entries
                                   if item.get("id") and item["path"] == args.target), None)
                if target is None or target["status"] != "done":
                    raise ValueError("reopen requires a completed dispatched node")
                record = state["nodes"][target["path"]]
                record["status"] = "pending"
                record.pop("completed_by", None)
                record.pop("completed_children", None)
                state_changed = True
                result = {"action": "reopened", "target": public(target)}
            else:
                result = finish_group(state, entries, by_id)
                state_changed = True
        if tree_changed:
            save_json(args.file, document)
        if state_changed:
            save_json(args.state, state)
        print(json.dumps(result, ensure_ascii=False))
    except (ValueError, KeyError, OSError, json.JSONDecodeError) as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
