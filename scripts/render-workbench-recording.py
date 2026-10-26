"""Render continuous UI captures with pointer and click annotations (Pillow + FFmpeg)."""
import argparse
import bisect
import json
import math
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageStat

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('recording', type=Path)
parser.add_argument('output', type=Path, help='Output path without extension')
parser.add_argument('--ffmpeg', default='ffmpeg')
parser.add_argument('--font', default='/System/Library/Fonts/STHeiti Light.ttc')
parser.add_argument('--gif-width', type=int, default=1120)
parser.add_argument('--gif-fps', type=int, default=12)
args = parser.parse_args()
record = json.loads(args.recording.read_text())
assert not record.get('error'), record.get('error')
assert len(record['frames']) > 50, 'Use continuous capture, rather than sparse step screenshots.'
frames = record['frames']
# Trim an initial unpainted browser surface, retaining the continuous capture after first paint.
while len(frames) > 1 and sum(ImageStat.Stat(Image.open(frames[0]['path']).convert('RGB').resize((100, 60))).stddev) < 1:
    frames = frames[1:]
start_time = frames[0]['t']
times = [frame['t'] for frame in frames]
events = record['events']
font = ImageFont.truetype(args.font, 20)
source = Image.open(frames[0]['path']).convert('RGB')
w, h = source.size
# H.264 needs even dimensions; pad the native browser capture by at most one pixel.
w += w % 2
h += h % 2
caption_height = 48
fps = 24
args.output.parent.mkdir(parents=True, exist_ok=True)
mp4 = args.output.with_suffix('.mp4')
command = [args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
           '-s', f'{w}x{h + caption_height}', '-r', str(fps), '-i', 'pipe:0', '-an', '-c:v', 'libx264',
           '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(mp4)]
process = subprocess.Popen(command, stdin=subprocess.PIPE)
last_index = -1
cached = None

def pointer_at(t):
    position = (900, 180)
    for event in events:
        if event['t'] > t:
            continue
        if event['type'] == 'position':
            position = (event['x'], event['y'])
        elif event['type'] == 'move':
            progress = max(0, min(1, (t - event['t']) / event['duration']))
            smooth = progress * progress * (3 - 2 * progress)
            start, end = event['from'], event['to']
            position = (start['x'] + (end['x'] - start['x']) * smooth,
                        start['y'] + (end['y'] - start['y']) * smooth)
    return position

try:
    for output_index in range(math.ceil((record['duration'] - start_time) * fps / 1000)):
        t = start_time + output_index * 1000 / fps
        index = max(0, bisect.bisect_right(times, t) - 1)
        if index != last_index:
            cached = Image.open(frames[index]['path']).convert('RGBA')
            last_index = index
        canvas = Image.new('RGBA', (w, h + caption_height), '#f6f9fa')
        canvas.paste(cached, (0, 0))
        overlay = Image.new('RGBA', canvas.size)
        draw = ImageDraw.Draw(overlay)
        for event in events:
            elapsed = t - event['t']
            if event['type'] == 'click' and 0 <= elapsed <= 700:
                fraction = elapsed / 700
                radius = 9 + 26 * fraction
                x, y = event['x'], event['y']
                draw.ellipse((x-radius, y-radius, x+radius, y+radius), outline=(13, 146, 122, int(225*(1-fraction))), width=3)
                if elapsed < 180:
                    draw.ellipse((x-5, y-5, x+5, y+5), fill=(13, 146, 122, 155))
        x, y = pointer_at(t)
        arrow = [(x,y),(x+1,y+27),(x+8,y+21),(x+14,y+33),(x+20,y+30),(x+14,y+19),(x+25,y+18)]
        draw.polygon([(a+1,b+2) for a,b in arrow], fill=(0,0,0,45))
        draw.polygon(arrow, fill='white', outline='#203a40', width=2)
        label = ''
        for event in events:
            if event['type'] == 'label' and event['t'] <= t:
                label = event['text']
        draw.line((0,h,w,h), fill='#dce7e7', width=1)
        draw.text((w/2,h+caption_height/2), label, font=font, fill='#254e51', anchor='mm')
        image = Image.alpha_composite(canvas, overlay).convert('RGB')
        process.stdin.write(image.tobytes())
finally:
    process.stdin.close()
if process.wait() != 0:
    raise RuntimeError('FFmpeg recording encode failed')
# GIF is a compact README preview; the MP4 retains the full capture dimensions.
gif = args.output.with_suffix('.gif')
subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(mp4), '-filter_complex',
    f'[0:v]fps={args.gif_fps},scale={min(w, args.gif_width)}:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3', '-loop','0',str(gif)], check=True)
print(json.dumps({'recording': record['name'], 'source_frames': len(frames), 'duration_ms': record['duration'] - start_time,
                  'video': str(mp4), 'video_bytes': mp4.stat().st_size, 'gif': str(gif), 'gif_bytes': gif.stat().st_size}, ensure_ascii=False))
