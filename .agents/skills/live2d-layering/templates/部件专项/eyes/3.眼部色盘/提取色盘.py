"""从眼部参考图读取真实色样，保留位置、用途和层次说明，供后续分别着色。需要 Pillow。"""
import argparse
import hashlib
import json
from pathlib import Path
from statistics import median

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROLES = ('sclera', 'iris', 'contour', 'skin', 'comparison')


def default_font():
    candidates = [
        'C:/Windows/Fonts/msyh.ttc',
        '/System/Library/Fonts/STHeiti Light.ttc',
        '/System/Library/Fonts/PingFang.ttc',
        '/System/Library/Fonts/Supplemental/Songti.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
    ]
    return next((path for path in candidates if Path(path).is_file()), None)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('image', type=Path)
    parser.add_argument('samples', type=Path, help='包含 name、part_id、x、y、radius、role 的JSON数组；坐标为EXIF校正后的图像坐标')
    parser.add_argument('output', type=Path, help='输出PNG；同名JSON保存准确色值与坐标')
    parser.add_argument('--font', default=default_font(), help='中文字体路径；默认查找常用系统字体')
    args = parser.parse_args()
    if args.output.suffix.lower() != '.png':
        parser.error('输出文件需使用.png后缀')
    inputs = {args.image.resolve(), args.samples.resolve()}
    if args.output.resolve() in inputs or args.output.with_suffix('.json').resolve() in inputs:
        parser.error('输出不能覆盖输入')
    with Image.open(args.image) as source:
        im = ImageOps.exif_transpose(source).convert('RGBA')
    if not args.font:
        parser.error('找不到可用中文字体，请通过 --font 指定字体文件')
    try:
        ImageFont.truetype(args.font, 20)
    except (OSError, TypeError):
        parser.error('找不到可用中文字体，请通过 --font 指定字体文件')
    try:
        definitions = json.loads(args.samples.read_text(encoding='utf-8-sig'))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        parser.error(f'无法读取取样JSON：{error}')
    if not isinstance(definitions, list) or not definitions:
        parser.error('至少需要一个取样区域')
    samples = []
    for index, item in enumerate(definitions, 1):
        if not isinstance(item, dict) or not all(key in item for key in ('name', 'part_id', 'x', 'y', 'role')):
            parser.error('每项必须包含 name、part_id、x、y、role')
        if not all(isinstance(item[key], str) and item[key].strip() for key in ('name', 'part_id')):
            parser.error('name 与 part_id 必须为非空字符串')
        x, y, radius = item['x'], item['y'], item.get('radius', 2)
        if not all(type(v) is int for v in (x, y, radius)) or radius < 0:
            parser.error('坐标与半径必须为整数，半径不能为负数')
        if not (radius <= x < im.width-radius and radius <= y < im.height-radius):
            parser.error(f"取样区域越界：{item['name']}")
        if item['role'] not in ROLES:
            parser.error('role必须为 ' + '、'.join(ROLES))
        pixels = [(px, py, im.getpixel((px, py))[:3])
                  for py in range(y-radius, y+radius+1)
                  for px in range(x-radius, x+radius+1)
                  if im.getpixel((px, py))[3] == 255]
        if not pixels:
            parser.error(f"取样区域没有不透明像素：{item['name']}")
        middle = [median(pixel[2][channel] for pixel in pixels) for channel in range(3)]
        px, py, rgb = min(pixels, key=lambda pixel: (
            sum((pixel[2][channel]-middle[channel])**2 for channel in range(3)),
            (pixel[0]-x)**2 + (pixel[1]-y)**2))
        samples.append(dict(item, radius=radius, id=f'{index:02}', rgb=list(rgb),
                            hex='#'+''.join(f'{v:02X}' for v in rgb),
                            actual_pixel=[px, py]))

    # 色盘展示原图、每个局部及真正取到的像素；不重新生成角色。
    groups = [('sclera', '眼白 · 表面颜色'),
              ('iris', '眼黑 · 虹膜与瞳孔'),
              ('contour', '眼睑与睫毛 · 轮廓色'),
              ('skin', '眼周皮肤 · 底色与体积层次'),
              ('comparison', '投影、高光与妆色 · 对照色')]
    counts = {role: sum(s['role'] == role for s in samples) for role, _ in groups}
    right_height = sum(52 + ((counts[role]+2)//3)*205 + 20 for role, _ in groups if counts[role])
    width, height = 1480, max(1040, 115+right_height+75)
    sheet = Image.new('RGB', (width, height), '#eef2f5')
    draw = ImageDraw.Draw(sheet)
    def text(x, y, value, size=20, color='#233743'):
        draw.text((x, y), value, font=ImageFont.truetype(args.font, size), fill=color)
    text(28, 20, '眼部色盘 / 原图取色与位置', 32)
    text(28, 67, '区域由看图选择，色值由程序读取；候选色不是自动还原的固有色。', 20, '#526772')
    # 放大取样点所在眼部；标注与 JSON 坐标仍使用原图坐标。
    left = min(s['x']-s['radius'] for s in samples)
    top = min(s['y']-s['radius'] for s in samples)
    right = max(s['x']+s['radius']+1 for s in samples)
    bottom = max(s['y']+s['radius']+1 for s in samples)
    padding = max(24, round(max(right-left, bottom-top)*0.4))
    bounds = (max(0, left-padding), max(0, top-padding),
              min(im.width, right+padding), min(im.height, bottom+padding))
    region = im.crop(bounds)
    scale = min(410/region.width, 690/region.height)
    preview = region.resize((max(1, round(region.width*scale)), max(1, round(region.height*scale))), Image.Resampling.LANCZOS)
    sheet.paste(preview, (25, 132), preview)
    occupied = []
    for s in sorted(samples, key=lambda s: s['y']):
        x = 25+(s['x']-bounds[0])*preview.width/region.width
        y = 132+(s['y']-bounds[1])*preview.height/region.height
        label = None
        for dy in (-22, 5, -46, 29, -70, 53):
            for dx in (8, -31, 33, -56):
                box = (x+dx, y+dy, x+dx+26, y+dy+24)
                if box[0] < 26 or box[2] > 438 or box[1] < 116:
                    continue
                if not any(box[0] < b[2] and box[2] > b[0] and box[1] < b[3] and box[3] > b[1] for b in occupied):
                    label = box
                    break
            if label:
                break
        label = label or (x+8,y-22,x+34,y+2)
        occupied.append(label)
        draw.line((x,y,label[0]+12,label[1]+12),fill='#a5153d',width=1)
        draw.ellipse((x-4, y-4, x+4, y+4), fill='#ffffff', outline='#b52249', width=2)
        draw.text((label[0],label[1]), s['id'], font=ImageFont.truetype(args.font, 18),
                  fill='#a5153d', stroke_width=2, stroke_fill='white')
    info_y = 132+preview.height+34
    text(28, info_y, f'原图画布：{im.width} × {im.height}', 19)
    text(28, info_y+35, '右侧方框标出取样范围，圆点标出实际像素。', 17)
    text(28, info_y+67, '眼部局部放大；坐标均为原图坐标。', 17)
    y = 116
    for role, title in groups:
        items = [s for s in samples if s['role'] == role]
        if not items:
            continue
        text(458, y, title, 25)
        y += 48
        for index, s in enumerate(items):
            cx, cy = 458+(index % 3)*332, y+(index//3)*205
            draw.rounded_rectangle((cx, cy, cx+316, cy+190), radius=10, fill='white')
            text(cx+13, cy+12, s['id']+'  '+s['name'], 20)
            x, sy, radius = s['x'], s['y'], s['radius']
            half = max(12, radius+3)
            bounds = (max(0,x-half), max(0,sy-half), min(im.width,x+half+1), min(im.height,sy+half+1))
            crop = im.crop(bounds).resize((106,106), Image.Resampling.NEAREST)
            sheet.paste(crop, (cx+13,cy+45), crop)
            sx, sy_scale = 106/(bounds[2]-bounds[0]), 106/(bounds[3]-bounds[1])
            draw.rectangle((cx+13+(x-radius-bounds[0])*sx, cy+45+(sy-radius-bounds[1])*sy_scale,
                            cx+13+(x+radius+1-bounds[0])*sx, cy+45+(sy+radius+1-bounds[1])*sy_scale),
                           outline='#b52249', width=2)
            px, py = s['actual_pixel']
            px, py = cx+13+(px-bounds[0]+.5)*sx, cy+45+(py-bounds[1]+.5)*sy_scale
            draw.ellipse((px-2,py-2,px+2,py+2), fill='white', outline='#b52249')
            draw.rectangle((cx+134,cy+45,cx+302,cy+113), fill=s['hex'], outline='#d5dde2')
            text(cx+134,cy+121,s['hex'],22)
            text(cx+134,cy+151,'RGB '+','.join(map(str,s['rgb'])),15)
            text(cx+13,cy+164,f"({x}, {sy}) · {radius*2+1}×{radius*2+1}",16,'#526772')
        y += ((len(items)+2)//3)*205 + 20
    text(28,height-43,'结合原彩图区分固有色、渐变与投影；眼周层次和眼内颜色分别保留归属。',20)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output)
    data = dict(source=str(args.image.resolve()), source_sha256=hashlib.sha256(args.image.read_bytes()).hexdigest(),
                canvas=list(im.size), coordinates='EXIF-transposed source image pixels', method='Nearest real opaque source pixel to the per-channel patch median; center-nearest tie break.',
                interpretation='Observed colors; semantic roles are supplied by the caller, not inferred by this program.',
                samples=samples)
    args.output.with_suffix('.json').write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(args.output)
    for s in samples:
        print(s['id'], s['name'], s['hex'], s['actual_pixel'])


if __name__ == '__main__':
    main()
