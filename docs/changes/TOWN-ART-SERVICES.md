# TOWN-ART-SERVICES change note

## Split the service family

Moved toll-bank, school, radio-mast, helipad and notice-board into
`services-2.glb`, rooted at `town-services-2`. The original family now keeps
the seven passed buildings. No assertions for those seven changed; only the
five moved ids and their budgets moved to the new family check. Both family
files retain the 8 MB cap.

The original export was 7,726,444 bytes; the rebuilt seven-building export is
7,323,756 bytes. Node names and triangle counts are unchanged:

| Building | Before | After |
| --- | ---: | ---: |
| town-hall | 6,008 | 6,008 |
| scrapyard | 8,770 | 8,770 |
| forge | 3,844 | 3,844 |
| workshop | 8,895 | 8,895 |
| motor-pool | 13,260 | 13,260 |
| paint-shop | 4,784 | 4,784 |
| trading-post | 8,990 | 8,990 |

The final `services-2.glb` is 1,029,872 bytes. It has all five ids as direct
children of `town-services-2`, including `radio-mast:lamp`. Their final counts
are toll-bank 3,952, school 3,120, radio-mast 1,092, helipad 1,456 and
notice-board 176.

## Toll bank, round 11

Built the toll bank from the four committed orthographic photos. `carve_object`
shapes the strongroom; its door, wheel, hinges, roof plates, booth, porch,
barrier arm, posts and striped bands are separate parts. The door sets the
scale at about 2 m. The photo-carved shell is about 7.6 by 7.8 m and ends at
the roof eave; the four photo-mapped roof plates meet the shell there. The
strongroom crown is 2.4 m high. The roof and shell stay within the 2 by 2 cell
plot, with at least 0.5 m clearance.

The piece audit printed each piece's bounds and found every piece within the
plot, touching the ground or another piece. The full toll bank uses 3,952
triangles against its 5,000 limit. The model export is 1.03 MB. The final
sheet is 2,048 by 4,528 pixels and 454,369 bytes; the source photos and model
renders remain at their full 1,024-pixel width.

The front photo's roof peak scales to about 2.8 m from its door, while the
side profile limits the crown to about 2.4 m. The side profile controls the
roof height so the shell and hipped roof stay continuous. The front pair in
the sheet records the remaining difference for Claude's review.

### Checks and review

- Blender 4.5.13 exported `services-2.glb`; its piece bounds and contacts
  passed.
- `node tools/test-blender-output.mjs`: 386 checks passed, 0 failed. The
  first run found 5,860 toll-bank triangles; reducing the carved shell target
  and removing duplicate photo-baked rivets brought the final count under
  budget. No assertion changed.
- `node tools/test-repo-hygiene.mjs`: passed. It reported existing advisory
  size targets; no placement error.
- `node tools/test-review-evidence.mjs`: 635 checks passed, 0 failed across
  9 subtests. Its in-sandbox audio subtest could not spawn `ffmpeg` (EPERM);
  rerunning with the installed `FFMPEG_PATH` outside the sandbox passed.
- The sheet shows the strongroom alone in four matched orthographic views,
  then the full toll bank in both three-quarter views and the mayor view.
- Browser checks were not run. Claude should review the front roof height
  against the side profile, the door and barrier, and the booth and canopy in
  both three-quarter views and from the mayor's view.
- Changed assertions: none. Race fingerprints: not applicable; race code is
  unchanged.

## Removed

- Removed the five moved building generators from `town-services.py` and
  removed their nodes from `services.glb`.
- Replaced the toll bank's simple block placeholder with the photo-carved
  shell and its named pieces. Removed separately modeled wall rivets because
  the carved photos already show them.
- No other assets or checks were removed.

## Radio mast, round 15

Replaced the radio mast's plain beam lattice with two orthogonal `trace` and
`slab` faces cut from the committed side photo. The silhouette mask excludes
the photographed hut and stays, and its area/tolerance limits retain nine open
lattice bays within the 1,800-triangle budget. The small hut now has a traced
photo facade, four thin stays land on concrete anchor blocks, and the separate
red emissive lamp stays at the mast top. No other building or its photo changed.

The Blender builder printed each mast piece's bounds and passed the grounding,
contact and 1x1 plot checks. The mast has 1,524 triangles. The final family GLB
is 1,895,708 bytes. The 2,048 by 2,792 round-15 sheet is 162,924 bytes and pairs
the reused photos with exported views, then shows both three-quarter views and
the mayor view with the other family buildings hidden.

### Checks and review

- Blender 4.5.13 export and radio-mast bounds/contact/triangle audit: passed.
- `node tools/test-blender-output.mjs`: passed, 386 checks, 0 failed.
- Browser checks were not run. Claude should review whether the nine traced
  openings preserve enough lattice detail and whether the hut facade reads
  from the mayor's view. The reused source photos still show the hut/stays and
  their overhead view includes the ground, as noted in the review sheet.
- Changed assertions: none. Race fingerprints: not applicable; race code is
  unchanged.

## Removed

- Removed the radio mast's hand-built lattice beams and dark box hut, plus its
  black anchor blocks. Replaced these with traced photo geometry, a photographed
  hut facade and concrete anchors.
- No passed building, reference photo, or check was removed.

## Radio mast, round 16

Adjusted only the radio mast's four guy wires and hut-facing detail. The cables
are dark steel, 5 cm across, built between the four concrete anchors and two
attachment heights on the mast. Their direct mesh construction preserves the
full diagonal span in the Y-up GLB; the cable mesh has export UVs. The hut's
photographed patched-tin facade now stands clear of its body face. Its placement
keeps all four cardinal cable paths clear. The red lamp, traced mast, school,
and toll bank recipe branches remain as before.

The exported mast has 1,524 triangles. The 2,048 by 2,792 `round-16.jpg` sheet
is 219,141 bytes and shows the four photo/model views plus the full mast from
the road, yard, and mayor angles, with other buildings hidden.

### Checks and review

- Blender 4.5.13 export and radio-mast bounds/contact/triangle audit: passed.
- `node tools/test-blender-output.mjs`: first run found missing cable UVs;
  after adding cable UVs, **386 checks, 0 failed**.
- Browser checks were not run. Claude should check that all four cables read
  from the anchors to the two mast heights and that the hut's photographed
  window, door, and patched tin read from the mayor and three-quarter views.
- Changed assertions: none. Race fingerprints: not applicable; race code is
  unchanged.

## Removed

- Replaced the four radio-mast beam stays with full-span cable meshes and
  moved the photographed hut face forward so it is visible on the body.
- No photos, passed buildings, or tests were removed.

## Toll bank, round 12

The seven passed buildings in `services.glb` remain byte-for-byte unchanged.
Updated only the toll bank inside `services-2.glb`: the separate door now wears
the front photo's rounded door region, including its wheel, rivets and hinges,
inside a heavy frame. Replaced the undersized toll scene with a long striped
barrier across the road-side lane, a counterweighted post and a larger booth
with a visible window and its own roof. The shell, roof and source photos that
matched remain in place.

The side, front and rear renders now frame the entire strongroom. The review
sheet compares all four orthographic photo/render pairs, both three-quarter
views and the mayor view with other buildings hidden. The sheet is
`docs/board/looks/town-art-services/round-12.jpg` (312,084 bytes). The GLB is
1,113,008 bytes; the toll bank uses 3,300 of 5,000 triangles. The piece bounds
and contact audit passed. Every piece is inside the 2-by-2 plot with at least
0.5 m spare and touches the ground or another piece.

### Checks and review

- Blender 4.5.13 export and piece bounds/contact audit: passed.
- `node tools/test-blender-output.mjs`: 386 checks passed, 0 failed; run to
  completion on this GLB.
- Lane tier and build were not run, as required for art cards.
- Browser and in-game checks were not run. Claude should check the door's
  photo alignment and the booth, counterweight and striped barrier from both
  three-quarter views and the mayor view.
- Changed assertions: none. Race fingerprints: not applicable; race code is
  unchanged.

### Removed

- Replaced the flat brown door panel with the photo-wearing door slab and
  removed separately modeled wheel/hinge details already present in the photo.
- Replaced the undersized barrier and booth with the full lane gate and
  windowed booth.
- No other assets or checks were removed.

## School, round 13

Compared the committed bus photos and draft sheet, then corrected the exported
school model: retained the photo-mapped tyre materials, added low-poly raised
rubber shoulders and visible hubs, and opened the straight-down camera so the
whole bus fits. The final school uses 8,716 of its 9,000 triangle budget after
reducing the carve target to 5,200 and omitting high-triangle lug bolts. The
lean-to, chalkboard and passed toll bank remain in `services-2.glb`; the school
remains within its 3 by 2 cell footprint. The family GLB is 1,747,864 bytes.

Rendered the exported GLB in a clean scene and rebuilt
`docs/board/looks/town-art-services/round-13.jpg` (1,600 by 1,600 pixels,
245,894 bytes). It shows side, front, rear and above photo/model pairs at
matched orthographic views, both three-quarter views and the mayor view, with
other buildings hidden. Claude should review the front and rear silhouettes,
wheel detail, lean-to attachment and chalkboard readability in the sheet.

### Checks and review

- Blender 4.5.13 export and all 34 school piece bounds/contact checks: passed.
- `node tools/test-blender-output.mjs`: final run, 386 checks passed, 0 failed.
  Earlier runs exceeded the unchanged school triangle budget (14,816 and
  10,016); the final model is 8,716 triangles.
- Browser and in-game checks were not run; Claude handles those checks.
- Lane tier and build were not run, as required for art cards.
- Changed assertions: none. Race fingerprints: not applicable; race code is
  unchanged.

### Removed

- Removed the flat rubber material override that hid tyre-photo detail and
  omitted high-triangle lug bolts from the final recipe.
- No buildings, source photos or checks were removed.

## Radio mast, round 14

Added four generated orthographic JPEG references and credits, and replaced the old 19 m simple mast with a 30 m open guyed lattice, a corrugated hut, four anchor blocks and a separate emissive `radio-mast:lamp`. The hut, stays and anchors fit inside the 1 by 1 cell plot with at least 0.5 m clearance. The in-recipe audit printed every mast-piece bound and contact; all pieces touch ground or another piece. The evaluated mast count is 1,588 triangles. The `services-2.glb` export is about 2 MB; toll bank and school recipe branches were not changed.

The exported-model sheet is `docs/board/looks/town-art-services/round-14.jpg` (2,048 by 2,802 pixels, 155,612 bytes). It compares four elevation/plan references and exports, followed by both three-quarter views and the mayor view. Claude should inspect the reference-to-render scale, the front/rear bracing, guy-wire readability, hut placement and the lamp. The reference photos include guy wires and the hut; they are not isolated mast-only plates. The mast frame is assembled from low-poly beams, not a `trace`/`slab` photo silhouette; this remains a gap against the requested method and should be judged before merge.

### Checks and review

- Blender 4.5.13 export, per-piece bounds/contact checks and evaluated triangle budget: passed (1,588 triangles).
- `node tools/test-blender-output.mjs`: first run failed because the exported mast was 4,436 triangles; after removing thin-bar bevel modifiers, rerun completed with 386 checks passed, 0 failed.
- Lane tier, build and browser checks were not run, as required for art cards. Claude should inspect the listed views before merge.
- Changed assertions: none. Race fingerprints: not applicable; race code is unchanged.

### Removed

- Removed the old 19 m simple triangular mast and its three guy stays. Replaced them with the lattice tower, hut, four plot-contained guy wires and anchors, and named warning lamp.
- No passed building, source asset or test was removed.

## Helipad, round 17

Added four separate generated orthographic photos and credits, then replaced the old simple helipad shape with a 24 m square photo-mapped plate deck on welded girders and lathed oil drums. The H and circle are on the flat overhead-textured deck. The windsock, three-drum fuel stack, hand pump and four corner floodlights are separate pieces; the four light lenses use an emissive material. The pad sits inside its 4 by 4 cell footprint and remains below 1.5 m overall. The toll bank, school and radio mast source branches were left unchanged.

The exported model has 2,628 helipad triangles. The full `services-2.glb` is 2,641,460 bytes. The bounds audit printed 42 piece bounds; every piece touches ground or another piece, stays inside the footprint, and reaches no higher than 1.49 m. The final sheet, `docs/board/looks/town-art-services/round-17.jpg`, is 1,600 by 2,580 pixels and 298,980 bytes. It shows all four photo/model pairs, both three-quarter views, and the mayor view. The four source JPEGs are at most 1,024 pixels wide.

### Checks and review

- Blender 4.5.13 export, all piece bounds/contact checks, and triangle budget: passed (2,628 triangles; 42 pieces; no contact failures).
- `node tools/test-blender-output.mjs`: 389 checks passed, 0 failed.
- Lane tier and build were not run, as required for art cards.
- Browser and in-game checks were not run. Claude should review the side profile against the low-height requirement and check the small windsock, fuel stack, pump and emissive lamps in both three-quarter views and the mayor view.
- Changed assertions: none. Race fingerprints: not applicable; race code is unchanged.
- No new art fault was found. The source elevation photos depict a taller assembly than the 1.5 m cap permits, so the model follows the cap and has a visibly lower side profile.

### Removed

- Replaced the old plain helipad plinth/deck, bar H, weld bars, perimeter rails, tall light poles and untextured cylinders with the photographed deck, girders, drum supports and separate accessories.
- No passed buildings, old review sheets or checks were removed.

## Helipad, round 18

Raised the helipad deck top to 1.18 m and kept its 24 m plan, photo mapping,
H and circle unchanged. Added the 0.30 m riveted edge girder and sixteen
photo-colored lathed drum legs, each 0.88 m tall and 0.57 m across. Tightened
the drum photo crops to remove studio background and used the blue, rust, white
and green drums shown in the reference. Added three fuel drums and a hand pump
on the ground beside the deck, the windsock on its pole, and four emissive
corner floodlights including `helipad:lamp`. The toll bank, school and radio
mast were not edited.

The helipad has 2,628 triangles. The family GLB is 2,642,436 bytes. The review
sheet is 1,600 ? 2,440 pixels and 333,111 bytes. Blender's model audit reported
all pieces within the plot and below 1.5 m.

### Checks and review

- Blender 4.5 export and seven rendered GLB review views: passed; 2,628 helipad
  triangles and all part bounds passed the recipe audit.
- `node tools/test-blender-output.mjs`: passed, 389 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed. Size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed; the audio
  analysis subtest failed twice with `spawnSync ffmpeg EPERM`. Both runs ended
  at 655 checks. The failure is an execution permission issue in the test's
  child process; no assertions were changed.
- Browser and in-game look checks were not run here. Claude should check the
  drum scale and colors against the side photos, fuel stack and pump readability
  beside the deck, windsock visibility, emissive corner lamps, and unchanged H
  orientation from above.
- Changed assertions: none. Race fingerprints: not applicable; art-only work
  changed no race code.
- No new kind of art fault was found; the wide drum crop included studio
  background, which was fixed using tight photo crops.

### Removed

- Replaced the undersized support stubs and on-deck fuel props with full-size
  photographed drum supports and a ground-side fuel stack. No prior review
  sheet, other building model, or check was removed.
