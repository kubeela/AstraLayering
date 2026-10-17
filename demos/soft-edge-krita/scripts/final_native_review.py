"""Read-only native visibility review, then save/reopen/pixel verification."""
DOC.setBatchmode(True)
for level in range(90):
 native_states(level)
 if level%15==14:(RUN/'native-review-progress.json').write_text(json.dumps({'layersExported':level+1,'total':90}))
checkpoint()
expected={n.name():digest(n) for n in NODES.values()}
order=list(expected)
kra=OUT/'character-soft-edges-final.kra'
DOC.waitForDone()
assert DOC.close()
DOC=APP.openDocument(str(kra));assert DOC
DOC.setBatchmode(True)
VIEW=APP.activeWindow().addView(DOC)
layers=DOC.rootNode().childNodes()
assert [n.name() for n in layers]==order
assert all(n.type()=='paintlayer' and not n.childNodes() and n.visible() and n.opacity()==255 for n in layers)
assert all(digest(n)==expected[n.name()] for n in layers)
NODES={n.name().split(' ',1)[1]:n for n in layers}
composite(OUT/'preview-final.png')
report={'ok':True,'scope':'Native storage and visibility verification; visual findings are recorded separately.','file':kra.name,'canvas':[DOC.width(),DOC.height()],'kritaVersion':APP.version(),'paintLayers':len(layers),'masks':0,'childNodes':0,'order':order,'reopenedPixelMatches':len(layers),'layerPixelSha256':expected,'nativeIsolatedExports':90,'nativeLowerStackExports':90}
(OUT/'final-reopen-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
DOC.setBatchmode(False)
VIEW.canvas().setZoomLevel(.65)
print('FINAL NATIVE STORAGE CHECK: 90 plain paint layers, zero masks or children, order and all pixels identical after reopen.')
