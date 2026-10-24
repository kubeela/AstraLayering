"""Local SAM 3 image segmentation with text prompts and inspectable masks."""
import local_env
import argparse
import hashlib
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageDraw, ImageOps
from transformers import Sam3Model, Sam3Processor


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", type=Path)
    parser.add_argument("--prompts", nargs="+", default=["person", "hair", "face", "clothes"])
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--run", default=datetime.now().strftime("%Y%m%d-%H%M%S"))
    args = parser.parse_args()
    if not 0 <= args.threshold <= 1:
        parser.error("threshold must be between 0 and 1")
    if not re.fullmatch(r"[A-Za-z0-9_-]+", args.run):
        parser.error("run name must contain only letters, numbers, underscores or hyphens")
    root = local_env.ROOT
    model_dir = root / "models" / "sam3"
    if not (model_dir / "model.safetensors").is_file():
        parser.error("Weights missing: run download_model.py")
    output_dir = root / "outputs" / args.run
    output_dir.mkdir(parents=True, exist_ok=False)
    source_image = ImageOps.exif_transpose(Image.open(args.image)).convert("RGBA")
    background = Image.new("RGBA", source_image.size, (255, 255, 255, 255))
    image = Image.alpha_composite(background, source_image).convert("RGB")
    image.save(output_dir / "input.png")
    torch.set_float32_matmul_precision("high")
    assert torch.cuda.is_available(), "CUDA unavailable"
    load_start = time.perf_counter()
    model, loading = Sam3Model.from_pretrained(
        model_dir, local_files_only=True, attn_implementation="sdpa", output_loading_info=True,
    )
    if loading.get("missing_keys") or loading.get("mismatched_keys"):
        raise RuntimeError(f"Incomplete checkpoint load: {loading}")
    model = model.to("cuda").eval()
    processor = Sam3Processor.from_pretrained(model_dir, local_files_only=True)
    torch.cuda.synchronize()
    report = {
        "model_id": "facebook/sam3", "implementation": "transformers",
        "tested_at": datetime.now(timezone.utc).isoformat(),
        "image": str(args.image.resolve()), "image_size": list(image.size),
        "transparent_background_composite": "white",
        "image_sha256": hashlib.sha256(args.image.read_bytes()).hexdigest(),
        "gpu": torch.cuda.get_device_name(0), "threshold": args.threshold,
        "precision": "float32 weights, bfloat16 autocast", "attention": "sdpa",
        "load_seconds": round(time.perf_counter() - load_start, 3), "prompts": [],
        "missing_weight_keys": sorted(loading.get("missing_keys", [])),
        "unexpected_weight_keys_count": len(loading.get("unexpected_keys", [])),
    }
    tiles = []
    palette = [(255, 85, 90), (50, 170, 255), (80, 220, 130), (230, 160, 40)]
    with torch.inference_mode(), torch.autocast("cuda", dtype=torch.bfloat16):
        for prompt_index, prompt in enumerate(args.prompts):
            slug = re.sub(r"[^a-zA-Z0-9_-]", "_", prompt).strip("_") or "prompt"
            stem = f"{prompt_index + 1:02d}-{slug}"
            inputs = processor(images=image, text=prompt, return_tensors="pt").to("cuda")
            torch.cuda.reset_peak_memory_stats()
            start = time.perf_counter()
            outputs = model(**inputs)
            result = processor.post_process_instance_segmentation(
                outputs, threshold=args.threshold, mask_threshold=0.5,
                target_sizes=inputs["original_sizes"].tolist(),
            )[0]
            torch.cuda.synchronize()
            seconds = time.perf_counter() - start
            masks = result["masks"].detach().cpu().numpy().astype(bool)
            scores = result["scores"].detach().cpu().tolist()
            boxes = result["boxes"].detach().cpu().tolist()
            union = np.zeros((image.height, image.width), dtype=bool)
            instances = []
            for index, (mask, score, box) in enumerate(zip(masks, scores, boxes)):
                mask = mask.reshape(image.height, image.width)
                union |= mask
                filename = f"{stem}-mask-{index + 1:02d}.png"
                Image.fromarray(mask.astype(np.uint8) * 255).save(output_dir / filename)
                instances.append({"mask": filename, "score": score,
                                  "box_xyxy": box, "area_pixels": int(mask.sum())})
            Image.fromarray(union.astype(np.uint8) * 255).save(output_dir / f"{stem}-union.png")
            color = palette[prompt_index % len(palette)]
            pixels = np.asarray(image).copy()
            pixels[union] = (pixels[union] * 0.5 + np.array(color) * 0.5).astype(np.uint8)
            overlay = Image.fromarray(pixels)
            overlay.save(output_dir / f"{stem}-overlay.png")
            tile = overlay.copy()
            tile.thumbnail((600, 700))
            canvas = Image.new("RGB", (620, 750), "#18202a")
            canvas.paste(tile, ((620 - tile.width) // 2, 40))
            ImageDraw.Draw(canvas).text((12, 12), f"{prompt}: {len(instances)} masks", fill="white")
            tiles.append(canvas)
            item = {"prompt": prompt, "seconds": round(seconds, 3),
                    "peak_allocated_bytes": torch.cuda.max_memory_allocated(),
                    "peak_reserved_bytes": torch.cuda.max_memory_reserved(),
                    "instances": instances}
            report["prompts"].append(item)
            print(json.dumps(item), flush=True)
            del outputs, inputs, result
    columns = 2 if len(tiles) == 4 else min(3, len(tiles))
    rows = (len(tiles) + columns - 1) // columns
    board = Image.new("RGB", (columns * 620, rows * 750), "#18202a")
    for index, tile in enumerate(tiles):
        board.paste(tile, ((index % columns) * 620, (index // columns) * 750))
    board.save(output_dir / "overview.jpg", quality=92)
    (output_dir / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Saved: {output_dir}")


if __name__ == "__main__":
    main()
