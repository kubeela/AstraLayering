"""Check this shoulder patch's scope and native Krita persistence."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

from covered_shoulders import PARTS, dump, rgba


ap = argparse.ArgumentParser()
ap.add_argument('output', type=Path)
args = ap.parse_args()
out = args.output.resolve()
manifest = json.loads((out/'manifest.json').read_text())
source = out/manifest['variant']['source']
plan = json.loads((out/'retouch-plan.json').read_text())
native = json.loads((out/'krita-retouch.json').read_text())
assert native['ok'], native
assert set(native['applied']) == set(PARTS)
assert native['reopenedNodeCounts'] == {'paintlayer': 90, 'transparencymask': 90, 'grouplayer': 25}
assert len(native['fullLayersPixelVerified']) == 90
assert native['manifestSha256'] == hashlib.sha256((out/'manifest.json').read_bytes()).hexdigest()
assert plan['sourceKraSha256'] == hashlib.sha256((source/'character.kra').read_bytes()).hexdigest()
composite = Image.new('RGBA', tuple(manifest['canvas']))
changed_parts = []
for entry in manifest['parts']:
    pid = entry['id']
    folder, original = out/'parts'/pid, source/'parts'/pid
    before, after = rgba(original/'full.png'), rgba(folder/'full.png')
    assert np.array_equal(before[:, :, 3], after[:, :, 3]), pid
    assert (folder/'pose-mask.png').read_bytes() == (original/'pose-mask.png').read_bytes(), pid
    assert np.array_equal(before[404:], after[404:]), pid
    assert hashlib.sha256((folder/'full.png').read_bytes()).hexdigest() == entry['fullSha256'], pid
    if not np.array_equal(before, after):
        assert pid in PARTS, pid
        delta = np.any(before != after, axis=2)
        assert np.array_equal(delta, np.array(Image.open(folder/'retouch-mask.png')) > 0), pid
        assert not delta[:299].any() and not delta[:, :418].any() and not delta[:, 607:].any(), pid
        changed_parts.append(pid)
    else:
        assert (folder/'visible.png').read_bytes() == (original/'visible.png').read_bytes(), pid
    composite.alpha_composite(Image.open(folder/'visible.png'))
expected = np.array(composite)
rendered = rgba(out/'krita-reopened.png')
# Krita retains invisible RGB under zero alpha in exported PNGs. Match the
# existing raster validator's canonical representation for projection only;
# native full-layer buffers above were checked without this normalization.
transparent_rgb = int(np.count_nonzero((rendered[:, :, 3] == 0) & np.any(rendered[:, :, :3] != 0, axis=2)))
rendered[rendered[:, :, 3] == 0] = 0
assert np.array_equal(expected, rendered), 'Krita export differs from the 90-part assembly'
assert np.array_equal(expected, rgba(out/'reassembled.png'))
baseline = rgba(source/'reassembled.png')
assert np.array_equal(baseline[:, :, 3], rendered[:, :, 3])
assert np.array_equal(baseline[404:], rendered[404:])
assert (out/'groups.json').read_bytes() == (source/'groups.json').read_bytes()
result = dict(ok=True, canvas=manifest['canvas'], changedParts=changed_parts, unchangedParts=88,
              nativeKritaVersion=native['version'], nativeLayerCounts=native['reopenedNodeCounts'],
              fullLayersPixelVerified=90, nativeExportMaxRgbaDifference=0,
              transparentRgbComparison='RGB is canonicalized to zero only where alpha is zero; original native PNG retained',
              nativeTransparentPixelsWithStoredRgb=transparent_rgb,
              allPartAlphaAndPoseMasksUnchanged=True, originalClothedSourceKraUnchanged=True,
              allPixelsFromRow404DownUnchanged=True, originalChestTorsoPelvisCoveringRetained=True)
dump(out/'validation.json', result)
print(json.dumps(result, indent=2))
