# TOWN-ART-MACHINES-2 — round 23

## Changed

- Measured the new roller side photo: body x=46–588, rear tyre centre x=453. Set the carve wheel well and built rear tyres to z=1.28 m using the carve's 5.1 m length.
- Cut the photographed tyre discs from the carve masks in all four views, and mapped the built tyre faces from the new photo centre.
- Kept the round 22 body-parent and camera-up-axis fixes. The other three trucks' recipe sections were not edited.
- Exported `machines-2.glb` (5,807,220 bytes) and added `round-23.jpg` (206,334 bytes) with its review note. The roller remains a review item: the built tyre faces appear plain and brown, and lower-body projection seams remain. Claude should inspect the side and three-quarter axle placement, tyre tread, lower-body continuity, drum/yoke contact, and confirm the other trucks remain as before.

## Checks

- Blender 4.5.13 family export and six roller renders from the exported GLB completed.
- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed**; confirms machine roots/parts, per-machine triangle budgets and family file budget.
- No lane tier, build, browser scenario or look check was run. Claude should review the committed `round-23.jpg`.
- Changed assertions: none. Race fingerprints: not applicable to this art change.

## Removed

- Removed the photographed roller tyre discs from the four carve masks. No files or separately built parts were removed; the drum, canopy, posts, yoke and built tyres remain.

# TOWN-ART-MACHINES-2 — round 24

## Changed

- Shortened the canopy roof overhang to the canopy post span.
- Added dark rubber tyre faces with a side-photo hub at each face centre.
- Angled both yoke arms from the roller body down to the drum axle ends.
- Kept the other machine recipes unchanged. Exported `machines-2.glb` (5,819,372 bytes) and added `round-24.jpg` (208,011 bytes).
- The side render still shows a thin yellow horizontal strip extending forward at canopy height. Claude should inspect it and decide whether it is the remaining stray bar. Also review the tyre hub detail, yoke-to-axle contact in both poses, and confirm the three trucks match round 23.

## Checks

- Blender 4.5.13 family export and six roller renders completed.
- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed**. The output check includes the per-machine 15,000-triangle limit and family-file budget.
- No lane tier, build, browser scenario or look check was run. Claude should review `round-24.jpg`.
- Changed assertions: none. Race fingerprints: not applicable to this art change.

## Removed

- No files or separate model parts were removed. The canopy overhang was shortened; the previously removed photographed tyre discs remain excluded from the carve masks.

# TOWN-ART-MACHINES-2 — round 25

## Changed

- Added a pre-join bounds print for every roller mesh. The false rearward strip is part of the carved `roller:body` bounds (x -0.78..0.90 m, y 0.54..2.26 m, z -2.33..2.16 m); no built roller piece spans that area.
- Kept the round 24 roller photo masks after trial cuts did not isolate the strip. The failed cuts and the bounds list are recorded in `round-25-review.md`; the strip remains unresolved for Claude's review.
- Exported `machines-2.glb` (5,818,568 bytes) and `round-25.jpg` (207,137 bytes). The three other truck recipe sections were not edited.
- Claude should inspect the side elevation and decide the next source-photo or carve approach. Also compare the mixer, crane and pipe trucks with their prior sheets.

## Checks

- Blender 4.5.13 family export and six roller renders completed. All roller parts printed bounds before the rigid assembly join.
- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed**.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement is valid.
- `node tools/test-review-evidence.mjs`: 8 subtests passed, 1 failed because audio analysis could not start `ffmpeg` (`spawnSync EPERM`). The review-JPG publication check passed.
- No lane tier, build, browser scenario or look check was run. Claude should review `round-25.jpg`; no assertion changed. Race fingerprints: not applicable to this art change.

## Removed

- No files or model pieces were removed. Experimental mask cuts were discarded; round 24's cut regions remain.
