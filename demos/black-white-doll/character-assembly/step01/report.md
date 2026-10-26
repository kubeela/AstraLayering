# Character assembly report (step01)

Deliverables (all in this directory)
- `character-assembled.kra` – new project, 1086x1448, 100 paint layers + 2 native transparency masks (inputs untouched).
- `character-assembled.png` – transparent-background composite exported from Krita (alpha 0..255).
- `layer-map.json` – new layer name -> source project / original layer name for all 100 layers.
- `workspace/diagnostics/` – Krita-exported composites (masks on / off, solo layers, reopened composite), `workspace/diagnostics/crops/` – same-coordinate comparison crops. `workspace/scripts/` – generation/verification scripts. `workspace/pixel-review/` – tool outputs (see "Part-scoped detection runs").

Note on crop images: `crops/*` made with `workspace/scripts/cmp.py` have the **current composite on the left and the reference on the right** (grey background).

## 1. Registration

The clothing KRA was not in canvas coordinates. One uniform scale + translation was applied to the whole outfit first, then each existing part group got a small local fit. All transforms are pure resampling (premultiplied bicubic, area filtered) of the existing pixels; nothing was painted, split, merged or flattened. Reference and canvas size/coordinates were never moved.

| Step | Parts (clothing layers) | (sx, sy, tx, ty) |
|---|---|---|
| Global uniform | whole outfit; used as-is for straps L3/L4/L6/L7 | 0.402, 0.402, 324.3, 172.5 |
| Skirt body fit | skirt_body L1/L10/L13 | 0.40054, 0.44166, 325.211, 142.989 |
| Bodice fit | camisole/bodice L5/L9/L12 | 0.3937, 0.4045, 329.17, 172.43 |
| Waistband fit | pleated_skirt/waistband L2/L8/L11 | 0.3995, 0.402, 326.5, 173.5 |
| Bow fit | chest_bow (knot, tails, loops) L14-L19 | 0.402, 0.402, 324.43, 171.45 |
| Hem tip piece | skirt_body L13 extra shift | +0.5, +1.5 px |
| Skirt flare | skirt_body L1/L10/L13 horizontal widening about x=545: +1.5 px (y550), +3.0 (y560), +3.5 (y575-630), +2.0 (y640), +1.0 (y650), 0 at y>=658 (total width change, symmetric) | – |

Result: collar/strap tops, frill, bow, bodice hem/waistband seam, waist and hem line up with the reference. Skirt outer silhouette now follows the reference within 1 px for y=540..650 (before the flare it was 3-4 px narrow at y=590-620); skirt region error dropped 1835 -> 1650 (sum/1000), left/right flanks 387->276 / 321->233, centre unchanged (394->407).

## 2. Layering / interleaving

Existing part layering is kept (no layers split/added/flattened except the two masks below). Clothing layers are interleaved into the character stack ("Order B", 1-based stack index from bottom):
- 1-9 hair back layers, 10 neck;
- 11-13 skirt_body L1, waistband L2, bodice L5 (the back pieces of the outfit) behind the legs/arms, so thighs, arms and hands overlap the skirt/bodice as in the reference;
- 14-34 legs, arms (fingers/palm/forearm/upper arm), pelvis, torso, breast;
- 35-38 shoulder strap caps L3/L4 and straps L6/L7, placed after (in front of) torso/breast so the straps cover the shoulder skin;
- 39-50 waistband L8, bodice L9, skirt_body L10, waistband L11, bodice L12, skirt_body L13, chest_bow L14-L19 in front of the body;
- 51-100 face, accessories, front hair, feet etc.

Layers were renamed to ASCII `NNN | part/path` (clothing keeps its ` L#` suffix) because the pixel-difference tool mojibakes non-ASCII layer names; the full mapping is in `layer-map.json`. Part paths keep the original groups (`pleated_skirt`, `camisole`, `chest_bow`, `body`, `arms`, `legs`, ...), so `parts` selection works.

## 3. Transparency masks (body inside the cloth occlusion area)

Cause found by solo-display/toggling (`workspace/diagnostics/solo-body-mask-on|off.png`, `body-plus-clothing-mask-on|off.png`, `crops/r4_flankR.png`): torso and breast outlines/skin are wider than the bodice flanks, so a dark brown outline and skin strip showed beyond the bodice side edge (plus tan slivers under the soft alpha of waistband L2/L11 at the waist).

Fix = two native, toggleable Krita transparency masks (hidden content kept, no pixels deleted):
- `assemble-mask: hide body outside cloth (body/torso)` child of `033 | body/torso`: hides torso where x<=488 or x>=604, 330<=y<=468 and bodice alpha < 0.05; additionally hides y>=458 (behind waistband/skirt).
- `assemble-mask: hide body outside cloth (body/breast)` child of `034 | body/breast`: same flank rule, no y>=458 part.

Normal skin kept: neck/collarbone/shoulders, upper arms, forearms, hands, legs, the cleavage notch under the frill. Verified: composite with masks off equals the unmasked numpy composite (max diff 1), masks on equals the expected masked composite (max diff 1); toggling restores everything (`reopened-composite-restored.png`).

## 4. Seam checks (final composite, `crops/`)
- Collar/neck & straps vs shoulders (`r5_neck`): straps sit on the shoulders, caps overlap shoulder skin, neck/collarbone natural, no skin leak at frill top.
- Armpits (`r5_armpitL`, `r6_hairR`, `r3_flankR/L`): bodice side edge meets arm; the gap between bodice and arm is genuine background in both images; no tan/brown outline beyond the bodice.
- Waistline (`r2_waist`): bodice hem / waistband / skirt seams are clean, no tan slivers or gaps.
- Hem & thighs (`r2_hem`, `r3_hemL`, `r3_thigh`): hem tips and pleats in place, thighs emerge from under the skirt.
- Cuffs/limb joints (`r8_handR/L`, `r7_*`): forearm/wrist/hand joints intact; front/back relations (arms over skirt, bow over bodice) as in the reference.

## 5. Part-scoped detection runs (`locate_pixel_differences`, reference = simplified-subject.png)

| Run | Dir under `workspace/pixel-review/` | Scope | Regions |
|---|---|---|---|
| 1st composite (pass 1) | `bbe63ee5-...` (current = `pass1-composite.png`, KRA = `workspace/pass1-character-assembled.kra`) | pleated_skirt, camisole, chest_bow | 15 |
| after registration + masks | `37c137d9-...` | same | 9 |
| after skirt flare | `02bdca54-...` | same | 10 |
| **final, after save + reopen** | `aa0da561-...` | pleated_skirt, camisole, chest_bow (scope.png / scope-preview.png inside) | 10 |
| **final, connected body parts** | `ac4ec843-...` | body, neck, pelvis, arms | 13 |

(`6140d205-...` holds only the log of a first, interrupted invocation.)

### Candidates fixed (pass 1 -> final)
- bodice-hem/waistband seam [472,453,150,13] and tan slivers: registration (waistband/bodice vertical refit WBB/CAMB) + torso mask y>=458 -> gone.
- bow region [516,338,63,35]: bow shifted with BOWB -> gone.
- torso/breast flank outline beyond bodice [617,332,16,74], [461,331,16,72], [467,404,8,48]: masks -> gone (dark outline "extra" 100 -> 35 px, flank diffs 346/356 -> ~240).
- skirt side silhouette [653,548,47,108], [398,538,45,99] and hem tips [399,655,28,23] [667,652,27,23] [390,640,14,19]: skirt body refit + flare + L13 shift; silhouette within 1 px of reference (remaining: item below).

### Candidates retained (final runs), with reason
Clothing scope (`aa0da561`):
1. [573,685,78,26] and [447,685,76,26] (color, 743/684 px): reference has a stepped cast-shadow band on the stockings under the hem; the upstream leg layers carry smooth shading instead. Hem position itself matches. Upstream difference, not repainted.
2. [411,538,32,66], [653,548,30,63]: skirt/arm side edge. Silhouette matches within 1 px; the remaining difference is a bright 1-px halo line along the skin/skirt boundary that only exists in the reference (pixel check: reference (255,255,248) vs current none) and a softer arm edge. Reference appearance, retained.
3. [614,329,14,48], [465,328,13,41]: upper bodice corners. Bodice frill is 2-3 px narrower per side at y=335-360 than the reference (scalloped frill shape differs) and, on the right flank, the dotted pale-pink pixels come from the soft alpha edge of the upstream upper_arm layer (solo/hide test: hiding `arm_left/upper_arm` changes ~720 px in that strip, hiding torso only 8, breast 0). A trial local widening only improved the region error by ~1.5 %, so it was not applied.
4. [614,397,12,65] (missing): right bodice flank outline sits 1-2 px inside the reference outline; the space beyond is background in both images. Within registration tolerance, retained.
5. [390,641,9,18], [399,657,26,20]: left hem tip. Placement within 1 px; reference has a white fringe and a grey fold patch, the current tip keeps the upstream thin fold line. Drawn detail retained.
6. [452,477,26,43] (extra): right forearm outline (jagged brown in reference vs thin outline in current); upstream arm outline, retained.
7. Cleavage notch under the frill (below threshold, seen in `crops/r2_notch.png`): reference has a pinkish shaded notch, current has flat skin; upstream breast shading, retained. Bow tail difference (reference [527,381,13,32] in pass 1) is a small drawn-detail difference, retained.

Body scope (`ac4ec843`): [387,274,93,312], [434,275,36,50], [444,431,21,103], [418,363,5,53], [353,620,29,101], [706,719,13,43], [374,602,12,57] and the shared flank/skirt-side boxes are upstream differences: the right-side hair has a pale lavender strand in the reference where the upstream `ponytail_right/main_strand` is only dark semi-transparent hair (no layer contains the pale strand there), hair strand colour/pink streak and green-tipped fringe differ, and arm/hand outlines are softer/jagged compared with the reference (`crops/r6_hairR.png`, `r7_a.png`, `r7_b.png`, `r8_handR/L.png`). Positions of arms/hands match; none are assembly seam defects.

## 6. Upstream appearance retained (not repainted)
Hair colour/streaks, fine hair strands and hair outlines; arm/hand outline weight and softness; stocking/thigh shading and cast shadow; cleavage-notch shading; strap-cap shape (reference strap tops slightly thicker/taller); small hem fold shading; frill scallop shape. No paint layers were added and no pixels were painted.

## 7. Verification
- Krita composite (masks on/off) matches the independent numpy composite within 1/255.
- `character-assembled.kra` reopened in Krita: 100 paint layers, canvas 1086x1448, two `transparencymask` nodes (visible), composite identical to `character-assembled.png` (max diff 0); mask toggle and solo-display tests restored without saving.
- Whole-image side-by-side (`crops/side_full.png`): outfit scale, collar, waist, hem, legs, hair consistent with the reference; no skin leaks, gaps or floating parts.
