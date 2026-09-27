"""Audit the tutorial-input cleanup against the saved pre-edit baseline.

This verifies configuration, retained instructions and existing art, not the
pixel identity of a future stochastic drawing run. It is not a workflow node.
"""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re


AUDIT = Path(__file__).resolve().parent
ROOT = AUDIT.parents[1]
SCOPES = [ROOT / "workflows", ROOT / "workflow_clothing"]
state = json.loads((AUDIT / "before.json").read_text(encoding="utf-8"))
checks = []


def check(category, target, ok, detail):
    checks.append({"category": category, "target": target, "pass": bool(ok), "detail": detail})


def digest(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


# Every pre-existing instruction/configuration is compared with the baseline.
# YAML may only lose the inventoried tutorial fields; prompt edits may only
# replace the recorded tutorial-reading/attribution phrases.
for rel, before in state["texts"].items():
    expected = before
    removal = state["yaml_removals"].get(rel)
    if removal:
        removed = set(removal["removed_lines"])
        expected = "".join(line for number, line in enumerate(before.splitlines(keepends=True), 1) if number not in removed)
    for edit in state["prompt_replacements"].get(rel, []):
        assert expected.count(edit["old"]) == 1, rel
        expected = expected.replace(edit["old"], edit["new"])
    path = ROOT / rel
    actual = path.read_text(encoding="utf-8") if path.is_file() else None
    check("配置与正文差异", rel, actual == expected,
          "仅移除已列出的教程字段/阅读指令，其他内容保持" if removal or rel in state["prompt_replacements"] else "与本次修改前一致")

for scope in SCOPES:
    for path in scope.rglob("*.yaml"):
        rel = path.relative_to(ROOT).as_posix()
        content = path.read_text(encoding="utf-8")
        check("运行依赖", rel, "live2d-tutorial-text" not in content and not re.search(r"\b\w*tutorial\w*\b", content), "不再挂载或转交教程")
        for line in content.splitlines():
            match = re.fullmatch(r"\s+asset:\s+(.+?)\s*", line)
            if not match:
                continue
            value = match.group(1).split(" #", 1)[0].strip().strip("\"'")
            asset = (path.parent / value).resolve()
            check("实际工具与素材", rel + " -> " + value,
                  asset.is_file() and any(asset.is_relative_to(allowed) for allowed in SCOPES),
                  "引用可解析，工具/视觉素材位于两个工作流目录内")
    for path in scope.rglob("*提示词*.txt"):
        content = path.read_text(encoding="utf-8")
        check("提示词自足", path.relative_to(ROOT).as_posix(),
              "live2d-tutorial-text" not in content and "tutorial" not in content and "教程" not in content,
              "不再要求绘制者或 reviewer 阅读外部教程")


# Locate the concrete drawing rules inside every affected node's own prompt.
# These are separate from the byte/text preservation checks above.
def required_rules(rel):
    if rel.startswith("workflow_clothing/"):
        if "/1.衣装" in rel:
            return ["X 左右转向", "Y 俯仰", "短袖", "长袖", "多层裙摆", "透明底布", "软连接", "硬坠", "source/target"]
        if "/3.1." in rel:
            return ["后片放身体后", "袖根完整", "透明人工拼接口", "完整可编辑影形", "clipPath", "construction-guide"]
        if "/3.2." in rel:
            return ["隐藏内搭", "侧/背/内面", "固定点", "透明拼接", "投影引用", "status: pass"]
        return ["真实双层布料", "重复 alpha", "data-source-id/data-target-id", "完整可编辑几何", "visibility_dependencies"]
    if "/hair/2." in rel:
        return ["根部", "走向", "末梢", "独立", "层序", "完整", "construction-guide"]
    if "/body/1." in rel:
        return ["颈根", "肩臂接口", "腰胯接口", "后方躯干", "小范围搭接"]
    if "/mouth/1." in rel:
        return ["mouth_upper", "mouth_lower", "mouth_inside", "teeth_upper", "teeth_lower", "tongue", "闭嘴", "完整"]
    if "/eyes/2." in rel:
        return ["眼眶积泪", "泪滴", "mask", "眼白", 'data-mirror="exclude"']
    if "/face/5." in rel:
        return ["汗珠", "完整滴体", "mask", "干净皮肤", "eyes"]
    if "/arms/4." in rel:
        return ["palm", "thumb", "index", "middle", "ring", "pinky", "腕口", "隐藏根部"]
    if "/lower_body/2." in rel:
        return ["骨盆上口", "完整根部", "完整肤色", "完整影形", "clipPath", "data-source-id/data-target-id"]
    if "/lower_body/3." in rel:
        return ["腿根", "膝盖", "踝", "足部", "完整影形", "clipPath", "data-source-id/data-target-id"]
    if "/arms/2." in rel:
        return ["肩根", "肘", "腕", "完整底形", "完整可编辑影形", "clipPath"]
    if any("/" + kind + "/1." in rel for kind in ["physics_details", "special_parts", "generic"]):
        return ["独立变形", "绘制顺序", "显隐", "材质", "裁切", "角度X", "侧面", "背面", "固定点"]
    if "/3.完整线稿与关联投影/" in rel:
        return ["隐藏根部", "完整影形", "data-source-id/data-target-id", "clipPath", "外层裁切内层模糊"]
    # Remaining affected nodes are material/effect tasks. Their own prompts
    # already specify receiver ownership, full shadow geometry and clipping.
    return ["data-source", "data-target", "完整", "clipPath", "高光"]


affected = sorted(set(state["yaml_removals"]) | set(state["prior_clothing_removals"]))
rows = []
for rel in affected:
    prompt = (ROOT / rel).parent / "提示词.txt"
    text = prompt.read_text(encoding="utf-8")
    terms = required_rules(rel)
    missing = [term for term in terms if term not in text]
    check("逐节点规则定位", rel, not missing, "已定位：" + "、".join(terms) if not missing else "缺少定位词：" + "、".join(missing))
    removal = state["yaml_removals"].get(rel)
    keys = [item["key"] for item in removal["bindings"]] if removal else state["prior_clothing_removals"][rel]
    config = (ROOT / rel).read_text(encoding="utf-8")
    for key in keys:
        check("逐字段清理", rel + " / " + key,
              not re.search(r"^\s*" + re.escape(key) + r":", config, re.M) and "inputs." + key not in config,
              "输入字段及本节点 review 转交均已移除")
    rows.append((rel, len(keys), len(removal["review_forwards"]) if removal else 0, not missing))

print("Configuration and per-node checks finished; comparing saved art...", flush=True)
for rel, expected in state["art"].items():
    path = ROOT / rel
    check("既有图稿", rel, path.is_file() and digest(path) == expected, "SVG/PNG 文件内容与本次修改前逐字节一致")

failed = [item for item in checks if not item["pass"]]
counts = Counter(item["category"] for item in checks)
report = [
    "# 教程运行依赖清理：逐项自测",
    "",
    "## 修改范围与能证明的结论",
    "",
    "- 新衣装流程 4 个节点移除 12 处教程输入；旧工作流 23 个节点移除 43 处教程输入及 7 处 reviewer 转交。",
    "- 旧工作流的具体操作段落、模型、节点顺序、分支、循环、输出与审查安排保留；只去掉教材挂载、阅读指令及相应来源措辞。",
    "- 衣装节点已将所需袖片、穿插、隐藏补形、透明接口和投影处理写在各自提示词里；未新增运行检查节点。",
    "- 所有剩余 asset 引用均检查存在性和目录边界；共享工具仍位于 workflows 内，实际 Milly 视觉素材保留。",
    "- 教程原文件和文档中的设计来源链接保留给维护者，不作为执行模型输入。",
    "- 本报告不证明重新调用模型会得到逐像素相同的画面；未重跑绘制模型，不能把配置检查、规则定位或旧图稿不变称为新提示词的绘制回归通过。",
    "",
    "## 自测结果",
    "",
    f"共 {len(checks)} 项检查，失败 {len(failed)} 项。",
    "",
    "| 检查类别 | 数量 | 失败 |",
    "| --- | ---: | ---: |",
]
for category, count in counts.items():
    report.append(f"| {category} | {count} | {sum(not item['pass'] for item in checks if item['category'] == category)} |")
report += ["", "## 每个受影响节点", "", "| 节点 | 移除教程输入 | 移除 review 转交 | 所需规则定位 |", "| --- | ---: | ---: | --- |"]
for rel, inputs, forwards, passed in rows:
    report.append(f"| {rel} | {inputs} | {forwards} | {'通过' if passed else '待处理'} |")
if failed:
    report += ["", "## 未通过项", ""]
    report += [f"- {item['target']}：{item['detail']}" for item in failed]
report += [
    "", "## 复核资料", "",
    "- before.json：本次编辑前的配置/提示词正文与既有 SVG/PNG 指纹；新衣装的 12 处挂载在此快照前已移除，另列其字段清单。",
    "- results.json：逐文件、逐字段和逐节点的检查结果。",
    "- self_test.py：仅用于本次维护的自测脚本，不参与绘制调度。", "",
]
(AUDIT / "results.json").write_text(json.dumps({"counts": dict(counts), "failed": len(failed), "checks": checks}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(AUDIT / "自测报告.md").write_text("\n".join(report), encoding="utf-8")
print(json.dumps({"checks": len(checks), "failed": len(failed), "counts": dict(counts)}, ensure_ascii=False), flush=True)
for item in failed:
    print(item["category"], item["target"], item["detail"])
raise SystemExit(bool(failed))
