# TOWN-ART-SERVICES change note

Status: scrapyard round 1 is ready for Claude's visual review. The Town Hall and Forge remain at their passed round-6 art. The family limit is 8 MB, as settled on the card. The rebuilt family GLB is 5,047,384 bytes.
Kind: art. Candidate asset; not wired into a reachable game scene.

## Design settled

- Keep the 3x3 scrapyard inside the 23 m town plot, with 0.5 m clearance.
- Carve one crushed-car stack from its generated side, front, rear and top photos; place it twice and turn one copy.
- Trace the gantry from the existing road photo. Keep its lattice open and the hook/magnet on a separate named node.
- Add the perimeter fence and low rubble at ground level.

## Changed

- Replaced the scrapyard's block car shells, stick crane and primitive magnet with a four-view `carve_object` stack, a `trace`/`slab` gantry, and a separate hanging hook/magnet node.
- Added a low wire fence with a road gate and ten irregular ground rubble pieces.
- Added generated, credited stack photos to the town texture folder. Their side view measures a 4.54 m stack length; the end views record their own `top` rows. The measured car roof width is about 1.4 m.
- Added per-piece world bounds output and ground/contact checks. All scrapyard pieces passed; each remains inside the plot margins.
- Added matched photo/model, two three-quarter, road and mayor views to the round-1 review recipe.
- Added `TEXCOORD_0` UVs to all ten rubble meshes. Lowered the two carved stack targets to 2,000 triangles each and removed bevels from the fine fence wires and posts; the scrapyard now totals 8,572 triangles under its 9,000 limit.
- Warmed and darkened only bright neutral pixels in the crane photo texture, preserving its rust and painted details.
- Renamed and refreshed the comparison sheet to the card's `round-1.jpg` path; the sheet is 203,423 bytes.
- Added measured roof rows to the Town Hall end-photo table so the current carving API can rebuild its already-approved shape. The Forge recipe and both buildings' design are unchanged.
- Recorded the horizontal beam tracking-axis fault in `docs/ART_LINE.md`; fence bars now use axis-aligned geometry.

## Checks

- Blender export, imported-GLB review renders and per-piece grounding audit: passed.
- `node tools/test-blender-output.mjs`: passed, 326 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; placement passed and size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8 passed, 1 failed on both runs. The audio-analysis test cannot start FFmpeg (`spawnSync ffmpeg EPERM`); this is outside the art card.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`): 13 passed, 1 failed, 33 not run. Eifel's unrelated loudness test failed on FFmpeg. Its solo rerun passed 17 checks and reproduced the same failure; this should become a small unreliable-check card and does not change art results.
- `npm.cmd run build`: passed; existing dynamic-import and large-chunk warnings remain.
- Browser and in-game look checks: not run; the asset is not wired into a reachable scene. Claude's art review is still needed.
- Assertions changed: none. Race fingerprints: none; no simulation or race code changed.

## Removed

- Removed the old scrapyard cuboid car stack and box-beam crane code.
- Removed generated PNG working copies from the texture folder. Current imported-model renders remain in ignored `.evidence/2026-11-07/TOWN-ART-SERVICES/round-1/` until Claude's verdict; remove them after that verdict. The four compressed source photos, model, sheet and notes remain.
