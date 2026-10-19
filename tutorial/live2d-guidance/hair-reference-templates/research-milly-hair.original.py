"""Read local PSD records and pixel channels; never modify the source asset."""
from pathlib import Path
import importlib.util
import hashlib
import json
import struct
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'workflow-next/part-layering/.run/hair-splitting-research-20261015'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = ROOT / 'tutorial/live2d-guidance/model-originals/milly/Milly原画.psd'
spec = importlib.util.spec_from_file_location('asset_parser', ROOT / 'tutorial/live2d-guidance/tools/parse_learning_assets.py')
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)
data = SOURCE.read_bytes()
before_hash = hashlib.sha256(data).hexdigest()
meta = parser.psd_metadata(SOURCE)
assert meta['document']['bitsPerChannel'] == 8 and meta['document']['colorMode'] == 3
W, H = meta['document']['width'], meta['document']['height']
nodes = {n['id']: n for n in meta['records']}
paths = {}
def visit(key, parent=''):
    n = nodes[key]
    paths[key] = parent + '/' + n['originalName']
    for child in n['children']:
        visit(child, paths[key])
for key in meta['rootIds']:
    visit(key)
front = next(n for n in meta['records'] if n['originalName']=='头发前' and n['kind']=='group')
rear = next(n for n in meta['records'] if n['originalName']=='头发后' and n['kind']=='group')
prefixes = [paths[n['id']] for n in [front,rear]]
selected = [n for n in meta['records'] if n['id'] in paths and any(paths[n['id']]==p or paths[n['id']].startswith(p+'/') for p in prefixes)]
for n in reversed(selected):
    print(f"{n['recordIndex']:3} {n['kind']:5} {paths[n['id']]} {n['width']}x{n['height']} mask={n['maskDataBytes']} clip={n['clipping']} blend={n['blendKey']}")

# Use the existing PSD record parser for names/hierarchy; locate each recorded
# channel by its declared length and decode only the selected actual pixels.
r = parser.Reader(data)
r.take(26)
r.block(); r.block()
lm = parser.Reader(r.block())
info = parser.Reader(lm.block())
count = abs(info.num('h'))
assert count == len(meta['records'])
for _ in range(count):
    info.take(16)
    info.take(info.num('H') * 6)
    info.take(12)
    info.block()
channels = {}
for n in meta['records']:
    channels[n['id']] = [(c['id'], info.take(c['encodedBytes'])) for c in n['channels']]
assert not any(info.take(len(info.data)-info.p))

def unpackbits(encoded, expected):
    result = bytearray()
    at = 0
    while at < len(encoded):
        control = encoded[at]; at += 1
        if control < 128:
            length = control + 1
            result.extend(encoded[at:at+length]); at += length
        elif control > 128:
            result.extend(bytes([encoded[at]]) * (257-control)); at += 1
    assert len(result) == expected, (len(result), expected)
    return bytes(result)

def decode(blob, width, height):
    method = struct.unpack('>H', blob[:2])[0]
    if method == 0:
        pixels = blob[2:]
        assert len(pixels) == width*height
        return pixels
    if method != 1:
        raise ValueError(f'Unsupported PSD compression {method}')
    lengths = struct.unpack('>'+'H'*height, blob[2:2+height*2])
    pos = 2+height*2
    rows = []
    for length in lengths:
        rows.append(unpackbits(blob[pos:pos+length],width)); pos += length
    assert pos == len(blob)
    return b''.join(rows)

images = {}
def layer(n):
    if n['id'] in images:
        return images[n['id']]
    canvas = Image.new('RGBA',(W,H))
    if n['kind'] == 'group':
        for child in reversed(n['children']):
            canvas.alpha_composite(layer(nodes[child]))
    else:
        assert n['maskDataBytes'] == 0 and not n['clipping'] and n['blendKey'] == 'norm', n['originalName']
        w,h = n['width'],n['height']
        bands = {}
        for channel,blob in channels[n['id']]:
            if channel in [-1,0,1,2]:
                bands[channel] = Image.frombytes('L',(w,h),decode(blob,w,h))
        assert all(c in bands for c in [0,1,2])
        alpha = bands.get(-1,Image.new('L',(w,h),255))
        if n['opacityByte'] != 255:
            alpha = alpha.point(lambda value: value*n['opacityByte']//255)
        rgba = Image.merge('RGBA',(bands[0],bands[1],bands[2],alpha))
        canvas.alpha_composite(rgba,(n['bounds']['left'],n['bounds']['top']))
    images[n['id']] = canvas
    return canvas

study = []
for n in selected:
    im = layer(n)
    bbox = im.getchannel('A').getbbox()
    if bbox:
        study.append({ 'path':paths[n['id']], 'recordIndex':n['recordIndex'], 'kind':n['kind'],
          'directChildren':len(n['children']), 'storedBounds':n['bounds'], 'alphaBounds':bbox,
          'children':[paths[c] for c in n['children']] })

reference = Image.open(SOURCE).convert('RGBA')
reference.thumbnail((800,1200))
reference.save(OUT/'milly-reference.png')
font_path = 'C:/Windows/Fonts/msyh.ttc'
font = ImageFont.truetype(font_path,22)
small = ImageFont.truetype(font_path,16)
keypaths = [paths[front['id']]+'/'+name for name in ['前发','前侧发','侧发']] + [paths[rear['id']]]
by_path = {paths[n['id']]:n for n in selected}
assert all(p in by_path for p in keypaths)
combined = Image.new('RGBA',(W,H))
for p in reversed(keypaths):
    combined.alpha_composite(layer(by_path[p]))
head_box = combined.getchannel('A').getbbox()
head_box = (max(0,head_box[0]-80),max(0,head_box[1]-80),min(W,head_box[2]+80),min(H,head_box[3]+80))

def thumb(im,size,background='#f0f2f6'):
    im = im.copy()
    im.thumbnail(size)
    canvas = Image.new('RGBA',size,background)
    canvas.alpha_composite(im,((size[0]-im.width)//2,(size[1]-im.height)//2))
    return canvas.convert('RGB')

def contact(items,filename,cols=4):
    cw,ch = 390,530
    board = Image.new('RGB',(cw*cols,ch*((len(items)+cols-1)//cols)),'white')
    draw = ImageDraw.Draw(board)
    for i,(title,im,note) in enumerate(items):
        x,y=(i%cols)*cw,(i//cols)*ch
        draw.text((x+10,y+8),title,font=font,fill='#203550')
        draw.text((x+10,y+40),note,font=small,fill='#64758b')
        board.paste(thumb(im,(cw-20,ch-85)),(x+10,y+75))
    board.save(OUT/filename)

items=[]
colors=['#e45756','#159b7a','#4284d7','#ab68c3']
rawref=Image.open(SOURCE).convert('RGBA')
for i,p in enumerate(keypaths):
    n=by_path[p]; im=layer(n)
    filename='milly-region-'+str(i)+'.png'
    im.crop(head_box).save(OUT/filename)
    items.append((p.split('/')[-1],im.crop(head_box),f"PSD {n['kind']} · {len(n['children'])} 个直接子节点"))
    tinted=Image.new('RGBA',(W,H),colors[i]); tinted.putalpha(im.getchannel('A').point(lambda v:v*120//255))
    overlay=rawref.copy();overlay.alpha_composite(tinted)
    overlay.crop(head_box).resize((780,round((head_box[3]-head_box[1])*780/(head_box[2]-head_box[0])))).save(OUT/f'milly-region-{i}-overlay.png')
contact(items,'milly-hair-regions.png')

for i,p in enumerate(keypaths):
    parent=by_path[p]
    child_items=[]
    for child in parent['children']:
        n=nodes[child]
        child_items.append((n['originalName'],layer(n).crop(head_box),f"{n['kind']} · {n['width']}×{n['height']}"))
    if child_items:
        contact(child_items,f'milly-region-{i}-children.png')

manifest={'source':str(SOURCE),'sourceSha256':before_hash,'canvas':[W,H],
  'sourceRecordsReparsed':True,'hairNodes':study,'comparisonCrop':head_box,
  'pixelDecoding':{'channels':'actual RGB and transparency channels','compression':'PSD raw / PackBits RLE',
    'checks':'each decoded row length, channel byte count, normal blend, no masks/clipping',
    'scope':'only actual hair layers; no Cubism deformation or physics validation'},
  'independentLocalPsds':1,
  'sourceUnchanged':hashlib.sha256(SOURCE.read_bytes()).hexdigest()==before_hash}
assert manifest['sourceUnchanged']
(OUT/'milly-hair-facts.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
html='''<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Milly PSD 头发实际分层研究</title><style>body{max-width:1500px;margin:28px auto;padding:0 20px;font:16px/1.7 system-ui;background:#f2f4f8;color:#243a55}section{background:white;padding:22px;margin:20px 0;border-radius:12px}img{max-width:100%;height:auto}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}code{font-size:13px}li{margin:4px}</style><h1>Milly PSD：实际头发图层与范围</h1><p>直接解码本机 PSD 的像素层。各格使用同一坐标范围和比例。只用于本地研究，不修改原件或生产结果。</p><section><h2>四个实际组织区域</h2><img src="milly-hair-regions.png"></section>'''
for i,p in enumerate(keypaths):
    n=by_path[p]
    html+=f'<section><h2>{p}</h2><p>原 PSD {n["kind"]}；直接子节点 {len(n["children"])} 个。</p><div class="pair"><img src="milly-region-{i}.png"><img src="milly-region-{i}-overlay.png"></div>'
    if n['children']:
        html+=f'<h3>实际子图层</h3><img src="milly-region-{i}-children.png">'
    html+='</section>'
html+='<section><h2>PSD 原始层级</h2><pre>'+ '\n'.join(f"{n['kind']:5} {paths[n['id']]}" for n in reversed(selected))+'</pre><p><a href="milly-hair-facts.json">源文件哈希、图层事实与读取边界</a></p></section></html>'
(OUT/'index.html').write_text(html,encoding='utf8')
print(json.dumps({'out':str(OUT),'hash':before_hash,'hairNodes':len(study),'headBox':head_box,'unchanged':manifest['sourceUnchanged']},ensure_ascii=False))
