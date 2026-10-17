"""Reconstruct three inspected native Krita paint layers as a smooth clothing base.
The breast alpha is copied exactly; only the torso receives a chest contour clip.
All positions, masks, colors and gradients are authored for the inspected artwork.
"""
import math
from PyQt5.QtCore import Qt
DOC.setBatchmode(True)

def clamp(t):return max(0.,min(1.,t))
def smooth(a,b,t):
 t=clamp((t-a)/(b-a));return t*t*(3-2*t)
def g(x,y,cx,cy,sx,sy):return math.exp(-.5*(((x-cx)/sx)**2+((y-cy)/sy)**2))
def mix(a,b,t):return tuple(a[i]*(1-t)+b[i]*t for i in range(3))
def tint(c,amount,rgb):return tuple(c[i]+amount*rgb[i] for i in range(3))
def source_bytes(pid):
 im=QImage(str(OUT/'before-parts'/pid/'full.png')).convertToFormat(QImage.Format_ARGB32)
 b=im.constBits();b.setsize(im.sizeInBytes());return bytearray(b)
def save_data(pid,data):
 im=QImage(bytes(data),W,H,W*4,QImage.Format_ARGB32).copy()
 set_image(pid,im);export_node(NODES[pid],OUT/'parts'/pid/'full.png')
def interp(t,knots):
 if t<=knots[0][0]:return knots[0][1]
 for (a,x),(b,y) in zip(knots,knots[1:]):
  if t<=b:return x+(y-x)*(t-a)/(b-a)
 return knots[-1][1]

def skin_trunk(x,y):
 # A continuous warm surface shared across the torso/pelvis overlap.
 c=(251.,231.0,222.5)
 c=tint(c,g(x,y,513,489,78,184),(2.1,5.5,6.0))
 c=tint(c,g(x,y,496,478,41,90),(.3,1.2,1.5))
 c=tint(c,g(x,y,454,451,19,58),(-5.0,-12.,-13.))
 c=tint(c,g(x,y,572,451,19,58),(-5.0,-12.,-13.))
 c=tint(c,g(x,y,429,570,23,70),(-4.0,-9.0,-10.0))
 c=tint(c,g(x,y,596,570,23,70),(-4.0,-9.0,-10.0))
 c=tint(c,g(x,y,511,572,44,67),(1.0,1.7,1.8))
 return c

def torso_skin(x,y):
 upper=(251.4,232.2,224.3)
 upper=tint(upper,g(x,y,512,334,65,30),(1.1,3.6,4.0))
 # Quiet clavicle shadow where the old straps crossed the upper chest.
 clav_y=311+3.8*math.exp(-.5*((x-512)/13)**2)
 clav=math.exp(-.5*((y-clav_y)/1.5)**2)*(g(x,y,479,312,22,20)+g(x,y,548,312,22,20))
 upper=tint(upper,clav,(-6.5,-14.,-15.))
 upper=tint(upper,g(x,y,455,339,15,23),(-1.7,-4.7,-5.2))
 upper=tint(upper,g(x,y,569,339,15,23),(-1.7,-4.7,-5.2))
 c=mix(upper,skin_trunk(x,y),smooth(355,438,y))
 # The simple rib cage has a single continuous side, without breast lobes.
 if y>387 and y<542:
  left=interp(y,[(387,431),(395,440),(423,446),(455,452),(490,456),(507,452),(523,447),(542,434)])
  edge=min(x-left,1024-left-x)
  v=math.exp(-.5*(max(0,edge)/6.5)**2)*smooth(387,405,y)*(1-smooth(520,542,y))
  c=tint(c,v,(-5.5,-12.5,-14.0))
 return c

# Clip only the torso's breast protrusion. Original shoulder caps and the
# lower waist/hip overlap remain the authoring limits.
clip=QImage(W,H,QImage.Format_ARGB32);clip.fill(Qt.transparent)
p=QPainter(clip);p.setRenderHint(QPainter.Antialiasing)
path=QPainterPath();path.moveTo(350,280);path.lineTo(680,280);path.lineTo(680,355);path.lineTo(640,359)
path.cubicTo(628,378,607,388,586,392)
path.cubicTo(580,399,580,412,577,425)
path.cubicTo(573,447,569,473,568,491)
path.cubicTo(568,506,574,519,584,535)
path.lineTo(680,550);path.lineTo(680,660);path.lineTo(350,660);path.lineTo(350,550);path.lineTo(440,535)
path.cubicTo(450,519,456,506,456,491)
path.cubicTo(455,473,451,447,447,425)
path.cubicTo(444,412,444,399,438,392)
path.cubicTo(417,388,396,378,384,359)
path.lineTo(350,355);path.closeSubpath();p.fillPath(path,QColor(255,255,255));p.end()
b=clip.constBits();b.setsize(clip.sizeInBytes());clip_data=bytes(b)

data=source_bytes('body/torso')
torso_edges={}
for y in range(299,623):
 xs=[x for x in range(385,640) if data[(y*W+x)*4+3]>128 and clip_data[(y*W+x)*4+3]>128]
 if xs:torso_edges[y]=(min(xs),max(xs))
for y in range(299,623):
 for x in range(385,640):
  i=(y*W+x)*4
  if not data[i+3]:continue
  # Full surface below the chest, plus two individually located strap strips.
  main=smooth(330,355,y)*smooth(418,434,x)*(1-smooth(590,606,x))
  lc=461-.31*(y-300);rc=563+.31*(y-300)
  straps=max(1-smooth(12,19,abs(x-lc)),1-smooth(12,19,abs(x-rc)))
  straps*=1-smooth(370,391,y)
  m=max(main,straps)
  if y>389:m=1.
  if (x-425)**2+(y-386)**2<49 or (x-599)**2+(y-387)**2<49:m=1.
  orig=(data[i+2],data[i+1],data[i])
  color=torso_skin(x+.5,y+.5)
  if y in torso_edges and 393<y<607:
   a,b=torso_edges[y];d=max(0,min(x-a,b-x))
   strength=smooth(393,413,y)*(1-smooth(551,569,y))
   color=tint(color,strength*math.exp(-d/.85),(-18.,-32.,-34.))
  col=mix(orig,color,m)
  data[i:i+3]=bytes(max(0,min(255,round(v))) for v in col[::-1])
  data[i+3]=round(data[i+3]*clip_data[i+3]/255)
save_data('body/torso',data)

# The pelvis is repainted only through the leotard and its old seam shadows.
# Existing hip/thigh skin farther from the seam stays untouched.
hem=[(380,579),(409,579),(425,584),(442,596),(458,615),(475,643),(490,671),(501,682),(512,686)]
data=source_bytes('pelvis')
pelvis_edges={}
for y in range(510,716):
 xs=[x for x in range(379,646) if data[(y*W+x)*4+3]>128]
 if xs:pelvis_edges[y]=(min(xs),max(xs))
for y in range(510,716):
 for x in range(379,646):
  i=(y*W+x)*4
  if not data[i+3]:continue
  mirrored=x if x<=512 else 1024-x
  hy=interp(mirrored,hem)
  m=1-smooth(hy+4,hy+22,y)
  if m<=0:continue
  c=skin_trunk(x+.5,y+.5)
  # Soft lateral hip modelling and the existing leg junction, no fine anatomy.
  c=tint(c,g(x,y,395,631,12,57),(-5.,-10.,-10.5))
  c=tint(c,g(x,y,630,631,12,57),(-5.,-10.,-10.5))
  c=tint(c,g(x,y,512,684,12,22),(-7.0,-16.0,-18.0))
  c=tint(c,g(x,y,487,671,11,29),(-2.0,-6.0,-7.0))
  c=tint(c,g(x,y,538,671,11,29),(-2.0,-6.0,-7.0))
  if y in pelvis_edges:
   a,b=pelvis_edges[y];d=max(0,min(x-a,b-x))
   c=tint(c,smooth(518,536,y)*math.exp(-d/.85),(-18.,-32.,-34.))
  orig=(data[i+2],data[i+1],data[i]);c=mix(orig,c,m)
  data[i:i+3]=bytes(max(0,min(255,round(v))) for v in c[::-1])
save_data('pelvis',data)

# Preserve every original breast alpha value. Two soft lobe highlights and
# the underside shadows retain the original fullness and lower contour.
data=source_bytes('body/breast')
breast_edges={};breast_bottom={}
for y in range(333,460):
 xs=[x for x in range(420,604) if data[(y*W+x)*4+3]>128]
 if xs:breast_edges[y]=(min(xs),max(xs))
for x in range(420,604):
 ys=[y for y in range(333,460) if data[(y*W+x)*4+3]>128]
 if ys:breast_bottom[x]=max(ys)
for y in range(333,460):
 for x in range(420,604):
  i=(y*W+x)*4
  if not data[i+3]:continue
  dx=x-512
  neck=388-44*(abs(dx)/53.)**2.7
  m=smooth(neck-12,neck-2,y)
  tip=max(1-smooth(467,477,x),smooth(547,557,x))*(1-smooth(347,358,y))
  m=max(m,tip)
  if m<=0:continue
  c=(250.4,228.7,219.7)
  c=tint(c,g(x,y,470,390,35,36),(3.0,8.3,9.6))
  c=tint(c,g(x,y,552,390,35,36),(3.0,8.3,9.6))
  c=tint(c,g(x,y,430,405,15,32),(-5.,-13.,-15.))
  c=tint(c,g(x,y,594,405,15,32),(-5.,-13.,-15.))
  c=tint(c,g(x,y,471,450,36,10),(-8.0,-19.0,-21.))
  c=tint(c,g(x,y,553,450,36,10),(-8.0,-19.0,-21.))
  # The original exposed central cleavage continues gently through the repaired area.
  c=tint(c,g(x,y,512,386,2.5,21),(-14.,-30.,-31.))
  c=tint(c,g(x,y,512,411,5.,17),(-4.0,-10.,-12.))
  c=tint(c,g(x,y,512,436,12.,9.),(-2.0,-5.0,-6.0))
  if y>395 and y in breast_edges and x in breast_bottom:
   a,b=breast_edges[y];d=max(0,min(x-a,b-x,breast_bottom[x]-y))
   c=tint(c,smooth(395,414,y)*math.exp(-d/.8),(-7.,-15.,-17.))
  orig=(data[i+2],data[i+1],data[i]);c=mix(orig,c,m)
  data[i:i+3]=bytes(max(0,min(255,round(v))) for v in c[::-1])
save_data('body/breast',data)

for n in NODES.values():n.setVisible(True)
DOC.setActiveNode(NODES['body/breast'])
composite(OUT/'preview-working.png')
# Native isolation views are generated from the actual paint layers.
for pid in ['body/torso','body/breast','pelvis']:
 for key,n in NODES.items():n.setVisible(key==pid)
 composite(OUT/('inspection/native-'+pid.replace('/','_')+'.png'))
for pid,n in NODES.items():n.setVisible(pid in TARGETS or pid=='neck' or pid.startswith('arms/') or pid.startswith('legs/leg_right/leg') or pid.startswith('legs/leg_left/leg') or pid.endswith('/foot'))
composite(OUT/'inspection/native-body-stack.png')
for n in NODES.values():n.setVisible(True)
DOC.refreshProjection();DOC.waitForDone()
DOC.setBatchmode(False)
(OUT/'reconstruction.json').write_text(json.dumps({'changed':sorted(TARGETS),'breastAlphaPreserved':bytes(source_bytes('body/breast'))[3::4]==pixels(NODES['body/breast'])[3::4],'pelvisAlphaPreserved':bytes(source_bytes('pelvis'))[3::4]==pixels(NODES['pelvis'])[3::4],'torso':'Basic continuous rib cage; breast protrusion removed only here.','surface':'Skin colors sampled from exposed shoulder, breast, thigh; smooth broad form shading; no added fine anatomy.'},ensure_ascii=False,indent=2))
print('Reconstructed three layers. Ready for native isolated and composite visual review.')
