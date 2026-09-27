from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path

work = Path(__file__).parent
font = r'C:\Windows\Fonts\msyh.ttc'
font_bold = r'C:\Windows\Fonts\msyhbd.ttc'
def f(size, bold=False):
    return ImageFont.truetype(font_bold if bold else font, size)

# Five-second source credit.
intro = Image.new('RGB', (1920, 1080), '#f6f1e9')
d = ImageDraw.Draw(intro)
d.rounded_rectangle((51, 55, 984, 1025), radius=38, fill='#fffdf9')
d.rounded_rectangle((1041, 55, 1887, 1025), radius=38, fill='#e5d7c7')
portrait = Image.open(work / 'svg-0.png').convert('RGB').resize((810, 912), Image.Resampling.LANCZOS)
mask = Image.new('L', portrait.size, 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, 809, 911), radius=24, fill=255)
intro.paste(portrait, (1059, 85), mask)
d.text((118, 130), 'SOURCE CREDIT  /  来源说明', font=f(29, True), fill='#b16b43')
d.text((113, 213), 'MILLY  米粒', font=f(78, True), fill='#352d2a')
d.rounded_rectangle((119, 334, 222, 344), radius=5, fill='#df8655')
d.text((115, 405), 'Milly模型来源于B站UP主', font=f(47, True), fill='#342c28')
d.text((115, 482), '卡米雷特的live2d教程。', font=f(47, True), fill='#342c28')
d.text((117, 620), '《Live2D绘制指南》  第3讲至第6讲', font=f(28), fill='#6b5f57')
d.text((117, 674), 'Bilibili · BV16o4y187yV', font=f(28), fill='#6b5f57')
d.line((118, 843, 916, 843), fill='#e7dcd0', width=2)
d.text((117, 872), '参考视频 × SVG 动画  /  35 秒对照', font=f(27), fill='#9b8a7b')
intro.save(work / 'intro.png')

# Labels are baked into the comparison while preserving the source video image.
overlay = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
d = ImageDraw.Draw(overlay)
d.rectangle((956, 0, 964, 1080), fill=(200, 139, 97, 255))
for x, label in [(28, '参考视频'), (992, 'svg动画')]:
    d.rounded_rectangle((x, 26, x+224, 101), radius=19, fill=(48, 40, 36, 235))
    d.text((x+25, 38), label, font=f(37, True), fill=(255, 255, 255, 255))
overlay.save(work / 'labels.png')
print('Created intro.png and labels.png')

