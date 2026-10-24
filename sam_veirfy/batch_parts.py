"""Run every archived logical part with fixed name-derived SAM 3 text prompts."""
import local_env
import argparse
import hashlib
import json
import math
import re
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageDraw, ImageFont
from transformers import Sam3Model, Sam3Processor

REPO = local_env.ROOT.parent
DEMO = REPO / "demos/pink-elf"
LABELS = {
    "face_base": ("face", "脸底"),
    "upper_eyelid": ("upper eyelid", "上眼睑"),
    "lower_eyelid": ("lower eyelid", "下眼睑"),
    "sclera": ("white of eye", "眼白"),
    "iris": ("iris", "虹膜"),
    "highlight": ("eye highlight", "眼睛高光"),
    "eyelid_crease": ("eyelid crease", "眼睑褶线"),
    "eyebrow": ("eyebrow", "眉毛"), "ear": ("elf ear", "精灵耳"),
    "nose": ("nose", "鼻子"),
    "upper_lip": ("upper lip", "上唇"), "lower_lip": ("lower lip", "下唇"),
    "mouth_interior": ("mouth interior", "口腔内部"),
    "upper_teeth": ("upper teeth", "上齿"), "lower_teeth": ("lower teeth", "下齿"),
    "tongue": ("tongue", "舌头"), "bangs": ("bangs", "刘海"),
    "front_side_hair": ("front side hair", "前侧发"),
    "side_hair": ("side hair", "侧发"),
    "cap": ("back hair crown", "后发顶盖"),
    "long": ("long back hair", "长后发"),
    "ahoge": ("ahoge hair tuft", "呆毛"),
    "earring": ("earring", "耳饰"), "neck": ("neck", "脖子"),
    "torso": ("torso", "躯干"), "breast": ("breast", "胸部"),
    "upper_arm": ("upper arm", "上臂"), "forearm": ("forearm", "前臂"),
    "palm": ("palm", "手掌"), "thumb": ("thumb", "拇指"),
    "index_finger": ("index finger", "食指"),
    "middle_finger": ("middle finger", "中指"),
    "ring_finger": ("ring finger", "无名指"),
    "little_finger": ("little finger", "小指"),
    "pelvis": ("pelvis", "骨盆"), "leg": ("leg", "腿"),
    "foot": ("boot", "短靴"),
    "large_diamond_gem": ("large diamond gemstone on boot", "靴上大菱形宝石"),
    "small_diamond_charm": ("small diamond charm on boot", "靴上小菱形坠饰"),
    "round_bead": ("round bead on boot", "靴上圆珠"),
    "flexible_connector": ("gemstone chain connector on boot", "靴上柔性连接链"),
    "boot_gem": ("diamond gemstone on boot", "靴上宝石"),
    "boot_flower_ornament": ("flower ornament on boot", "靴上花叶饰簇"),
    "halter_bodice": ("halter dress bodice", "挂脖衣身"),
    "front_drape": ("front skirt drape", "前裙垂布"),
    "skirt_panel": ("skirt panel", "外裙片"),
    "puff_sleeve": ("puff sleeve", "泡泡袖"),
    "knot_and_loops": ("bow knot and loops", "腰蝴蝶结结心与结环"),
    "short_tail": ("short bow ribbon tail", "腰蝴蝶结短尾"),
    "long_tail": ("long bow ribbon tail", "腰蝴蝶结长尾"),
    "chest_pendant": ("chest pendant", "胸前吊坠"),
    "floral_skirt_undertrim": ("floral skirt hem trim", "裙底花簇饰边"),
    "trailing_skirt": ("long trailing skirt", "后裙长垂布"),
    "short_drape": ("short trailing skirt drape", "后裙短垂布"),
    "spiral_train": ("spiral skirt train", "后裙螺旋长尾"),
}
FONT_FILE = "C:/Windows/Fonts/msyh.ttc"
FONT = ImageFont.truetype(FONT_FILE, 21)
SMALL = ImageFont.truetype(FONT_FILE, 16)


def sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def parts():
    rows = []
    for family, folder in [("人物", "part-layering"), ("衣服", "clothing-part-layering")]:
        def walk(nodes):
            for node in nodes:
                if node.get("groups"):
                    walk(node["groups"])
                else:
                    part_id = node["id"]
                    tokens = part_id.split("/")
                    leaf = tokens[-1]
                    base = re.sub(r"^(left|right)_", "", leaf)
                    base = re.sub(r"(_image)?_(left|right)$", "", base)
                    english, chinese = LABELS[base]
                    image_side = re.search(r"image_(left|right)", part_id)
                    side = next((direction for direction in ["left", "right"]
                                 if any(direction in token.split("_") for token in tokens)), None)
                    if image_side:
                        side = image_side.group(1)
                        prompt = f"{english} on the {side} side"
                        label = ("画面左" if side == "left" else "画面右") + chinese
                    elif side:
                        prompt = f"{side} {english}"
                        label = ("角色左" if side == "left" else "角色右") + chinese
                    else:
                        prompt, label = english, chinese
                    rows.append({"index": len(rows) + 1, "id": part_id,
                                 "key": folder + "/" + part_id,
                                 "family": family, "group": tokens[0] if family == "人物" else "clothing",
                                 "label": label, "prompt": prompt,
                                 "groups_file": str((DEMO / folder / "groups.json").relative_to(REPO))})
        walk(json.loads((DEMO / folder / "groups.json").read_text(encoding="utf-8"))["groups"])
    assert len(rows) == 79
    assert len({row["key"] for row in rows}) == 79
    return rows


def checker(size):
    canvas = Image.new("RGB", size, "#f3f5f7")
    draw = ImageDraw.Draw(canvas)
    for y in range(0, size[1], 16):
        for x in range(0, size[0], 16):
            if (x // 16 + y // 16) % 2:
                draw.rectangle((x, y, x + 15, y + 15), fill="#e2e7ed")
    return canvas


def fit_panel(image, size=(282, 405), transparent=False):
    image = image.copy()
    image.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = checker(size) if transparent else Image.new("RGB", size, "white")
    xy = ((size[0] - image.width) // 2, (size[1] - image.height) // 2)
    canvas.paste(image, xy, image.getchannel("A") if image.mode == "RGBA" else None)
    return canvas


def make_card(row, overlay, cutout, mask_image, bbox, path):
    card = Image.new("RGB", (900, 550), "#f7f9fc")
    draw = ImageDraw.Draw(card)
    draw.text((16, 10), f'{row["index"]:02d}  {row["label"]}', font=FONT, fill="#17243a")
    draw.text((16, 40), row["id"], font=SMALL, fill="#53627b")
    draw.text((16, 65), f'提示词: {row["prompt"]}', font=SMALL, fill="#53627b")
    status = f'{row["count"]} 个实例 / 最高分 {row["max_score"]:.3f}' if row["count"] else "零检出 · 原始输出保留"
    draw.text((16, 92), status, font=SMALL, fill="#b33939" if not row["count"] else "#176e54")
    for x, label in [(12, "整图定位叠加"), (309, "提取结果 · 自动放大"), (606, "原始二值蒙版 · 同区域")]:
        draw.text((x + 4, 122), label, font=SMALL, fill="#334860")
    card.paste(fit_panel(overlay), (12, 146))
    if bbox:
        card.paste(fit_panel(cutout.crop(bbox), transparent=True), (309, 146))
        card.paste(fit_panel(mask_image.crop(bbox)), (606, 146))
    else:
        draw.text((355, 325), "未检出", font=FONT, fill="#b33939")
        card.paste(Image.new("RGB", (282, 405), "black"), (606, 146))
    card.save(path, quality=92)


def make_pages(root, rows, case):
    selected = [row for row in rows if row["case"] == case]
    pages = []
    for start in range(0, len(selected), 8):
        subset = selected[start:start + 8]
        page = Image.new("RGB", (1800, 80 + math.ceil(len(subset) / 2) * 550), "#dbe3ed")
        draw = ImageDraw.Draw(page)
        title = "对应分件参考整图" if case == "references" else "新版最终穿戴合成整图"
        draw.text((20, 18), f'SAM 3 · {title} · {start + 1:02d}–{start + len(subset):02d} / 79', font=FONT, fill="#17243a")
        for index, row in enumerate(subset):
            with Image.open(root / row["card"]) as card:
                page.paste(card, ((index % 2) * 900, 80 + (index // 2) * 550))
        name = f"pages/{case}-{len(pages) + 1:02d}.jpg"
        page.save(root / name, quality=92)
        pages.append(name)
    return pages


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", default="elf-parts-e271df62")
    parser.add_argument("--threshold", type=float, default=0.5)
    args = parser.parse_args()
    if not re.fullmatch(r"[\w-]+", args.run) or not 0 <= args.threshold <= 1:
        parser.error("Invalid run name or threshold")
    root = local_env.ROOT / "outputs" / args.run
    root.mkdir(parents=True, exist_ok=False)
    (root / "pages").mkdir()
    (root / "sources").mkdir()
    categories = parts()
    source_paths = {
        "body": DEMO / "part-layering/references/base-subject.png",
        "clothes": DEMO / "clothing-part-layering/references/clothing.png",
        "assembled": DEMO / "shadow/mask/step01/character-shadowed.png",
    }
    plan = {
        "git_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "model_id": "facebook/sam3", "threshold": args.threshold, "mask_threshold": 0.5,
        "prompt_rule": "Fixed short English noun phrase from part name and parent identity; retain side labels. Identical phrase across both input cases. No prompt retries, boxes, points, SVG clipping or mask repair.",
        "part_count": len(categories), "query_count": len(categories) * 2,
        "sources": {key: {"path": str(path.relative_to(REPO)), "sha256": sha(path)} for key, path in source_paths.items()},
        "groups_sha256": {folder: sha(DEMO / folder / "groups.json") for folder in ["part-layering", "clothing-part-layering"]},
        "parts": categories,
    }
    (root / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    torch.set_float32_matmul_precision("high")
    model, loading = Sam3Model.from_pretrained(local_env.ROOT / "models/sam3", local_files_only=True,
                                              attn_implementation="sdpa", output_loading_info=True)
    assert not loading.get("missing_keys") and not loading.get("mismatched_keys")
    model = model.to("cuda").eval()
    processor = Sam3Processor.from_pretrained(local_env.ROOT / "models/sam3", local_files_only=True)
    images, rgba_sources, features = {}, {}, {}
    results = []
    with torch.inference_mode(), torch.autocast("cuda", dtype=torch.bfloat16):
        for key, path in source_paths.items():
            rgba = Image.open(path).convert("RGBA")
            image = Image.alpha_composite(Image.new("RGBA", rgba.size, "white"), rgba).convert("RGB")
            image.save(root / "sources" / f"{key}.png")
            rgba_sources[key], images[key] = rgba, image
            inputs = processor(images=image, return_tensors="pt").to("cuda")
            features[key] = model.get_vision_features(pixel_values=inputs.pixel_values)
            del inputs
        for case in ["references", "assembled"]:
            for category in categories:
                key = "assembled" if case == "assembled" else "body" if category["family"] == "人物" else "clothes"
                image, rgba = images[key], rgba_sources[key]
                folder = root / case / f'{category["index"]:02d}'
                folder.mkdir(parents=True)
                text = processor(text=category["prompt"], return_tensors="pt").to("cuda")
                torch.cuda.reset_peak_memory_stats()
                started = time.perf_counter()
                outputs = model(vision_embeds=features[key], **text)
                result = processor.post_process_instance_segmentation(
                    outputs, threshold=args.threshold, mask_threshold=0.5,
                    target_sizes=[(image.height, image.width)],
                )[0]
                torch.cuda.synchronize()
                seconds = time.perf_counter() - started
                masks = result["masks"].detach().cpu().numpy().astype(bool)
                scores = result["scores"].float().cpu().tolist()
                boxes = result["boxes"].float().cpu().tolist()
                union = np.zeros((image.height, image.width), dtype=bool)
                instances = []
                for index, (mask, score, box) in enumerate(zip(masks, scores, boxes)):
                    mask = mask.reshape(image.height, image.width)
                    union |= mask
                    filename = f"instance-{index + 1:02d}.png"
                    Image.fromarray(mask.astype(np.uint8) * 255).save(folder / filename)
                    instances.append({"file": str((folder / filename).relative_to(root)).replace("\\", "/"),
                                      "score": score, "box_xyxy": box, "area_pixels": int(mask.sum())})
                mask_image = Image.fromarray(union.astype(np.uint8) * 255)
                mask_image.save(folder / "mask.png")
                original = np.asarray(rgba).copy()
                original[:, :, 3] = original[:, :, 3] * union
                cutout = Image.fromarray(original)
                cutout.save(folder / "cutout.png")
                pixels = np.asarray(image).copy()
                pixels[union] = (pixels[union] * 0.5 + np.array([40, 160, 255]) * 0.5).astype(np.uint8)
                overlay = Image.fromarray(pixels)
                overlay.save(folder / "overlay.jpg", quality=93)
                bbox = mask_image.getbbox()
                if bbox:
                    left, top, right, bottom = bbox
                    pad = max(12, int(max(right - left, bottom - top) * 0.08))
                    bbox = (max(0, left - pad), max(0, top - pad), min(image.width, right + pad), min(image.height, bottom + pad))
                row = dict(category, case=case, source=key, count=len(instances),
                           max_score=max(scores, default=0.0), seconds=round(seconds, 4),
                           peak_allocated_bytes=torch.cuda.max_memory_allocated(),
                           area_pixels=int(union.sum()), instances=instances,
                           crop_bbox=bbox, status="detected" if union.any() else "empty",
                           card=f'{case}/{category["index"]:02d}/card.jpg',
                           mask=f'{case}/{category["index"]:02d}/mask.png',
                           cutout=f'{case}/{category["index"]:02d}/cutout.png',
                           overlay=f'{case}/{category["index"]:02d}/overlay.jpg')
                make_card(row, overlay, cutout, mask_image, bbox, root / row["card"])
                (folder / "result.json").write_text(json.dumps(row, ensure_ascii=False, indent=2), encoding="utf-8")
                results.append(row)
                print(f'{len(results)}/158 {case} {category["id"]}: {row["count"]} instances, score {row["max_score"]:.3f}', flush=True)
                del outputs, result, text
    page_paths = {case: make_pages(root, results, case) for case in ["references", "assembled"]}
    summary = {case: {"total": len(subset := [row for row in results if row["case"] == case]),
                      "detected": sum(row["status"] == "detected" for row in subset),
                      "empty": sum(row["status"] == "empty" for row in subset),
                      "multi_instance": sum(row["count"] > 1 for row in subset)}
               for case in ["references", "assembled"]}
    report = dict(plan=plan, results=results, pages=page_paths, summary=summary,
                  completed_at=datetime.now(timezone.utc).isoformat(),
                  gpu=torch.cuda.get_device_name(0), missing_weight_keys=sorted(loading.get("missing_keys", [])),
                  unexpected_weight_keys_count=len(loading.get("unexpected_keys", [])))
    (root / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    template = (local_env.ROOT / "gallery_template.html").read_text(encoding="utf-8")
    (root / "index.html").write_text(template.replace("__REPORT_JSON__", json.dumps(report, ensure_ascii=False).replace("<", "\\u003c")), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False), flush=True)
    print(f"Gallery: {root / 'index.html'}", flush=True)


if __name__ == "__main__":
    main()
