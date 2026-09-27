from pathlib import Path
import xml.etree.ElementTree as E
import re,sys
ROOT=Path(r'D:\Resources\workspace\AstraLayering\outputs\jianma_clothing')
NS='http://www.w3.org/2000/svg'
E.register_namespace('',NS);E.register_namespace('xlink','http://www.w3.org/1999/xlink')
OUTFIT='jianma_blue_white_ceremonial'
def el(tag,**a):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in a.items()})
def text(g,t,s):
 n=el(t);n.text=s;g.append(n);return n
def group(i,layer,part=None,desc='',**a):
 g=el('g',id=i,data_part=part or i,data_kind='clothing',data_outfit_id=OUTFIT,data_wear_layer=layer,**a)
 text(g,'desc',desc);return g
def path(g,i,d,fill='#F2F1F0',stroke='none',width='.9',role='complete-clothing-surface',**a):
 p=el('path',id=i,d=d,fill=fill,stroke=stroke,stroke_width=width,data_role=role,stroke_linejoin='round',stroke_linecap='round',**a);g.append(p);return p
def line(g,i,d,width='.8',stroke='#92959E',**a):return path(g,i,d,'none',stroke,width,'formal-clothing-line',**a)
def mirror(d,axis=444.5):
 toks=re.findall(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)',d);res=[];x=True
 for t in toks:
  if t.isalpha():res.append(t);x=True
  else:
   n=float(t);res.append(f'{2*axis-n if x else n:g}');x=not x
 return ' '.join(res)
class Drawing:
 def __init__(self,source):
  self.tree=E.parse(ROOT/source);self.root=self.tree.getroot();self.defs=next(n for n in self.root if n.tag.endswith('defs'))
 def node(self,i):return next(n for n in self.root.iter() if n.get('id')==i)
 def before(self,g,i):self.root.insert(list(self.root).index(self.node(i)),g)
 def after(self,g,i):self.root.insert(list(self.root).index(self.node(i))+1,g)
 def clip(self,part,shape):
  cp=el('clipPath',id=part+'_surface_clip',clipPathUnits='userSpaceOnUse');cp.append(el('use',href='#'+shape,clip_rule='evenodd'));self.defs.append(cp)
 def save(self,batch):
  sys.path.insert(0,r'D:\Resources\workspace\AstraLayering\workflows\tools')
  from svg_preview import validate_svg_resources
  validate_svg_resources(self.root)
  target=ROOT/'3.衣装线稿'/batch/'character.svg';target.parent.mkdir(parents=True,exist_ok=True)
  self.tree.write(target,encoding='utf-8',xml_declaration=True);print(target)
