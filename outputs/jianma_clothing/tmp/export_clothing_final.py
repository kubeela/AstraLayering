from clothing_common import *
import copy,json,subprocess,concurrent.futures
from PIL import Image,ImageDraw,ImageFont,ImageOps
sys.path.insert(0,r'D:\Resources\workspace\AstraLayering\workflows\tools')
from svg_preview import validate_svg_resources,LOCAL_URL,RESOURCES

final=ROOT/'final';tree=E.parse(final/'character.svg');root=tree.getroot()
byid={n.get('id'):n for n in root.iter() if n.get('id')}
parent={n:p for p in root.iter() for n in p}
structure=json.loads((ROOT/'1.衣装结构与穿戴分析/结构安排.json').read_text(encoding='utf8'))
plan={p['id']:p for p in structure['parts']};layernames={l['id']:l['name'] for l in structure['layers'] if l['id']!='foot_jewelry'}
def tag(n):return n.tag.split('}')[-1]
def ancestors(n):
 out=[];p=parent.get(n)
 while p is not None:out.append(p);p=parent.get(p)
 return list(reversed(out))
def is_resource(n):return any(tag(a) in RESOURCES for a in [n]+ancestors(n))
def owned(n):return n.get('data-outfit-id')==OUTFIT
entities=[n for n in root.iter() if owned(n) and tag(n)=='g' and not is_resource(n) and not any(owned(a) for a in ancestors(n))]
effects=[n for n in root.iter() if owned(n) and n.get('data-effect') and not is_resource(n)]
def layer_for(n):
 for x in [n]+list(reversed(ancestors(n))):
  if x.get('data-wear-layer') in layernames:return x.get('data-wear-layer')
 return None
def placement(n,pr=parent,rt=root):
 p=pr.get(n);siblings=[x for x in p if x.get('id')] if p is not None else []
 at=siblings.index(n) if n in siblings else -1
 return {'parent_id':p.get('id') or 'svg-root' if p is not None else None,'child_order':list(p).index(n) if p is not None else None,'previous_id':siblings[at-1].get('id') if at>0 else None,'next_id':siblings[at+1].get('id') if at>=0 and at+1<len(siblings) else None}

# Preserve each independent entity. No base artwork is copied into display.
export=E.Element(root.tag,dict(root.attrib));export.set('data-outfit-id',OUTFIT);export.set('data-usage','layered-material-collection-requires-index-interleaving')
text(export,'title','剑麻蓝白衣装 · 分层素材集合')
text(export,'desc','保留原 941 × 1672 坐标。此文件是分层素材集合；重穿须按 clothing-index.json 穿插到素体及其它衣件，不能将整张置于人物最上层。必要素体轮廓只作为非显示裁切资源。')
defs=el('defs');export.append(defs)
context_attrs={'transform','opacity','style','clip-path','mask','fill','stroke','stroke-width','fill-rule','color','display','visibility','filter'}
for n in entities:
 item=copy.deepcopy(n)
 for a in reversed(ancestors(n)):
  if a is root:continue
  attrs={k:v for k,v in a.attrib.items() if k in context_attrs}
  if attrs:
   wrap=E.Element('{'+NS+'}g',attrs);wrap.set('data-export-context-from',a.get('id','unnamed'));wrap.append(item);item=wrap
 export.append(item)

def refs(n):
 found=set()
 for x in n.iter():
  for v in x.attrib.values():found.update(LOCAL_URL.findall(v))
  href=x.get('href',x.get('{http://www.w3.org/1999/xlink}href',''))
  if href.startswith('#'):found.add(href[1:])
  if tag(x)=='style':found.update(LOCAL_URL.findall(x.text or ''))
 return found
have={n.get('id') for n in export.iter() if n.get('id')}
pending=refs(export)|{n.get('id') for n in root.iter() if owned(n) and is_resource(n) and n.get('id')}
base_resources=[]
while pending-have:
 i=sorted(pending-have)[0];source=byid[i];r=copy.deepcopy(source)
 # A direct shape referenced only by a clip is a resource, never visible skin.
 if not is_resource(source) and not any(owned(a) for a in [source]+ancestors(source)):
  assert tag(source) in {'path','ellipse','circle','rect','polygon','polyline','line'},i
  keep={'id','d','x','y','cx','cy','r','rx','ry','width','height','points','x1','x2','y1','y2','transform','fill-rule','clip-rule'}
  r.attrib={k:v for k,v in r.attrib.items() if k in keep};r.set('fill','black');r.set('stroke','none');r.set('data-resource-origin','base-svg-receiver-geometry-only')
  # Current body receivers have no transformed ancestors. Fail explicitly if
  # future geometry would require flattening before a direct clip-path use.
  assert not any(a.get('transform') for a in ancestors(source)),i+' receiver needs transform flattening'
  base_resources.append(i)
 defs.append(r);have.update(n.get('id') for n in r.iter() if n.get('id'));pending.update(refs(r))
validate_svg_resources(export)
for n in export:
 if tag(n) not in RESOURCES:
  for x in n.iter():assert not x.get('id','').startswith('foot_chain'),x.get('id')
E.ElementTree(export).write(final/'clothing.svg',encoding='utf-8',xml_declaration=True)

effect_index=[]
for n in effects:
 sl=n.get('data-source-layer');tl=n.get('data-target-layer') or layer_for(byid.get(n.get('data-target-id'),n))
 if not sl and n.get('data-source-id') in byid:sl=layer_for(byid[n.get('data-source-id')])
 deps=sorted({v for v in [sl,tl,layer_for(n)] if v in layernames})
 effect_index.append({'id':n.get('id'),'type':n.get('data-effect'),'source_id':n.get('data-source-id'),'source_part':n.get('data-source-part'),'target_id':n.get('data-target-id'),'target_part':n.get('data-target-part'),'source_layer':sl,'target_layer':tl,'depends_on_layers':deps,'complete_projection_id':n.get('data-complete-path'),'receiver_clip':n.get('clip-path'),'visibility_mask':n.get('mask'),'paint_order':placement(n)})

controls={'waist_tail_right','waist_tail_left','gauze_sleeve_right_tail','gauze_sleeve_left_tail','pendant_beads_sphere_1','pendant_beads_sphere_2','pendant_beads_sphere_3'}
part_nodes=[n for n in entities if not n.get('data-effect')]+[byid[i] for i in sorted(controls)]
parts=[]
for n in part_nodes:
 logical=n.get('data-part',n.get('id'));p=plan.get(logical,{})
 desc='\n'.join(x.text or '' for x in n if tag(x)=='desc')
 attach=re.search(r'attach_to=([^；。]+)',desc)
 coords=re.findall(r'\((\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\)',desc)
 parts.append({'id':n.get('id'),'logical_part':logical,'name':p.get('name',logical),'layer_id':layer_for(n),'origin':'new-drawing','attach_to':attach.group(1) if attach else p.get('attach_to','随所属完整衣片'),'fixed_points_canvas':[[float(x),float(y)] for x,y in dict.fromkeys(coords)],'draw_order':placement(n),'nested_control':n.get('id') in controls,'notes':desc})

dependencies=json.loads(byid['outfit_visibility_dependencies'].text)
base=E.parse(r'D:\Resources\workspace\AstraLayering\outputs\jianma_v4\refinement\groups\clothing\character.svg').getroot();baseids={n.get('id'):n for n in base.iter() if n.get('id')};baseparents={n:p for p in base.iter() for n in p}
reuse=[]
for sid in ['foot_chain_left','foot_chain_right','foot_chain_left_2','foot_chain_right_2']:
 reuse.append({'id':sid,'origin':'base-svg-reuse','layer_id':'base:foot_jewelry','exported':False,'draw_order':placement(byid[sid]),'original_draw_order':placement(baseids[sid],baseparents,base),'notes':'素体保有原节点、原色及投影；本套不赋 outfit_id，不复制进 clothing.svg。'})
 if sid in ['foot_chain_left','foot_chain_right']:
  dependencies.append({'id':sid,'type':'base_draw_order_adjustment','layers':['skirts'],'original_placement':placement(baseids[sid],baseparents,base),'default_placement':placement(byid[sid]),'when_outfit_removed':'可恢复原素体绘制位置；默认穿戴时足链位于裙前片之前，由真实裙脚遮挡。无需删除或重画原足链。'})
layers=[]
for lid,name in layernames.items():
 ids=[n.get('id') for n in entities if layer_for(n)==lid and not n.get('data-effect')]
 fx=[v['id'] for v in effect_index if lid in v['depends_on_layers']]
 restore=[v for v in dependencies if v.get('type')=='base_effect_outfit_occlusion' and lid in v['layers']]
 layers.append({'id':lid,'name':name,'entity_ids':ids,'dependent_effect_ids':fx,'when_disabled':{'hide_entity_ids':ids,'hide_effect_ids':fx,'restore_base_attributes':[{'id':v['id'],'attributes':v['original_attributes']} for v in restore]},'when_enabled':{'show_entity_ids':ids,'effects_condition':'仅当 depends_on_layers 中的全部衣层开启、真实来源/承影实体也可见时启用；本图无动画绑定。','apply_base_attributes':[{'id':v['id'],'attributes':v['default_attributes']} for v in restore]}})
index={'outfit_id':OUTFIT,'viewBox':root.get('viewBox'),'canvas':[941,1672],'coordinate_system':'原画布绝对坐标，当前实体无待展开的祖先变换。','files':{'character_svg':'character.svg','clothing_svg':'clothing.svg','preview':'preview.png','comparison':'成稿对照.png'},'usage':'clothing.svg 是分层素材集合。按 parts.draw_order 的实际 parent_id/previous_id/next_id 穿插回同版素体；不得整张置顶。将集合中独立的素体承影效果插回其实际承影父节点。','layers':layers,'parts':parts,'reused_base_parts':reuse,'effects':effect_index,'visibility_dependencies':dependencies,'resource_only_base_shapes':base_resources,'inferences':['白绸不可见背片按对应前片材料补全；背光与隐藏褶向为保守推断。','透明纱采用推断本色 #76B0E8；前幅/长尾共用 .38，后幅 .35，真实内翻面另加 .22，实际双层有效覆盖约 .5164。人工平接口 y=884 不累加 alpha。','蓝中裙保持完整不透明轻绸，浅蓝透光感由独立亮面及薄边体现；单张合成参考不能唯一确定布料 alpha。','软结短影落在实际腰带/尾根，底下内搭与裙腰在腰带遮挡区不重复显影。'],'status':{'default_pose':'colored static final','layer_toggle_check':'饰物层整体关闭及内搭领层关闭，连带承影/遮罩同步处理；仅静态自查。','not_bound':['衣层开关运行时绑定','肩肘腕和腰部固定点跟随','软链和垂带/纱尾的动态响应','珠体/丝穗摆动','姿态变化后的投影更新与动态角度验证']}}
(final/'clothing-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2),encoding='utf8')

# Two temporary states are built from the index, including effect dependencies
# and the collar-specific mask restore on the original face-to-neck effect.
tmp=ROOT/'tmp/final-check';tmp.mkdir(exist_ok=True)
def toggle(disabled,name):
 r=copy.deepcopy(root);ids={n.get('id'):n for n in r.iter() if n.get('id')}
 for layer in layers:
  if layer['id'] in disabled:
   for i in layer['when_disabled']['hide_entity_ids']+layer['when_disabled']['hide_effect_ids']:ids[i].set('display','none')
   for change in layer['when_disabled']['restore_base_attributes']:
    for k,v in change['attributes'].items():
     if v is None:ids[change['id']].attrib.pop(k,None)
     else:ids[change['id']].set(k,v)
 # Resource definitions remain definitions. No dependent shadow is left visible.
 for e in effect_index:
  if set(e['depends_on_layers'])&disabled:assert ids[e['id']].get('display')=='none'
 if 'inner_top' in disabled:assert not ids['fx_body5_face_on_neck'].get('mask')
 validate_svg_resources(r);path=tmp/(name+'.svg');E.ElementTree(r).write(path,encoding='utf-8',xml_declaration=True);return path
off_ornaments=toggle({'ornaments'},'ornaments-off');off_inner=toggle({'inner_top'},'inner-top-off')
tool=Path(r'D:\Resources\workspace\AstraLayering\workflows\tools\svg_preview.py')
jobs=[(final/'character.svg',final/'preview.png'),(off_ornaments,tmp/'ornaments-off.png'),(off_inner,tmp/'inner-top-off.png')]
def render(job):
 src,dst=job;subprocess.run([sys.executable,str(tool),str(src),str(dst),'--background','white'],check=True,cwd=ROOT,stdout=subprocess.DEVNULL)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(render,jobs))
reference=Image.open(ROOT/'inputs/outfit_reference.png').convert('RGB');default=Image.open(final/'preview.png').convert('RGB');orn_off=Image.open(tmp/'ornaments-off.png').convert('RGB');inner_off=Image.open(tmp/'inner-top-off.png').convert('RGB')
font=ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc',20);small=ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc',16);big=ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc',30)
board=Image.new('RGB',(1880,2160),'#EDF1F7');dr=ImageDraw.Draw(board)
dr.text((25,14),'剑麻蓝白衣装 · 静态成稿对照',font=big,fill='#24354C')
dr.text((26,58),'同坐标对照｜实体、投影与显隐依赖同步检查｜既有足链保留素体身份',font=small,fill='#52627A')
def card(x,y,w,h,title,im):
 dr.rounded_rectangle((x+7,y+7,x+w-7,y+h-7),radius=9,fill='white',outline='#CBD5E3')
 dr.text((x+18,y+16),title,font=font,fill='#314563')
 fit=ImageOps.contain(im,(w-30,h-66),Image.Resampling.LANCZOS);board.paste(fit,(x+(w-fit.width)//2,y+51+(h-62-fit.height)//2))
for j,(title,im) in enumerate([('原始衣装参考',reference),('默认穿戴 · 最终稿',default),('同坐标混合 · 50%',Image.blend(reference,default,.5)),('饰物关闭 · 连带投影已关闭',orn_off)]):card(j*470,91,470,855,title,im)
def paired(a,b,box,labels=('参考','成稿')):
 aa=a.crop(box);bb=b.crop(box);w,h=aa.size;im=Image.new('RGB',(2*w+8,h+30),'white');di=ImageDraw.Draw(im);di.text((4,3),labels[0],font=small,fill='#4A5A72');di.text((w+12,3),labels[1],font=small,fill='#4A5A72');im.paste(aa,(0,30));im.paste(bb,(w+8,30));return im
row2=[('胸饰金属 / 胸衣开口',paired(reference,default,(353,303,535,468))),('硬珠 / 软链 / 丝束根',paired(reference,default,(400,812,474,1070))),('内搭领关闭 · 恢复原颈影',paired(default,inner_off,(384,260,506,373),('默认','内搭领关闭')))]
for j,(title,im) in enumerate(row2):card(j*626+1,954,626,512,title,im)
row3=[('纱袖平接 · y=884 无增深带',paired(reference,default,(166,821,290,970))),('荷叶边 / 蓝裙承影',paired(reference,default,(310,765,433,1110))),('裙脚 / 原足链与投影',paired(reference,default,(321,1460,558,1665)))]
for j,(title,im) in enumerate(row3):card(j*626+1,1472,626,605,title,im)
dr.text((25,2090),'色层推断：隐藏后片沿同材料补全；纱前幅单次透明度 0.38、背幅 0.35，真实翻折额外 0.22。',font=small,fill='#58667D')
dr.text((25,2120),'本页为默认姿态与静态开关检查；动作跟随、物理摆动和姿态投影更新须后续绑定。',font=small,fill='#58667D')
board.save(final/'成稿对照.png')
assert (final/'character.svg').read_bytes()==(ROOT/'5.分批着色与成稿/color_ornaments_export/character.svg').read_bytes()
print('Exported',len(entities),'independent entities;',len(parts),'part/control records;',len(effect_index),'effects;',len(have),'resource/artwork ids.')
print('Base receiver resources:',base_resources)
for p in ['clothing.svg','clothing-index.json','preview.png','成稿对照.png']:print(final/p)
