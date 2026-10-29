# NISSAN-SKYLINE-GTR-R34-V3: detail round 1

Status: round 1 complete for review; self-verdict 3.5 of 5 resemblance (Claude judges).
Flag: nissan-skyline, dev. No shop entry, no price, no paint-shop row (V6 owns those).

The shape of round 4 is kept: the roofline and outline are untouched. This round adds
the detail round 4 lacked, checked against the reference pictures.

## Changed

Body recipe, `tools/blender/cars/nissan-skyline-gtr-r34.py` (rebuilds the runtime GLB):

- Surfaces: the bonnet keeps its centre height and drops 2.4 cm outside two creases that
  run from the windscreen base towards the headlamps; the front wing and the rear haunch
  have a crease line (a 2 cm tuck below the line); the sill is a clear 5 cm step under the
  doors. The loft carries denser rows so these creases survive the triangle collapse
  (shell target 12,000 to 13,500 triangles).
- Front: grille and duct openings are cut 20 cm deep with rolled lips round the edges;
  each headlamp is an angular pocket with a reflector tray, two projectors with chrome
  rings, an amber indicator end and a clear cover; round fog lamps with chrome rings and
  an amber indicator pod on each corner.
- Rear: a shaped pod on each side holds two round pockets (outer larger). The recipe
  leaves four empties named "Socket tail ..." in the GLB; the lamps are built at them in
  `src/skyline-vehicle.js`, so a change to the pockets moves the lamps with it.
- Wheel radius .37 to .34 (the photo measures .348): arch radius .408 to .372.

Runtime, `src/skyline-vehicle.js`:

- Fascia: deep grille mesh (back plate, coarse layer, fine layer), intercooler core,
  duct mesh, tapered black front lip.
- Rear: four round lamps (bezel, domed red lens with a ring, amber centre on the inner
  pair), the centre high brake light, small clear and red lamps beside the plate,
  layered black diffuser, a bigger single exhaust on the right with a rolled lip.
- Mirrors are egg-shaped housings with a flat back face, dark glass and a swept stalk.
  The wing has two swept uprights, a slim aerofoil blade and two end plates. Wipers lie
  parked at the base of the windscreen (arm and blade).
- Tyres: a flat-topped low-profile tyre from a lathe profile replaces the helper's
  torus plus tread bands (fewer triangles, a truer silhouette); a lighter arc-shaped
  red caliper; the six alloy spokes are scaled to the smaller wheel.
- Paint: `SKYLINE_PAINTS` holds the packet's four finishes as appearance values
  (Bayside Blue .46 metal, Skyline White .35, Sonic Silver .55, Midnight Black .30;
  V6 copies the three extra rows into `src/paint-presets.js`). A fine metallic flake in
  the paint shader scales with metalness and is chained before the shared wear shader.
- Damage and dirt use the same shared hooks as every code-built car
  (`prepareVehicleDamage`: dents, scratches, panel wear and grime, glass cracks). Nothing
  new was written for them; the existing test covers all four zones and the exact reset.

Tools: `tools/art/skyline-review.py` gains front and rear close-up views and a view
list; `tools/art/skyline-export.mjs` takes an optional paint id; the new
`tools/art/skyline-v3-sheet.py` composes the sheet.

## Checks

- Budget: 58,815 visible triangles and 54 draws (limits 60,000 and 56). Round 4 was
  57,708 and 52. The tyre change gave back about 2,100 triangles that the detail used.
- `tools/test-skyline-vehicle.mjs`: 329 checks pass (294 before; 35 new ones for the
  four finishes, the flake hook, lamp covers and tail lamps). `tools/test-skyline-handling.mjs` passes.
- Silhouette overlap with the photos: side 0.95 (0.96 in round 4), front 0.90 (0.89),
  rear 0.90 (0.89). The side score dips because the model's wing, lip and diffuser
  stick out further than the photo outline; the body outline is unchanged.
- Lane tier (PowerShell, --changed --jobs 2 --keep-going): 55 suites, 54 pass in 721 s. The one failure was `test-repo-hygiene` refusing the sheet name `v3-round-1.jpg`; the placement rule now also allows an optional `v<number>-` prefix (see changed assertions) and the suite passes when run alone. Production build passes (built through node into `.qa-dist`, deleted afterwards).
- No browser, frame or live-save check applies: the car is still behind the dev flag
  and a detail round is judged on its pictures (AGENTS rule 9). No player storage used.
- Sheet: `docs/board/looks/nissan-skyline-gtr-r34/v3-round-1.jpg` (front, rear, side,
  three-quarter beside the references; a front and a rear close-up; the four paints).
  Rendered in Blender with flat studio light, so the flake shader is not visible on it.

## Changed assertions

All tolerances are unchanged. Claude's written review is required before merge.

- Wheel radius .37 to .34, in `SKYLINE_VEHICLE_DIMENSIONS` and in the test (actual tyre
  radius and wheel travel). Nothing in the sim reads this value: grounding measures the
  model. The photo wheel is .348 and the packet says about .34.
- `tools/test-repo-hygiene.mjs`: the look-sheet name pattern `round-N.jpg` now also accepts `v3-round-N.jpg` (the name the card brief asks for). It only widens one filename pattern; no size or placement rule is loosened.
- Rear lamp probe rays: the inner lamps now have an amber turn-signal centre, so the
  inner probe moves from (x .405, y .84) to (x .42, y .884) on the red ring above the
  amber. The outer probe stays (x .58, y .84). Both still require a brake light to be
  hit before any paint.

## Not done, honest limits

- The body is still lumpy in places (rear quarter, nose corners): that is the round 4
  loft, not touched this round. The creases are subtle in flat light.
- Wheels are still plain six-spoke discs, not the photo's alloy.
- The metallic flake and the grime are shader work and are not visible on the sheet.
- The armour kit, the sockets rows and V6's shop rows are not part of this round.

## Removed

`round-4.jpg` (the shape sheet, replaced by the V3 sheet; the round 4 review note stays
as the shape verdict). In the recipe: the flat headlamp lens and bezel patches, the old
square fog lamp patches, the plain "Tail lamp panel recess" cut. In the runtime: the
box mirrors, box wing, flat-box nose fills, the helper's torus tyre and tread bands and
the 300-triangle rounded-box calipers (their geometry is replaced after the helper
builds them). Raw review output under `.evidence` is deleted after the verdict.

## Handoff

Stop after round 1. Claude judges the art; at most two more rounds remain. No merge,
push, release, frame timing, integration-folder action or live-game action is authorized.

## Claude's review (28 October 2026, night)

Accepted for round 1 at 3.5 of 5 (Claude, look judge): creases, deep fascia, headlamp pockets, rear lamp pods, high brake light, diffuser, single exhaust, shaped mirrors, wing and wipers; four paints. Open polish: lumpy nose corners and rear quarters from the loft, plain wheels. Changed assertions (rule 18): wheel radius .37 to .34 to match the photo (nothing in the simulation reads it); inner rear-lamp probe ray moved onto the new lamp ring, still requiring a brake light before paint; hygiene allows v-numbered round sheets. Nothing loosened.
