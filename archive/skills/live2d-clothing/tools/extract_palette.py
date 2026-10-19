"""Generic color sampling and palette rendering helpers. Requires Pillow."""
import argparse
import hashlib
import json
from pathlib import Path
from statistics import median

from PIL import Image, ImageDraw, ImageFont, ImageOps


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


def sample_box(image, item, method):
    """Return an exact point or caller-selected rectangle and its label anchor."""
    if method != 'point' and 'box' in item:
        box = item['box']
        if not isinstance(box, (list, tuple)) or len(box) != 4:
            raise ValueError('box 必须为 [X, Y, W, H]')
        left, top, width, height = box
        if not all(type(v) is int for v in box):
            raise ValueError('box 坐标和尺寸必须为整数')
        x, y = left+width//2, top+height//2
    else:
        x, y = item.get('x'), item.get('y')
        radius = 0 if method == 'point' else item.get('radius', 2)
        if not all(type(v) is int for v in (x, y, radius)) or radius < 0:
            raise ValueError('取样需要整数 x、y 与非负 radius，或 box')
        left, top, width, height = x-radius, y-radius, radius*2+1, radius*2+1
    if (left < 0 or top < 0 or min(width, height) <= 0
            or left+width > image.width or top+height > image.height):
        raise ValueError('取样区域越界：' + item['name'])
    return [left, top, width, height], x, y


def supplied_color(item):
    rgb = item.get('rgb')
    hex_color = item.get('hex')
    if hex_color is not None:
        if not isinstance(hex_color, str) or len(hex_color) != 7 or not hex_color.startswith('#'):
            raise ValueError('提供的 hex 必须为 #RRGGBB')
        try:
            parsed = [int(hex_color[i:i+2], 16) for i in (1, 3, 5)]
        except ValueError:
            raise ValueError('无效的 hex 颜色')
        if rgb is not None and rgb != parsed:
            raise ValueError('提供的 rgb 与 hex 不一致')
        rgb = parsed
    if (not isinstance(rgb, (list, tuple)) or len(rgb) != 3
            or not all(type(v) is int and 0 <= v <= 255 for v in rgb)):
        raise ValueError('提供色需要 rgb=[R,G,B] 或 hex="#RRGGBB"')
    alpha = item.get('alpha', 255)
    if type(alpha) is not int or not 0 <= alpha <= 255:
        raise ValueError('alpha 必须在 0..255 之间')
    return list(rgb), alpha


def extract_samples(image, definitions, default_method=None):
    """Methods are conveniences; provided accepts colors from any caller algorithm."""
    if not isinstance(definitions, list) or not definitions:
        raise ValueError('至少需要一个色样')
    image = image.convert('RGBA')
    samples = []
    for index, item in enumerate(definitions, 1):
        if not isinstance(item, dict) or not isinstance(item.get('name'), str) or not item['name'].strip():
            raise ValueError('每项色样需要非空 name')
        role = item.get('role', 'samples')
        if not isinstance(role, str) or not role.strip():
            raise ValueError('role 需要非空名称，可以自定义')
        method = item.get('method', default_method)
        if method is None:
            method = 'provided' if 'rgb' in item or 'hex' in item else 'nearest'
        sample = dict(item, id=f'{index:02}', role=role, method=method)
        actual_pixel = None
        if method == 'provided':
            rgb, alpha = supplied_color(item)
            origin = 'provided'
            # A location may describe context, but is not evidence of pixel measurement.
            if 'box' in item or 'x' in item or 'y' in item:
                location_mode = 'nearest' if 'box' in item or 'radius' in item else 'point'
                box, x, y = sample_box(image, item, location_mode)
                sample.update(box=box, x=x, y=y)
        else:
            if method not in ('point', 'nearest', 'mean', 'median'):
                raise ValueError('未知 method：%s；可用 point/nearest/mean/median，或用 provided 提交自行计算的颜色' % method)
            box, x, y = sample_box(image, item, method)
            left, top, width, height = box
            minimum = item.get('min_alpha', 1)
            if type(minimum) is not int or not 0 <= minimum <= 255:
                raise ValueError('min_alpha 必须在 0..255 之间')
            pixels = [(px, py, image.getpixel((px, py)))
                      for py in range(top, top+height) for px in range(left, left+width)
                      if image.getpixel((px, py))[3] >= minimum]
            if not pixels:
                raise ValueError('取样区域内没有满足 min_alpha 的像素：' + item['name'])
            sample.update(box=box, x=x, y=y, min_alpha=minimum)
            if method == 'point':
                px, py, rgba = pixels[0]
            elif method == 'nearest':
                middle = [median(pixel[2][channel] for pixel in pixels) for channel in range(3)]
                px, py, rgba = min(pixels, key=lambda pixel: (
                    sum((pixel[2][channel]-middle[channel])**2 for channel in range(3)),
                    (pixel[0]-x)**2 + (pixel[1]-y)**2))
            else:
                aggregate = (lambda values: sum(values)/len(values)) if method == 'mean' else median
                rgba = [round(aggregate([pixel[2][channel] for pixel in pixels])) for channel in range(4)]
            rgb, alpha = list(rgba[:3]), rgba[3]
            if method in ('point', 'nearest'):
                actual_pixel, origin = [px, py], 'source_pixel'
            else:
                origin = 'source_statistic'
        sample.update(rgb=rgb, alpha=alpha, hex='#'+''.join(f'{v:02X}' for v in rgb),
                      actual_pixel=actual_pixel, color_origin=origin)
        samples.append(sample)
    return samples


def palette_groups(samples, labels=None):
    """Suggested labels/order never restrict or discard caller-defined roles."""
    if labels is None:
        labels = {}
    elif isinstance(labels, list):
        labels = dict(labels)
    if not isinstance(labels, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in labels.items()):
        raise ValueError('groups 需要 {分类名称: 显示标题} 或二元数组')
    roles = list(dict.fromkeys(sample['role'] for sample in samples))
    return [(role, labels[role]) for role in labels if role in roles] + [
        (role, role) for role in roles if role not in labels]


def render_palette(image, samples, presentation=None, font=None):
    """Render prepared samples, independent of how the caller obtained colors."""
    presentation = presentation or {}
    groups = palette_groups(samples, presentation.get('groups'))
    font = font or default_font()
    if not font:
        raise ValueError('找不到可用中文字体，请通过 --font 指定字体文件')
    fonts = {}
    def sized_font(size):
        if size not in fonts:
            fonts[size] = ImageFont.truetype(str(font), size)
        return fonts[size]

    counts = {role: sum(s['role'] == role for s in samples) for role, _ in groups}
    right_height = sum(52 + ((counts[role]+2)//3)*205 + 20 for role, _ in groups)
    width, height = 1480, max(1040, 115+right_height+75)
    sheet = Image.new('RGB', (width, height), '#eef2f5')
    draw = ImageDraw.Draw(sheet)
    def text(x, y, value, size=20, color='#233743'):
        draw.text((x, y), value, font=sized_font(size), fill=color)
    text(28, 20, presentation.get('title', '色盘 / 颜色与位置'), 32)
    text(28, 67, '每个色样注明方法；真实像素、区域统计与提供色分别记录。', 20, '#526772')
    located = [s for s in samples if 'box' in s and 'x' in s and 'y' in s]
    if located:
        left = min(s['box'][0] for s in located)
        top = min(s['box'][1] for s in located)
        right = max(s['box'][0]+s['box'][2] for s in located)
        bottom = max(s['box'][1]+s['box'][3] for s in located)
        padding = max(24, round(max(right-left, bottom-top)*0.4))
        bounds = (max(0, left-padding), max(0, top-padding),
                  min(image.width, right+padding), min(image.height, bottom+padding))
    else:
        bounds = (0, 0, image.width, image.height)
    region = image.crop(bounds).convert('RGBA')
    scale = min(410/region.width, 690/region.height)
    preview = region.resize((max(1, round(region.width*scale)), max(1, round(region.height*scale))),
                            Image.Resampling.LANCZOS)
    sheet.paste(preview, (25, 132), preview)
    occupied = []
    for sample in sorted(located, key=lambda s: s['y']):
        x = 25+(sample['x']-bounds[0])*preview.width/region.width
        y = 132+(sample['y']-bounds[1])*preview.height/region.height
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
        label = label or (x+8, y-22, x+34, y+2)
        occupied.append(label)
        draw.line((x, y, label[0]+12, label[1]+12), fill='#a5153d', width=1)
        draw.ellipse((x-4, y-4, x+4, y+4), fill='white', outline='#b52249', width=2)
        draw.text((label[0], label[1]), sample['id'], font=sized_font(18),
                  fill='#a5153d', stroke_width=2, stroke_fill='white')
    info_y = 132+preview.height+34
    text(28, info_y, f'原图画布：{image.width} × {image.height}', 19)
    text(28, info_y+35, '方框为取样范围；白点仅标实际取出的像素。', 17)
    text(28, info_y+67, presentation.get('region', '参考')+'局部；坐标按原图。', 17)
    y = 116
    for role, title in groups:
        items = [sample for sample in samples if sample['role'] == role]
        text(458, y, title, 25)
        y += 48
        for index, sample in enumerate(items):
            cx, cy = 458+(index % 3)*332, y+(index//3)*205
            draw.rounded_rectangle((cx, cy, cx+316, cy+190), radius=10, fill='white')
            text(cx+13, cy+12, sample['id']+'  '+sample['name'], 20)
            if 'box' in sample and 'x' in sample and 'y' in sample:
                left, top, sw, sh = sample['box']
                bounds = (max(0, left-4), max(0, top-4), min(image.width, left+sw+4), min(image.height, top+sh+4))
                crop = image.crop(bounds).convert('RGBA').resize((106, 106), Image.Resampling.NEAREST)
                sheet.paste(crop, (cx+13, cy+45), crop)
                sx, sy = 106/(bounds[2]-bounds[0]), 106/(bounds[3]-bounds[1])
                draw.rectangle((cx+13+(left-bounds[0])*sx, cy+45+(top-bounds[1])*sy,
                                cx+13+(left+sw-bounds[0])*sx, cy+45+(top+sh-bounds[1])*sy),
                               outline='#b52249', width=2)
                if sample.get('actual_pixel') is not None:
                    px, py = sample['actual_pixel']
                    px, py = cx+13+(px-bounds[0]+.5)*sx, cy+45+(py-bounds[1]+.5)*sy
                    draw.ellipse((px-2, py-2, px+2, py+2), fill='white', outline='#b52249')
            else:
                text(cx+15, cy+65, '提供色', 22)
            draw.rectangle((cx+134, cy+45, cx+302, cy+113), fill=sample['hex'], outline='#d5dde2')
            text(cx+134, cy+121, sample['hex'], 22)
            text(cx+134, cy+151, 'RGB '+','.join(map(str, sample['rgb'])), 15)
            text(cx+13, cy+164, sample.get('method', 'provided')+' / alpha '+str(sample.get('alpha', 255)), 16, '#526772')
        y += ((len(items)+2)//3)*205 + 20
    text(28, height-43, presentation.get('footer', '分组、颜色用途与取样方法由调用者按图片决定。'), 20)
    return sheet


def main(defaults=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('image', type=Path)
    parser.add_argument('samples', type=Path, help='色样数组，或包含 samples 和可选显示设置的 JSON 对象')
    parser.add_argument('output', type=Path, help='输出 PNG 和同名 JSON')
    parser.add_argument('--font', default=default_font())
    parser.add_argument('--method', help='全局默认采样方法，每项仍可覆盖；省略时兼容旧坐标取样')
    args = parser.parse_args()
    if args.output.suffix.lower() != '.png':
        parser.error('输出文件需使用.png后缀')
    try:
        for output in (args.output, args.output.with_suffix('.json')):
            for source in (args.image, args.samples):
                if output.resolve() == source.resolve() or (output.exists() and source.exists() and output.samefile(source)):
                    raise ValueError('输出不能覆盖输入')
        payload = json.loads(args.samples.read_text(encoding='utf-8-sig'))
        presentation = dict(defaults or {})
        default_method = args.method
        if isinstance(payload, dict):
            presentation.update({key: payload[key] for key in ('title', 'region', 'footer', 'groups') if key in payload})
            default_method = default_method or payload.get('method')
            definitions = payload.get('samples')
        else:
            definitions = payload
        with Image.open(args.image) as source:
            image = ImageOps.exif_transpose(source).convert('RGBA')
        samples = extract_samples(image, definitions, default_method)
        sheet = render_palette(image, samples, presentation, args.font)
        data = dict(source=str(args.image.resolve()), source_sha256=hashlib.sha256(args.image.read_bytes()).hexdigest(),
                    canvas=list(image.size), coordinates='EXIF-transposed source image pixels',
                    interpretation='Caller-chosen groups and methods; color_origin distinguishes pixels, statistics and provided colors.',
                    presentation=presentation, samples=samples)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(args.output)
        args.output.with_suffix('.json').write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        print(args.output)
        for sample in samples:
            print(sample['id'], sample['name'], sample['hex'], sample['method'], sample['actual_pixel'])
    except (ValueError, OSError, TypeError, UnicodeError, Image.DecompressionBombError) as exc:
        parser.error(str(exc))


if __name__ == '__main__':
    main()
