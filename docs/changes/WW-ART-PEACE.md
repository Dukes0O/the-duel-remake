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
