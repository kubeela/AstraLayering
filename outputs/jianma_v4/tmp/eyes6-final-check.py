from pathlib import Path
from lxml import etree as E
from PIL import Image,ImageChops
import json,re,hashlib
out=Path('refinement/groups/eyes/6.投影与高光效果');ev=out/'evidence';r=E.parse(str(out/'character.svg')).getroot();allids=[x.get('id') for x in r.iter() if x.get('id')];ids=set(allids);assert len(allids)==len(ids);refs=[]
for el in r.iter():
 for k,v in el.attrib.items():
  refs+=re.findall(r'url\(#([^)]+)\)',v)
  if k.endswith('href') and v.startswith('#'):refs.append(v[1:])
assert set(refs)<=ids
parts=set(re.findall(r'^\s+- id:\s*(\S+)',''.join(Path('structure/parts.yaml').read_text(encoding='utf-8').splitlines(True)),re.M))
actual={el.get('data-part') for el in r.iter() if el.get('data-part')};assert actual==parts,(parts-actual,actual-parts)
new_effects=r.xpath('.//*[@data-kind="eyes" and @data-effect]');assert len(new_effects)==6
triples=[];relations=[]
for el in new_effects:
 target=el.get('data-target-id');assert target in ids
 targetnode=r.xpath('.//*[@id=$id]',id=target)[0];assert not targetnode.tag.endswith('clipPath')
 assert el.get('data-target-part') in parts and el.get('data-part')==el.get('data-target-part')
 assert not any(a.get('id','').endswith('_eye_black') for a in el.iterancestors())
 if el.get('data-effect')=='cast-shadow':
  src=el.get('data-source-id');assert src in ids and el.get('data-source-part') in parts
  triple=(el.get('data-source-part'),src,el.get('data-target-part'),target);assert triple not in triples;triples.append(triple)
 relations.append({k:el.get(k) for k in ['id','data-part','data-effect','data-source-part','data-source-id','data-target-part','data-target-id','clip-path'] if el.get(k) is not None})
for part in ['eye_right','eye_left']:
 get=lambda id:r.xpath('.//*[@id=$id]',id=id)[0]
 assert get(part+'_highlight').get('clip-path')=='url(#'+part+'_sclera_clip)'
 assert get(part+'_highlight_iris_surface_limit').get('clip-path')=='url(#'+part+'_iris_surface_clip)'
 assert get(part+'_upper_lid_on_iris').get('clip-path')=='url(#'+part+'_sclera_clip)'
 assert get(part+'_upper_lid_iris_surface_limit').get('clip-path')=='url(#'+part+'_iris_surface_clip)'
 assert get(part+'_interior').get('clip-path')=='url(#'+part+'_sclera_clip)'
 for suffix in ['sclera_shape','eye_black_shape']:
  path=get(part+'_'+suffix).get('d');assert path.count('M')==1 and path.endswith('Z')
prior=Image.open('refinement/groups/eyes/5.眼黑与装饰部件绘制/preview.png').convert('RGB');now=Image.open(out/'preview.png')
assert now.mode=='RGB' and now.size==(941,1672)
assert all(now.getpixel(p)==(255,255,255) for p in [(0,0),(940,0),(0,1671),(940,1671)])
assert ImageChops.difference(prior,Image.open(ev/'no-eye-effects.png').convert('RGB')).getbbox() is None
baseline=Image.open('refinement/groups/eyes/5.眼黑与装饰部件绘制/evidence/no-eyes.png').convert('RGB');assert ImageChops.difference(baseline,Image.open(ev/'no-eyes.png').convert('RGB')).getbbox() is None
for mode in ['no-upper-lids-or-their-shadows','no-front-hair-or-their-shadows']:
 variant=E.parse(str(ev/(mode+'.svg')))
 if mode.startswith('no-upper'):
  for part in ['eye_right','eye_left']:
   source=part+'_upper_eyelid';assert variant.xpath('.//*[@id=$id]',id=source)[0].get('display')=='none'
   cast=variant.xpath('.//*[@data-source-id=$id]',id=source);assert len(cast)==2 and all(el.get('display')=='none' for el in cast)
 else:
  for source in ['hair_front_right','hair_front_left']:
   assert variant.xpath('.//*[@id=$id]',id=source)[0].get('display')=='none'
   cast=variant.xpath('.//*[@data-source-part=$id]',id=source);assert len(cast)==1 and all(el.get('display')=='none' for el in cast)
v=json.loads((ev/'validation.json').read_text(encoding='utf-8'))
v.update({'manifest_part_count':len(parts),'all_manifest_parts_present':True,'all_resource_references_valid':True,'resource_reference_count':len(refs),'effect_source_target_ids_valid':True,'highlights_independent_of_eye_black':True,'iris_casts_independent_of_eye_black':True,'target_clips_intersections_valid':True,'one_cast_fragment_per_source_target_surface':True,'source_off_includes_all_linked_fragments':True,'complete_sclera_and_iris_paths_valid':True,'effects_off_pixel_identical_to_step5':True,'all_eye_parts_and_effects_off_pixel_identical_to_step5_eyes_off':True,'preview_white_rgb':True,'preview_size':list(now.size),'effects':relations,'svg_sha256':hashlib.sha256((out/'character.svg').read_bytes()).hexdigest()})
(ev/'validation.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:v[k] for k in ['manifest_part_count','unique_ids','resource_reference_count','effect_source_target_ids_valid','highlights_independent_of_eye_black','source_off_includes_all_linked_fragments','all_eye_parts_and_effects_off_pixel_identical_to_step5_eyes_off','svg_sha256']},ensure_ascii=False))
