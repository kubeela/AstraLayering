"""Build per-part original/before/after inspection pages at a common crop.

This creates visual review material, not an automatic artistic quality score.
"""
import argparse
import html
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('output', type=Path)
    args = ap.parse_args()
    root = args.output
    dest = root / 'part-review'
    dest.mkdir(exist_ok=True)
    manifest = json.loads((root / 'manifest.json').read_text())
    plan = json.loads((root / 'retouch-plan.json').read_text())
    patches = {p['id']: p for p in plan['parts']}
    ref = Image.open(root / 'reference.png').convert('RGBA')
    font = ImageFont.load_default(size=15)
    records = []
    sections = []
    for num, part in enumerate(manifest['parts'], 1):
        pid = part['id']
        folder = root / 'parts' / pid
        after = Image.open(folder / 'full.png').convert('RGBA')
        before_path = folder / 'before-retouch.png'
        before = Image.open(before_path).convert('RGBA') if before_path.exists() else after
        alpha = Image.new('L', after.size)
        alpha.paste(before.getchannel('A'))
        bounds = alpha.getbbox()
        new_bounds = after.getbbox()
        box = (max(0, min(bounds[0], new_bounds[0]) - 3),
               max(0, min(bounds[1], new_bounds[1]) - 3),
               min(1024, max(bounds[2], new_bounds[2]) + 3),
               min(1536, max(bounds[3], new_bounds[3]) + 3))
        panel = Image.new('RGB', (1080, 370), '#eeeeef')
        draw = ImageDraw.Draw(panel)
        draw.text((8, 5), f'{num:02d}  {pid}', fill='#15151a', font=font)
        for col, (label, im) in enumerate([('REFERENCE', ref), ('BEFORE', before), ('AFTER', after)]):
            tile = Image.new('RGBA', (344, 322), '#9a9aa0')
            td = ImageDraw.Draw(tile)
            for y in range(0, 322, 16):
                for x in range(0, 344, 16):
                    if (x // 16 + y // 16) % 2 == 0:
                        td.rectangle((x, y, x + 15, y + 15), fill='#b4b4ba')
            crop = im.crop(box)
            scale = min(332 / crop.width, 310 / crop.height)
            size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
            sampling = Image.Resampling.NEAREST if max(crop.size) < 60 else Image.Resampling.LANCZOS
            crop = crop.resize(size, sampling)
            tile.alpha_composite(crop, ((344 - crop.width) // 2, (322 - crop.height) // 2))
            panel.paste(tile, (8 + col * 360, 42))
            draw.text((8 + col * 360, 24), label, fill='#333339', font=font)
        name = f'{num:02d}.png'
        panel.save(dest / name)
        patch = patches.get(pid)
        state = '局部修整／归层调整' if patch else '本轮保留'
        reason = '；'.join(patch['reasons']) if patch else '保留原图细节与已有补全。'
        records.append(dict(id=pid, state=state, comparison=name, crop=list(box), notes=reason))
        sections.append(f'<section id="part-{num}"><h2>{num:02d} {html.escape(pid)}</h2>'
                        f'<p>{state} · {html.escape(reason)}</p>'
                        f'<a href="{name}"><img loading="lazy" src="{name}" alt="{html.escape(pid)} 原图、修前、修后对照"></a>'
                        f'<p><a href="../parts/{pid}/full.png">完整透明 PNG</a> · '
                        f'<a href="../parts/{pid}/control.png">原始生图控制图</a></p></section>')
    (dest / 'index.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>逐部件修整对照</title>
<style>body{max-width:1120px;margin:24px auto;padding:0 16px;background:#24252b;color:#ececf2;font:16px/1.6 sans-serif}a{color:#aaccff}h2{font-size:17px;overflow-wrap:anywhere}section{margin:32px 0;border-top:1px solid #555}img{width:100%;height:auto}p{overflow-wrap:anywhere}</style>
<h1>90 个部件逐项对照</h1><p>每项按同一原图坐标展示：原图、修整前完整部件、修整后完整部件。
关闭原姿势遮挡蒙版后检查补全；小于 60 像素的部件使用最近邻放大，避免插值掩盖边缘。
这些页面用于人工复查，不能由整图相似度代替部件质量判断。</p>
<p><a href="../character.kra">Krita 文件</a> · <a href="../index.html">交互部件查看器</a></p>
''' + '\n'.join(sections) + '</html>')
    (dest / 'review.json').write_text(json.dumps(dict(parts=records, reviewedCount=90,
        adjustedLayerCount=len(patches), basis='Reference crop, isolated complete part and original-pose composition'),
        ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
