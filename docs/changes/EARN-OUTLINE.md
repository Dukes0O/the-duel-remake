# EARN-OUTLINE

- Task: the outline round Kyle approved on the three earned cars (Ferrari Enzo,
  McLaren F1, Bugatti Bolide), judged against the reference photos in
  `C:/Users/kyleb/dev/art-library/<car>/reference/` (viewing only, never
  shipped or committed). Part of EARN-FINISH. Lane `claude/earn-outline`. Kind:
  car look. The `earned-cars` switch is not touched here.
- Sheet: `docs/board/looks/earned-cars/outline-round.jpg` (366 KB): for each car
  a side row and a three-quarter row, photo / model before / model after, the
  renders turned to face the photo's way.

## Method

1. Trace by hand. Each side photo was read off a 10 to 25 px grid: the top
   line nose to tail, the tail, the underside, the side window, both hub
   centres and the rim or tyre size. The traces are pixel lists in
   `tools/art/earned-outlines.py`; `--check` draws them back over the photo and
   each was corrected until it sat on the car's edge.
2. Map to game metres. The Enzo photo is taken from the front quarter (front rim
   66 px, rear 52 px), so it is mapped through a one-dimensional pinhole camera
   fitted to the nose, both hubs and the tail at the declared length, with one
   height factor for the downward look (roof to the real 1.147 m). The F1 and
   Bolide photos are square on, so they use a plain scale (the Bolide's
   lengthwise scale comes from nose and tail, because the game's axles sit about
   20 cm rearward of the photo's). Output: `tools/art/earned-outlines.json`.
3. Rebuild the body stations, the glasshouse sections and the worst details
   from those numbers (below).
4. Score. `tools/art/earned-export.mjs` builds the runtime model through the
   game's own vehicle router and dumps its triangles and a GLB;
   `tools/art/earned-outline-fit.py` overlays the model's side silhouette
   (orthographic) on the traced outline and reports their overlap;
   `tools/art/skyline-review.py` renders the GLB in Blender;
   `tools/art/earned-outline-sheet.py` builds the sheet.
5. Front and rear widths were judged by eye from the front and rear photos
   (the front and rear photos are close-ups at an angle, not usable for a
   width trace). No width trace was stored.

## Scores against the photos (honest, out of 5)

| Car | Before | After | Side outline overlap (before, after) | What still separates it from the photos |
| --- | --- | --- | --- | --- |
| Ferrari Enzo | 2.5 | 3.0 | .845, .898 | The glasshouse now starts just behind the front wheels and rakes up to a crest over the driver's knees, the rear deck stands high and the tail is tall and body-coloured, so the side reads as an Enzo. Still smooth where the real car is creased; the front fender humps read as round tubes; the nose intakes are flat black boxes; mirrors are blocks. |
| McLaren F1 | 2.5 | 3.0 | .803, .869 | One line now climbs from a low nose over a long windscreen to a broad roof that runs straight into a full deck; the front wings are rounded; a black grille band carries the rear lamps; silver is darker and more metallic. Still: the tail drops early (a test keeps the deck centre under .80 m at 1.85 m back, where the real deck is about .95 m), the side intake is small and the body is plain. |
| Bugatti Bolide | 3.0 | 3.0 | .804, .834 | Lower, harder nose with a wide carbon splitter and end fences, an angled windscreen rising from the bonnet channel instead of a bubble, a higher rear deck. Still a smooth curvy body where the real car is all sharp sidepods and deep carbon channels; the reference cars are black or camouflaged while ours is blue by design. |

Before-scores are from the 28 October photo round. Overlap counts the wheels
against an outline without wheels, so 1.0 is not reachable; compare before and
after only.

Verdict (self): **better proportions on all three, gritty not toy-like, not
release-quality likenesses.** Enzo and F1 gain half a point each; the Bolide's
shape changed but its score did not.

## What changed per car

- Ferrari Enzo (`src/enzo-vehicle.js`)
  - Body stations refitted to the trace: belt dips along the doors, haunches
    rise to .94 m behind the cabin, the deck stays high to a tall tail (.70 to
    .77 m), the beak is lower and the nose face shorter.
  - New glasshouse: ten squared-off sections (tumbled-in sides, flatter roof)
    from the windscreen base at 1.42 m forward back to the engine cover; painted
    roof, black A pillars, painted buttresses either side of the rear glass.
    The cockpit opening moves forward to match.
  - A raised centre ridge on the beak and two rounded front fender humps that
    carry the headlamps.
  - Glass engine cover moved forward to just behind the cabin; a black band
    between the four tail lamps, the plate and exhausts lower. Lamp rings are
    silver bezels instead of lit rings; the running strip is thinner.
- McLaren F1 (`src/mclaren-f1-vehicle.js`)
  - Body stations refitted: low nose (.40 m) climbing to the windscreen, wing
    tops rounded (crown above shoulder, so no sharp outer corners), a tall rear
    deck (.98 m) that falls in a rounded tail.
  - Glasshouse lengthened forward to 1.26 m (windscreen wraps round in front of
    the A pillar, as on the car), roof kept below the helmet line and snorkel.
  - Black rear grille band behind the lamps, wider lower mouth, darker silver
    (metalness .72, roughness .33; the pinned colour is unchanged).
- Bugatti Bolide (`src/bolide-vehicle.js`)
  - Nose stations lowered (.37 m at the tip) to meet the fender crest further
    back; rear deck crown raised to .88 m; cockpit opening moved forward.
  - Squared-off glasshouse with an angled windscreen from 1.02 m back, replacing
    the bubble; roof and hoops moved to match.
  - Wider, deeper carbon splitter with end fences.

Kept: declared sizes, wheel positions and radii, collision footprints, driver
and steering hooks, damage and crush, design feature labels and every vehicle
contract check. Budgets: Enzo 69,111 / 55 (was 64,710 / 54), F1 54,800 / 54
(was 54,793 / 54), Bolide 66,408 / 55 (was 65,871 / 55), all under the Jesko's
73,600 triangles and 66 draws.

## Tests and checks

- `test-enzo-vehicle` (426 checks), `test-mclaren-f1-vehicle` (351),
  `test-bolide-vehicle` (430), `test-vehicle-assets` (147), `test-heli-cable`
  (106), `test-repo-hygiene` (placement passed), `test-repo-hygiene-rules`
  (150), `test-review-evidence` (9 of 9): all pass.
- Lane tier from PowerShell (`node tools/run-tests.mjs --tier lane --changed --jobs 4`):
  41 passed, 0 failed, 0 not run in 585 s, including the three car suites,
  `test-vehicle-assets`, `test-earned-cars-ui`, `test-medals`,
  `test-course-kit`, replays and world composition. Two header comments in
  the Enzo and Bolide files were reworded after it started (comments only).
- `npm run build`: passes.
- Not run: frame timing (rule 9: art rounds are not frame-timed), browser
  look scenarios (`enzo-look`, `mclaren-f1-look`: laptop-only; the parent
  session's play-through covers the cars in the game), the full tier.
- Test-driven corrections during the round, no test touched: the Enzo fender
  test (fenders above the beak) failed with a tall ridge, so the ridge was
  made smaller and fender humps added; the F1's windscreen frame, helmet and
  snorkel checks failed with a wide, high front cabin, so its front sections
  were narrowed and the roof kept under 1.09 m; the F1 paint colour is pinned,
  so only its metalness and roughness changed.

## Changed assertions

- `tools/test-repo-hygiene.mjs`: the exact allowed look-sheet names in
  `docs/board/looks/earned-cars/` change from the three `*-photo-round.jpg`
  names to the one `outline-round.jpg`. Why: replace means remove; the photo
  round's sheets are deleted in this change. Nothing is loosened: still one
  exact pattern, and any other picture outside `public/` is refused.

## Removed

- `docs/board/looks/earned-cars/enzo-photo-round.jpg`,
  `mclaren-f1-photo-round.jpg`, `bolide-photo-round.jpg` (replaced by
  `outline-round.jpg`; the 28 October scores are kept in this note).
- Enzo: the forward teardrop dome and its old sections, the old glass engine
  cover position, the lit headlamp rings. Bolide: the cockpit bubble sections.
  F1: the short hat-shaped cabin sections.
- All renders, overlays and GLBs stayed in the lane's `.evidence/` and were
  deleted after the sheet was made.

## Rebuild

1. `python tools/art/earned-outlines.py` (only when a trace changes;
   `--check .evidence/<day>/<card>` draws each trace over its photo).
2. For each car: `node tools/art/earned-export.mjs <key> .evidence/<day>/<card>/<when>`,
   then `blender --background --factory-startup --python tools/art/skyline-review.py -- --root . --glb .evidence/<day>/<card>/<when>/<key>.glb --out .evidence/<day>/<card>/<when>/<enzo|f1|bolide> --size 900x600 --views side,three-quarter`.
3. `python tools/art/earned-outline-fit.py .evidence/<day>/<card>/<when>` (writes fit.json).
4. With `before` and `after` folders: `python tools/art/earned-outline-sheet.py .evidence/<day>/<card> docs/board/looks/earned-cars/outline-round.jpg`.
