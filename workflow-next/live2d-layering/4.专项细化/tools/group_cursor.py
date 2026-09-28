"""Run a bounded cursor over a configurable JSON n-ary tree.

The tree document contains only structure. A sibling JSON file stores stable
node IDs, completion states, the active call stack, and the workflow pointer.
Each next operation examines the current finite tree and returns at most one
task. The orchestrator owns workers, outputs, reviews, and call decisions.
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


def validate_spec(tree, routes):
    if not isinstance(tree, dict) or not isinstance(routes, dict):
        raise ValueError("tree specification and routes must be objects")
    root = tree.get("root_key")
    edges = tree.get("child_edges")
    terminals = tree.get("terminal_types")
    if (not isinstance(root, str) or not NAME.fullmatch(root)
            or not isinstance(edges, dict) or root not in edges
            or not edges or any(not NAME.fullmatch(k) or not isinstance(v, str)
                                 or not NAME.fullmatch(v) for k, v in edges.items())
            or not isinstance(terminals, list)
            or any(not isinstance(v, str) for v in terminals)
            or len(terminals) != len(set(terminals))
            or not set(terminals) <= set(edges.values())):
        raise ValueError("invalid tree root, child edges, or terminal types")
    if set(routes) != set(edges.values()):
        raise ValueError("routes must contain every declared node type")
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


def make_state(tree, routes):
    return {
        "version": 1, "tree": tree, "routes": routes,
        "next_id": 1, "nodes": {}, "stack": [],
    }


def reconcile(document, state):
    if (not isinstance(state, dict) or state.get("version") != 1
            or not isinstance(state.get("next_id"), int) or state["next_id"] < 1
            or not isinstance(state.get("nodes"), dict)
            or not isinstance(state.get("stack"), list)):
        raise ValueError("invalid dispatch state")
    validate_spec(state.get("tree"), state.get("routes"))
    entries = enumerate_tree(document, state["tree"])
    current_paths = {entry["path"] for entry in entries}
    missing = set(state["nodes"]) - current_paths
    if missing:
        raise ValueError(f"previous nodes were removed or renamed: {sorted(missing)[:3]}")
    changed = False
    ids = set()
    for entry in entries:
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
    if ids and state["next_id"] <= max(int(node_id[1:]) for node_id in ids):
        raise ValueError("next_id collides with an existing node")
    by_id = {entry["id"]: entry for entry in entries}
    active = set()
    for frame in state["stack"]:
        if (not isinstance(frame, dict) or not isinstance(frame.get("targets"), list)
                or not frame["targets"] or not isinstance(frame.get("route"), str)):
            raise ValueError("invalid call stack")
        for node_id in frame["targets"]:
            if node_id not in by_id or node_id in active:
                raise ValueError(f"invalid or repeated active target: {node_id}")
            if state["nodes"][by_id[node_id]["path"]]["status"] != "active":
                raise ValueError(f"call stack target is not active: {node_id}")
            active.add(node_id)
    marked = {entry["id"] for entry in entries
              if state["nodes"][entry["path"]]["status"] == "active"}
    if marked != active:
        raise ValueError("active nodes and call stack disagree")
    return entries, by_id, changed


def descendants(entries, node_id):
    by_path = {entry["path"]: entry for entry in entries}
    by_id = {entry["id"]: entry for entry in entries}
    result = []
    target_path = by_id[node_id]["path"]
    for entry in entries:
        cursor = entry["path"]
        while cursor is not None:
            if cursor == target_path:
                result.append(entry)
                break
            cursor = by_path[cursor]["parent_path"]
    return result


def children(node, edges):
    return [child for edge in edges for child in node.get(edge, [])]


def public(entry):
    return {key: entry[key] for key in ("id", "kind", "name", "path", "parent_path")}


def frame_result(frame, by_id, action):
    return {
        "action": action, "route": frame["route"],
        "targets": [public(by_id[node_id]) for node_id in frame["targets"]],
        "pointer": frame.get("pointer"),
    }


def select_next(document, state, entries, by_id):
    if state["stack"]:
        return frame_result(state["stack"][-1], by_id, "active"), False
    edges = state["tree"]["child_edges"]
    routes = state["routes"]
    changed = False
    for entry in reversed(entries):
        record = state["nodes"][entry["path"]]
        members = children(entry["node"], edges)
        if (record["status"] == "pending" and members
                and entry["name"] not in routes[entry["kind"]]
                and all(state["nodes"][next_item["path"]]["status"] == "done"
                        for next_item in entries
                        if next_item["parent_path"] == entry["path"])):
            record.update(status="done", completed_by="children")
            changed = True
    for entry in entries:
        record = state["nodes"][entry["path"]]
        if record["status"] != "pending":
            continue
        if entry["name"] in routes[entry["kind"]]:
            route = f"{entry['kind']}:{entry['name']}"
        elif children(entry["node"], edges):
            continue
        else:
            route = "generic"
        record["status"] = "active"
        frame = {"targets": [entry["id"]], "route": route, "pointer": None}
        state["stack"].append(frame)
        return frame_result(frame, by_id, "run"), True
    if any(state["nodes"][entry["path"]]["status"] != "done" for entry in entries):
        raise ValueError("pending nodes remain without an executable route")
    return {"action": "done"}, changed


def expand(document, state, entries, by_id, parent_id, patch):
    stack = state["stack"]
    if not stack or parent_id not in by_id:
        raise ValueError("expand requires a node in an active scope")
    scope = {entry["id"] for target in stack[-1]["targets"]
             for entry in descendants(entries, target)}
    parent_entry = by_id[parent_id]
    if parent_id not in scope:
        raise ValueError("expand parent is outside the active scope")
    if (parent_entry["kind"] in state["tree"]["terminal_types"]
            or state["nodes"][parent_entry["path"]]["status"] == "done"):
        raise ValueError("cannot expand a terminal or completed node")
    edges = state["tree"]["child_edges"]
    if (not isinstance(patch, dict) or not patch or set(patch) - set(edges)
            or any(not isinstance(value, list) for value in patch.values())
            or not any(patch.values())):
        raise ValueError("patch must add nodes through declared child edges")
    before = set(state["nodes"])
    parent = parent_entry["node"]
    for edge in edges:
        if edge in patch:
            parent.setdefault(edge, []).extend(copy.deepcopy(patch[edge]))
    new_entries = enumerate_tree(document, state["tree"])
    new_paths = [entry["path"] for entry in new_entries if entry["path"] not in before]
    reconciled, _, _ = reconcile(document, state)
    lookup = {entry["path"]: entry for entry in reconciled}
    return [public(lookup[path]) for path in new_paths]


def available_routes(state):
    result = {"generic"}
    for kind, names in state["routes"].items():
        result.update(f"{kind}:{name}" for name in names)
    return result


def select_call_targets(document, state, entries, by_id, match_node, remaining):
    if not state["stack"]:
        raise ValueError("selection requires an active parent flow")
    scope = {entry["id"] for target in state["stack"][-1]["targets"]
             for entry in descendants(entries, target)}
    current = set(state["stack"][-1]["targets"])
    candidates = [entry for entry in entries
                  if entry["id"] in scope and entry["id"] not in current
                  and state["nodes"][entry["path"]]["status"] == "pending"]
    if match_node:
        kind, name = pair(match_node, "match node")
        matches = [entry for entry in candidates
                   if entry["kind"] == kind and entry["name"] == name]
        matched = {entry["path"] for entry in matches}
        by_path = {entry["path"]: entry for entry in entries}
        selected = []
        for entry in matches:
            parent = entry["parent_path"]
            while parent is not None and parent not in matched:
                parent = by_path[parent]["parent_path"]
            if parent is None:
                selected.append(entry["id"])
        return selected
    if remaining:
        edges = state["tree"]["child_edges"]
        return [entry["id"] for entry in candidates
                if not children(entry["node"], edges)]
    raise ValueError("choose a call target selector")


def start_call(state, entries, by_id, target_ids, route):
    if not state["stack"]:
        raise ValueError("call requires an active parent flow")
    if route not in available_routes(state):
        raise ValueError(f"call route is not registered: {route}")
    if not target_ids or len(target_ids) != len(set(target_ids)):
        raise ValueError("call targets must be unique")
    scope = {entry["id"] for target in state["stack"][-1]["targets"]
             for entry in descendants(entries, target)}
    pending = []
    for node_id in target_ids:
        if node_id not in by_id or node_id not in scope:
            raise ValueError(f"call target is outside the active scope: {node_id}")
        status = state["nodes"][by_id[node_id]["path"]]["status"]
        if status == "active":
            raise ValueError(f"call target is already active: {node_id}")
        if status == "pending":
            pending.append(node_id)
    for first in pending:
        descendants_of_first = {entry["id"] for entry in descendants(entries, first)}
        if any(second != first and second in descendants_of_first for second in pending):
            raise ValueError("one call cannot target ancestor and descendant together")
    if not pending:
        return {"action": "skipped", "reason": "targets already done"}, False
    for node_id in pending:
        state["nodes"][by_id[node_id]["path"]]["status"] = "active"
    frame = {"targets": pending, "route": route, "pointer": None}
    state["stack"].append(frame)
    return frame_result(frame, by_id, "run"), True


def finish_call(state, entries, by_id, coverage):
    if not state["stack"]:
        raise ValueError("nothing is active")
    frame = state["stack"][-1]
    covered = []
    for node_id in frame["targets"]:
        covered.extend(descendants(entries, node_id) if coverage == "subtree"
                       else [by_id[node_id]])
    for entry in covered:
        record = state["nodes"][entry["path"]]
        if record["status"] == "active" and entry["id"] not in frame["targets"]:
            raise ValueError("cannot complete another active flow")
        if record["status"] != "done":
            record.update(status="done", completed_by=frame["route"])
    state["stack"].pop()
    return {
        "action": "completed", "route": frame["route"],
        "covered_ids": [entry["id"] for entry in covered],
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
    init.add_argument("--route-name", action="append", default=[])
    commands.add_parser("next")
    expand_command = commands.add_parser("expand")
    expand_command.add_argument("--parent", required=True)
    expand_command.add_argument("--patch", required=True, type=Path)
    call = commands.add_parser("call")
    selector = call.add_mutually_exclusive_group(required=True)
    selector.add_argument("--targets", nargs="+")
    selector.add_argument("--match-node")
    selector.add_argument("--remaining", action="store_true")
    call.add_argument("--route", required=True)
    checkpoint = commands.add_parser("checkpoint")
    checkpoint.add_argument("--pointer", required=True)
    complete = commands.add_parser("complete")
    complete.add_argument("--coverage", choices=("node", "subtree"), required=True)
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
            routes = {kind: [] for kind in edges.values()}
            for value in args.route_name:
                kind, name = pair(value, "route name")
                if kind not in routes:
                    raise ValueError(f"route type is not declared: {kind}")
                routes[kind].append(name)
            tree = {
                "root_key": args.root_key, "child_edges": edges,
                "terminal_types": args.terminal_type,
            }
            validate_spec(tree, routes)
            if args.state.exists():
                state = read_json(args.state)
                if state.get("tree") != tree or state.get("routes") != routes:
                    raise ValueError("saved state uses another tree specification or route table")
                result_action = "already_initialized"
            else:
                state = make_state(tree, routes)
                result_action = "initialized"
                state_changed = True
            entries, by_id, reconciled = reconcile(document, state)
            state_changed |= reconciled
            result = {"action": result_action, "nodes": len(entries)}
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
            elif args.command == "call":
                targets = (args.targets if args.targets is not None else
                           select_call_targets(document, state, entries, by_id,
                                               args.match_node, args.remaining))
                if not targets and args.targets is None:
                    result = {"action": "skipped", "reason": "no matching pending targets"}
                else:
                    result, changed = start_call(state, entries, by_id, targets, args.route)
                    state_changed |= changed
            elif args.command == "checkpoint":
                if not state["stack"]:
                    raise ValueError("checkpoint requires an active flow")
                state["stack"][-1]["pointer"] = args.pointer
                state_changed = True
                result = {"action": "checkpointed", "pointer": args.pointer}
            else:
                result = finish_call(state, entries, by_id, args.coverage)
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
