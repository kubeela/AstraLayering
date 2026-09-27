from PIL import Image
from pathlib import Path
ref=Image.open('references/base-subject.png').convert('RGB');cur=Image.open('refinement/groups/eyes/5.眼黑与装饰部件绘制/preview.png').convert('RGB')
for label,box in [('right',(416,194,422,199)),('left',(467,193,473,199))]:
 print(label)
 for y in range(box[1],box[3]):print(y,[(x,ref.getpixel((x,y))) for x in range(box[0],box[2])])
print('comparison samples',[(p,ref.getpixel(p),cur.getpixel(p)) for p in [(425,201),(460,201),(412,196),(423,197),(473,197),(476,196),(417,196),(470,197)]])
