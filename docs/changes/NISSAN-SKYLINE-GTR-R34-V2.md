# NISSAN-SKYLINE-GTR-R34-V2: shape round 4

Status: round 4 complete for review; self-verdict 3.5 of 5 resemblance. Flag: nissan-skyline, dev. No shop entry.

## Changed

Kyle brought the car back after Claude scored round 3 at 3 of 5 (boxy saloon
cabin and roof, arches not flared, rear deck too tall and square). The body is
now lofted from outlines measured off the reference pictures, not from guessed
boxes.

- `tools/art/skyline-outlines.py` (Pillow and numpy only) thresholds the car
  against the grey background and writes `tools/blender/cars/r34-outlines.json`:
  roofline and underside nose to tail, window openings, half width at each
  height from the front and rear, scaled to 4.60 x 1.785 x 1.36 m, wheelbase
  2.665 m, with a camera-distance correction for the front and rear pictures.
- `tools/blender/cars/nissan-skyline-gtr-r34.py` lofts one cross-section every
  1.2 to 2.6 cm from those outlines, cuts flared rounded arches with dark wheel
  houses and rolled lips, sets dark window panes with black seals onto the
  painted glasshouse, lays the headlamp lenses, projector circles and fog lamps
  on the nose, adds door, bonnet and handle details, then collapses flat areas
  to a 12,000 triangle shell. The runtime GLB is rebuilt from it.
- `src/skyline-vehicle.js` maps the new shell materials (paint, glass, trim,
  lens, alloy), moves the mirrors, wing, tail lamps, grille fill and front lip
  to the measured shape, and sets the wheel track so the tyres sit inside the
  flares. The old trim tubes, skirt boxes, floor plate and flat lens code are removed.
- `tools/art/skyline-silhouette.mjs` and `tools/art/skyline-overlay.py` project
  the model back over each reference and score the silhouette overlap.
  `tools/art/skyline-review.py` now renders each view in its reference's
  picture shape; `tools/art/skyline-sheet.py` composes the round sheet.

## Checks

Silhouette overlap with the references (1 is exact): side 0.96, front 0.89,
rear 0.89. The headless contract passes 294 checks at 57,708 visible triangles
and 52 draws (limits 60,000 and 56). No player storage accessed. Sheet:
`docs/board/looks/nissan-skyline-gtr-r34/round-4.jpg`, copied to the scratchpad
as `skyline-v2-round4.jpg`. No browser or frame check applies to a shape round.

The PowerShell lane gate (`--tier lane --changed --jobs 2 --keep-going`) passes:
72 suites, 0 failed, 0 not run, 983 seconds. Replay fingerprints pass 225
checks across 25 cases; all 47 immutable-feature and exact complete-scene
guards pass. No pins re-recorded. The production build passes (Vite run
through node, since the linked dependencies have no `.bin`), writing only to
`.qa-dist/skyline-round4`, which is deleted afterwards. No dependency or
shared-folder write.

## Changed assertions

All tolerances are unchanged. Claude's written review is required before merge.

- Model height 1.25 to 1.36 m, in `SKYLINE_VEHICLE_DIMENSIONS` and the test.
  The real car is 1.36 m and the photo outline gives 1.36.
- Front lens ray: x .61, y .755 becomes x .46, y .655 (lens position from the
  front photo). Tail lamp rays: x .45 and .70, y .72 become x .405 and .58,
  y .84 (lamp positions from the rear photo). Both still require the lamp to be
  hit before any paint.
- Wheel track .84 to .74 in the model (not an assertion). The tyres stood 9 cm
  outside the body; they now sit inside the flares. The 1.96 m width assertion
  is met by the mirrors.
- Earlier rounds' height, tyre-radius, flag-catalogue and single-exhaust
  changes still await review on the card.

## Removed

The round-3 sheet and review note (replaced by round 4's), the round-3 loft with
subdivision and ratio decimation, the glass-as-face-region rule, the floor plate,
skirt boxes, window trim tubes and flat shaped-lens code. The runtime GLB and the
outline file are kept; no blend file. Raw review output is deleted after the
verdict is written.

## Handoff

Stop after round 4. Claude judges the art. No merge, push, release, frame timing,
integration-folder action or live-game action is authorized.
