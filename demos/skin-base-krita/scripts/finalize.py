DOC.setBatchmode(True)
for pid,n in NODES.items():n.setVisible(BASE[pid]['visible'])
for pid in TARGETS:NODES[pid].setColorLabel(6)
expected={pid:digest(n) for pid,n in NODES.items()}
changed=[pid for pid in NODES if expected[pid]!=BASE[pid]['sha256']]
assert set(changed)==TARGETS,changed
for pid,n in NODES.items():
 assert n.name()==BASE[pid]['name'] and n.type()==BASE[pid]['type'] and n.opacity()==BASE[pid]['opacity']
 assert not n.childNodes()
 export_node(n,OUT/'parts'/pid/'full.png')
breast_alpha=pixels(NODES['body/breast'])[3::4]
pelvis_alpha=pixels(NODES['pelvis'])[3::4]
assert breast_alpha==bytes(source_bytes('body/breast'))[3::4]
assert pelvis_alpha==bytes(source_bytes('pelvis'))[3::4]
assert hashlib.sha256(SRC.read_bytes()).hexdigest()==json.loads((OUT/'inventory.json').read_text())['sourceFileSha256']
DOC.setActiveNode(NODES['body/breast']);DOC.refreshProjection();DOC.waitForDone()
assert DOC.saveAs(str(OUT/'character-skin-base.kra'));DOC.waitForDone()
assert DOC.close()
DOC=APP.openDocument(str(OUT/'character-skin-base.kra'));assert DOC
DOC.setBatchmode(True)
VIEW=APP.activeWindow().addView(DOC)
NODES={n.name().split(' ',1)[1]:n for n in DOC.rootNode().childNodes()}
assert list(NODES)==list(BASE)
for pid,n in NODES.items():
 assert n.name()==BASE[pid]['name'] and n.type()=='paintlayer' and not n.childNodes()
 assert digest(n)==expected[pid],pid
 assert n.visible()==BASE[pid]['visible'] and n.opacity()==BASE[pid]['opacity']
 assert n.colorLabel()==(6 if pid in TARGETS else BASE[pid]['label'])
composite(OUT/'preview-final.png')
for pid in ['body/torso','body/breast','pelvis']:
 for key,n in NODES.items():n.setVisible(key==pid)
 composite(OUT/('inspection/native-'+pid.replace('/','_')+'.png'))
for pid,n in NODES.items():n.setVisible(pid!='body/breast')
composite(OUT/'inspection/native-no-breast.png')
for pid,n in NODES.items():n.setVisible(BASE[pid]['visible'])
DOC.setActiveNode(NODES['body/breast']);DOC.refreshProjection();DOC.waitForDone()
DOC.setBatchmode(False)
APP.action('zoom_to_fit').trigger()
report={'ok':True,'file':'character-skin-base.kra','source':str(SRC),'canvas':[W,H],'kritaVersion':APP.version(),'paintLayers':len(NODES),'masks':0,'childNodes':0,'reopenedPixelMatches':len(NODES),'changedParts':changed,'unchangedParts':90-len(changed),'sourceFileUnchanged':True,'breastAlphaExactlyPreserved':True,'pelvisAlphaExactlyPreserved':True,'torsoSimplified':True,'targetColorLabel':6,'targetColor':'red','orderAndNamesPreserved':True,'opacityAndVisibilityPreserved':True,'layerPixelSha256':expected,'visualReview':{'all90Parts':'Isolated thumbnails inspected before edits; marked only pelvis, torso and breast as bodysuit-related.','body/torso':'Shoulders and clavicle retained; straps, neckline, seams and breast protrusion removed; continuous basic rib cage and warm skin restored.','body/breast':'Original alpha copied exactly; two breast volumes and lower contours retained in smooth skin shading; remaining strap tips removed.','pelvis':'Cloth replaced with skin matching hip and thigh context; original alpha and thigh shape retained.','overlaps':'Torso/pelvis and pelvis/leg transitions viewed in native composite; no old garment hem drawn into the skin.','magnification':'Full canvas and 200–400% crops of the three affected parts, plus hidden-breast lower stack.'}}
(OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Saved and reopened: all 90 layer pixels match; exactly three parts changed; original breast alpha and source KRA preserved.')
