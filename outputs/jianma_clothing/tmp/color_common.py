from clothing_common import *
import copy,json
class Color(Drawing):
 def __init__(self,source):
  super().__init__(source)
  self.before_geometry={n.get('id'):n.get('d') for n in self.root.iter() if n.get('id') and n.tag.endswith('path')}
 def grad(self,i,x1,y1,x2,y2,stops):
  n=el('linearGradient',id=i,gradientUnits='userSpaceOnUse',x1=x1,y1=y1,x2=x2,y2=y2)
  for stop in stops:
   p,c,*a=stop;n.append(el('stop',offset=p,stop_color=c,stop_opacity=a[0] if a else 1))
  self.defs.append(n);return 'url(#'+i+')'
 def radial(self,i,cx,cy,rx,ry,stops):
  n=el('radialGradient',id=i,gradientUnits='userSpaceOnUse',cx=cx,cy=cy,r=rx,gradientTransform=f'translate(0 {cy}) scale(1 {ry/rx}) translate(0 {-cy})')
  for stop in stops:
   p,c,*a=stop;n.append(el('stop',offset=p,stop_color=c,stop_opacity=a[0] if a else 1))
  self.defs.append(n);return 'url(#'+i+')'
 def blur(self,i,sigma):
  n=el('filter',id=i,x='-30%',y='-30%',width='160%',height='160%',color_interpolation_filters='sRGB');n.append(el('feGaussianBlur',stdDeviation=sigma));self.defs.append(n);return 'url(#'+i+')'
 def setfill(self,i,color):self.node(i).set('fill',color)
 def intrinsic(self,part,clip=None):
  n=group(part+'_color_material',self.node(part).get('data-wear-layer'),part,desc='参考色盘完成的固有材料体积与折面，不含外来投影。',data_role='intrinsic-clothing-material',clip_path='url(#'+(clip or part+'_surface_clip')+')')
  owner=self.node(part)
  at=next((j for j,c in enumerate(owner) if c.get('data-role')=='formal-clothing-line'),len(owner))
  owner.insert(at,n);return n
 def mark(self,part,notes):
  n=self.node(part);n.set('data-color-status','reference-colored');n.set('data-palette-source','4.衣装色盘/palette.json');text(n,'desc',notes)
 def shade(self,i,source,sourcepart,target,targetpart,layer,source_layer,dx=0,dy=2.2,color='#A7B2D8',alpha='.35',sigma='.8',parent=None):
  # Sources remain complete editable paths and are translated in their original
  # canvas coordinates before clipping to the exact (possibly holed) receiver.
  cache=el('path',id=i+'_complete_projection',d=self.node(source).get('d'),transform=f'translate({dx} {dy})',data_role='complete-projection-geometry',data_source_id=source);self.defs.append(cache)
  clip=targetpart+'_surface_clip'
  g=el('g',id=i,data_part=targetpart,data_kind=self.node(targetpart).get('data-kind','clothing'),data_effect='cast-shadow',data_source_part=sourcepart,data_source_id=source,data_target_part=targetpart,data_target_id=target,data_outfit_id=OUTFIT,data_wear_layer=layer,data_source_layer=source_layer,data_target_layer=layer,data_complete_path=i+'_complete_projection',clip_path='url(#'+clip+')',opacity=alpha)
  text(g,'desc',f'完整 source={source} 平移 ({dx},{dy}) 后落在 target={target}；外层精确裁切，内层柔化；随 {source_layer} 与 {layer} 两层共同显隐。')
  use=el('use',id=i+'_paint',href='#'+cache.get('id'),fill=color,stroke='none')
  if sigma:use.set('filter',self.blur(i+'_soft',sigma))
  g.append(use);(parent if parent is not None else self.node(targetpart)).append(g);return g
 def recolor_lines(self,part,color='#8F9BB1',width=None,opacity='.8'):
  for n in self.node(part).iter():
   if n.get('data-role')=='construction-guide':n.set('display','none')
   if n.get('data-role')=='formal-clothing-line':
    n.set('stroke',color);n.set('stroke-opacity',opacity)
    if width:n.set('stroke-width',str(width))
 def dependency(self,item):
  n=next((n for n in self.root if n.get('id')=='outfit_visibility_dependencies'),None)
  if n is None:n=el('metadata',id='outfit_visibility_dependencies');n.text='[]';self.root.append(n)
  a=json.loads(n.text);a.append(item);n.text=json.dumps(a,ensure_ascii=False)
 def save_color(self,batch):
  for n in self.root.iter():
   if n.get('id') in self.before_geometry:assert n.get('d')==self.before_geometry[n.get('id')],n.get('id')+' approved geometry changed'
  sys.path.insert(0,r'D:\Resources\workspace\AstraLayering\workflows\tools')
  from svg_preview import validate_svg_resources
  validate_svg_resources(self.root)
  out=ROOT/'5.分批着色与成稿'/batch/'character.svg';out.parent.mkdir(parents=True,exist_ok=True);self.tree.write(out,encoding='utf-8',xml_declaration=True);print(out)
