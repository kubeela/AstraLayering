from PIL import Image
im=Image.open('references/base-subject.png').convert('RGB')
for y in range(193,199):
 print(y,[(x,im.getpixel((x,y))) for x in range(399,407)])
for y in range(193,199):
 print('L',y,[(x,im.getpixel((x,y))) for x in range(483,489)])
