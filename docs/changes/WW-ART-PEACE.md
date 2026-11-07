# WW-ART-PEACE ? dust tanker round 7

## Changes

- Re-measured wheel circles in the side photo: front centre (116, 339), radius 74 px; rear centre (690, 339), radius 77 px. Converted both with the cab's `T_SCALE`; axle centres share the side-view transform and both pairs stay level and square.
- Trimmed front-view mask regions for the mirrors and reduced the front-side mask contamination. The rear photo remains excluded from the cab views. The existing front photo plainly shows the goggles, so it remains the cab-front source; no generated image was needed.
- Mapped the tank lathe only to the bare-metal lower band. Added a separate overhead-photo shell over the top third of the tank turn and retained the traced ragged cloth side slabs. Tightened both cloth masks and applied `Photo.bleed`.
- Replaced the round-6 look sheet with `docs/board/looks/ww-art-peace/round-7.jpg` (1600 ? 1558 px, 276,617 bytes). It pairs side photo/render and front photo/render, then shows both three-quarter views. All renders came from the exported GLB in an empty scene with Standard view transform and other props hidden.
- Exported GLB readback: 10,104 dust-tanker triangles, 2,978,640 bytes.
- No test assertions changed. No race fingerprints apply to this art-only change.

## Checks

- Blender export and render: passed. The full prop GLB was imported into an empty scene and rendered.
- `node tools/test-blender-output.mjs`: passed, 304 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement clean.
- No browser check was run. Claude should judge the whole sheet, especially the tank-end cap, tarp edge halos, and cab/tank separation from both three-quarter views.

## Self-review

The goggles are clear in the front view and remain visible from the front three-quarter angle. The model still does not hold together from three-quarters: the tank end cap shows a large mismatched photo area, pale edge halos remain around the tarp, and the cab exposes tank geometry behind it. This is submitted as the requested measured round, with those visible faults called out for Claude's review.

## Removed

- Replaced the round-6 review note with this round-7 review note; the round-6 comparison sheet remains as prior evidence.
- Temporary Blender renders, source captures, and test logs created for this round are removed from `.qa-dist/` before handoff.

## Dust's tanker, rebuilt by Claude

Every tanker number was measured again on the photos with a grid: the side photo is 1 cm a pixel, the end photos 8.36 mm a pixel, so the truck is 8.6 m long, 2.77 m wide and 3.2 m to the cab roof. The tank is an ellipse, as the rear photo draws it. The cloth is one draped surface on each side, the end photos close it, and the rear axle has two tyres a side. Each photo now has one embedded copy.

### Removed

The separate tarpaulin slabs, the overhead shell, the extra photo copies, the old tread patch for this truck, and `round-6.jpg`.

## Mirage caravan, round 8

- Added `tools/blender/town-peace-camp.py` and registered its candidate output. The new `peace-camp.glb` contains the `mirage-caravan` root, carved shell, wheels, traced tow bar, jockey wheel and dummy. The caravan and the three pieces still to come live in `peace-camp.glb`.
- Measured all four supplied photos on grids. The 299-pixel door sets the caravan scale to 1.9 m. The end-photo scale follows the side/front height ratio.
- Added the unlabelled round 8 review sheet at `docs/board/looks/ww-art-peace/round-8.jpg` (1600 x 900, 141,074 bytes).
- Blender recipe export and render from the exported GLB: passed. One early run exposed that Pillow is unavailable inside Blender; the hitch trace now uses NumPy.
- `node tools/test-blender-output.mjs`: passed, 324 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed. Browser checks are Claude's; see the sheet and review note.
- Changed assertions: none. Race fingerprints: not applicable to this art-only asset.

### Visual review

The roadside view reads as a parked caravan with someone in its window. Close up, the rigid figure and X eyes reveal the dummy. The hitch is too pale, and its end is cropped in the side comparison; the front wheels are hard to read. Claude should judge those points in the round 8 sheet.

### Removed

Replaced the initial empty export with the measured caravan model. Temporary grids, masks, renders, Blender file and test logs are removed before handoff.

## Mirage's caravan, corrected by Claude

The ground, wheel, tow bar and end-photo numbers were measured again on a grid. The tow bar and jack are now one traced picture from the side photo, on two rusty arms. `mirage-caravan` and the three pieces still to come live in `peace-camp.glb`, so the scene that places them must load that file.

### Removed

The primitive dummy hidden inside the body, the primitive jack and the pale tow bar traced from the overhead photo.

## Mirage camp, round 9

- Added seven original generated reference photos for the tent and four small objects; credited them in the town texture folder.
- Added the separate `mirage-camp` root with a photo-carved tent, folding chair, stove, lathed kettle and water can, crate table and tin mug. The existing caravan recipe is unchanged.
- Measured the tent side ground at row 775 and ridge at 164; the front ground is row 945 and ridge at 112. The side sets its 1.5 m height, and that shared height sets the end-photo scale. The open front is carved with a `keep` box.
- Added the unlabelled round 9 comparison sheet at `docs/board/looks/ww-art-peace/round-9.jpg` (1600 x 1520, 164,204 bytes).
- Exported GLB readback: 17,836 triangles, 1,973,492 bytes.
- Blender recipe export and four renders from the exported model: passed. Inspected all four views.
- `node tools/test-blender-output.mjs`: passed, 324 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement clean, size targets advisory.
- Changed assertions: none. The candidate triangle and byte budgets were raised to 17,836 and 2,000,000 to cover the measured asset. Race fingerprints: not applicable to this art-only asset.

### Visual review

The muted tent and plain camp objects read as a private place without a sign. Two horizontal streaks remain across the tent side, the water can's cap still reads too pale, and the props crowd the entrance in the front three-quarter view. The two allowed adjustment passes are complete. Claude should judge those details on the round 9 sheet.

### Removed

The photo grids, carving masks, render captures, Blender working file and test logs made for this round were removed. No existing art or prior round sheet was replaced.
