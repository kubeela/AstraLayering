from pathlib import Path
import xml.etree.ElementTree as ET
import re, json, hashlib, copy
E=Path(__file__).parent
P=E.parent/'candidates'/'character-v1.svg'
NS='http://www.w3.org/2000/svg'
ET.register_namespace('',NS)
tree=ET.parse(P); base=tree.getroot()
def ids(r): return {e.get('id'):e for e in r.iter() if e.get('id')}
def hide(e): e.set('display','none')
def save(r,n): ET.ElementTree(r).write(E/(n+'.svg'),encoding='utf-8',xml_declaration=True)
def clone():
 r=copy.deepcopy(base); return r,ids(r)
audit={'sha256':hashlib.sha256(P.read_bytes()).hexdigest().upper(),'id_count':len(ids(base)),'duplicate_ids':[],'unresolved_references':[],'eyes':{}}
seen=set()
for e in base.iter():
 i=e.get('id')
 if i and i in seen:audit['duplicate_ids'].append(i)
 if i:seen.add(i)
for e in base.iter():
 for k,v in e.attrib.items():
  refs= re.findall(r'url\(#([^\)]+)\)',v)
  if k in ('href','{http://www.w3.org/1999/xlink}href') and v.startswith('#'):refs.append(v[1:])
  for ref in refs:
   if ref not in seen:audit['unresolved_references'].append({'id':e.get('id'),'ref':ref})
for eye in ['eye_left','eye_right']:
 r,ii=clone()
 source=eye+'_upper_lash_outer_geometry'; ctrl=eye+'_upper_lash_outer_controller'
 audit['eyes'][eye]={'controller':ctrl,'geometry':source,'source_d':ii[source].get('d'),'source_references':[{'id':e.get('id'),'href':e.get('href'),'transform':e.get('transform')} for e in r.iter() if e.get('href')=='#'+ctrl],'gaze_children':[c.get('id') for c in ii[eye+'_gaze']],'component_order':[c.get('id') for c in ii[eye]]}
 ii[ctrl].set('transform','translate(0.75 -0.5)')
 save(r,eye+'-lash-moved')
 r,ii=clone()
 if eye=='eye_left':
  # Change one full upper boundary segment, spanning root side and front-hair reveal.
  before='C 479.3,194.43 481.74,194.0 482.6,194.62'
  after='C 479.3,193.93 481.74,193.4 482.6,194.12'
 else:
  before='C 407.80,194.78 405.48,196.15 402.85,196.45'
  after='C 407.80,194.28 405.48,195.55 402.85,195.95'
 assert before in ii[source].get('d')
 ii[source].set('d',ii[source].get('d').replace(before,after))
 audit['eyes'][eye]['local_edit']={'before':before,'after':after}
 save(r,eye+'-lash-edited')
 r,ii=clone(); ii[eye+'_gaze'].set('transform','translate(2 0)');save(r,eye+'-gaze-moved')
 # Actual front hair off, all eyelid surfaces off, iris fixed aperture off, full original sclera clip remains.
 r,ii=clone()
 for side in ['left','right']:
  hide(ii['hair_front_'+side]);hide(ii['eye_'+side+'_upper_lash_hair_overlay'])
 save(r,eye+'-no-hair')
 for other in ['eye_left','eye_right']:
  if other!=eye:hide(ii[other])
 for suffix in ['upper_lid','lower_lid','upper_lashes','eyelid_fold']:hide(ii[eye+'_'+suffix])
 ii[eye+'_aperture_window'].attrib.pop('clip-path')
 save(r,eye+'-uncovered-sclera-iris')
 hide(ii[eye+'_interior']);save(r,eye+'-sclera-alone')
 # Unclipped full iris (diagnostic; not a final rendering).
 r,ii=clone(); defs=copy.deepcopy(next(e for e in r if e.tag.endswith('defs')))
 full=ET.Element('{'+NS+'}svg',base.attrib);full.append(defs)
 gg=ET.SubElement(full,'{'+NS+'}g')
 ET.SubElement(gg,'{'+NS+'}use',{'href':'#'+eye+'_iris_geometry','fill':'#BCBCBC'})
 ET.SubElement(gg,'{'+NS+'}use',{'href':'#'+eye+'_pupil_geometry','fill':'#555555'})
 ET.SubElement(gg,'{'+NS+'}use',{'href':'#'+eye+'_highlight_geometry','fill':'white'})
 save(full,eye+'-full-iris')
 # Full lash alone proves one continuous filled shape rather than two separate fragments.
 full=ET.Element('{'+NS+'}svg',base.attrib);full.append(copy.deepcopy(defs))
 ET.SubElement(full,'{'+NS+'}use',{'href':'#'+ctrl,'fill':'#343434'})
 save(full,eye+'-full-lash')
 # Color-mapped visible aperture, with original front-hair and lashes masking it.
 for kind in ['aperture','iris']:
  full=ET.Element('{'+NS+'}svg',base.attrib);full.append(copy.deepcopy(defs))
  gg=ET.SubElement(full,'{'+NS+'}g',{'clip-path':'url(#'+eye+'_aperture_clip)'})
  ET.SubElement(gg,'{'+NS+'}use',{'href':'#'+eye+('_aperture_geometry' if kind=='aperture' else '_iris_geometry'),'fill':'black'})
  ET.SubElement(full,'{'+NS+'}use',{'href':'#hair_front_'+eye[4:]+'_eye_aligned_geometry','fill':'white'})
  ET.SubElement(full,'{'+NS+'}use',{'href':'#'+ctrl,'fill':'white'})
  save(full,eye+'-mask-'+kind)
r,ii=clone()
for e in r.iter():
 if e.get('data-role')=='construction-guide':e.attrib.pop('display',None)
save(r,'guides-on')
for e in r.iter():
 if e.get('data-role')=='construction-guide':e.set('display','none')
save(r,'guides-off-restored')
r,ii=clone()
for e in r.iter():
 if e.get('data-part') in ['eye_left','eye_right','brow_left','brow_right','nose','mouth','blush_left','blush_right']:hide(e)
save(r,'face-features-hidden')
audit['candidate_unchanged_after_variants']=hashlib.sha256(P.read_bytes()).hexdigest().upper()==audit['sha256']
(E/'structure-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
