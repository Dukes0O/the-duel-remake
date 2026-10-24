---
task: SKI-RULES
status: review
kind: feature
flag: heli-skiing
player_facing: no
---

# Heli-skiing: the ski rules (24 October 2026)

Card `docs/board/cards/SKI-RULES.md`, design `docs/HELI_SKIING.md` sections
4 and 5. Pure rules in `src/ski/`, runnable without graphics, repeatable from
the inputs, with nothing reaching the game yet: no drawing, no sound, no
save, no way into the helicopter. Built on `cloud/ski-rules` from
`integration/wasteland`.

## What it adds

- `src/ski/ski-physics.js`: the skier at 1/120 s on a height function
  `world.ground(x, z)` (y is height above the sea, so the air thins with it).
  Gravity along the slope; snow friction 0.05 (0.045 right wax, 0.06 wrong);
  air drag with the square of speed (0.6 m2 standing, 0.25 m2 tucked,
  density x e^(-h/8,500 m)); carving radius 17 m x cos(edge), edge up to 60
  degrees (8.5 m), a tuck holds the edge to 20 degrees; skid friction 0.4;
  skating below 15 km/h; leaving the ground when it falls away under the
  ballistic path; the pop (2 m/s); spins and flips in the air; the landing
  rule (the path within 20 degrees of the slope and every rotation within 30
  degrees of whole) and the 3 s tumble. `advanceSkier` runs a frame of any
  length as whole fixed steps, so 30, 60 and 144 frames a second are one run.
- `src/ski/ski-score.js`: timed runs with gates (5 s a miss), moguls (turns
  60%, air 20%, speed 20%), aerials (air 20%, form 50%, landing 30%), timed
  medals from the guide's time (+8%, +18%) and judged medals at 80, 65, 50.
- `src/ski/ski-guide.js`: a pure-pursuit driver skis the planned line with the
  real physics as fast as it allows (tucked where straight); the guide is that
  run at 92% pace: time = best time / 0.92, speed x 0.92. It returns the ghost
  (10 samples a second, `ghostAt` interpolates).
- `src/feature-flags.js`: switch `heli-skiing`, `dev`. The two switch
  inventory tests gain its row (`test-feature-flags.mjs` count 33 to 34 and
  the dev list; `test-wasteland-beta.mjs` one row). **Claude's written
  review of those two assertion changes goes on the card (rule 18).** Nothing
  is loosened.
- `tools/test-ski-physics.mjs` (110 checks), written alongside the rules.
- `start-preview.bat`: `heli-skiing` added to the preview's flag list
  (outside the card's named files, but `test-preview-launcher.mjs` requires
  every dev switch to be requested there, so the new switch fails the lane
  tier without it). No test changed.

## Settled in writing (the packet leaves these open)

- The skis go where they point: a grounded skier moves along the slope in its
  heading and the edges take up any sideways pull, so a traverse holds its
  line; only carving or skating turns the heading.
- Carving: R = 17 m x cos(edge) from 10 degrees of edge up; below 10 degrees
  the turn eases in from nothing, so flat skis run straight (otherwise 0
  degrees would be a 17 m turn). A carve keeps its speed at any speed.
- Standing still or below 15 km/h the skier swings the skis (up to 90
  degrees a second, fading to nothing at 15 km/h) and W pushes off.
- A skid is the S key and stands the skier up (no tuck while skidding). A
  tumble slides at skid friction with no control.
- A finished rotation is within 30 degrees of a whole turn; half a turn lands
  backwards and tumbles. Rotation is per axis (spin A/D, flip W/S).
- A safe landing keeps the speed along the snow and drops the push into it; the
  skis point along the path.
- Deep snow: the zone supplies `world.extraFriction(x, z)`, added to the snow
  friction. The values are for SKI-RUNS (powder).
- A gate is a pair of poles and a direction; passed by crossing the line
  between them the right way, missed by crossing beyond a pole or by passing a
  later gate first. Start and finish are gates.
- Moguls: a turn is a change of side (edge past 20 degrees on the other side
  from the last turn) at 3 m/s or more on the snow; the turn score is turns
  over the zone's planned turns. Air: each jump is 50 for a clean landing, 50
  more for a whole spin or flip (330 degrees or more), a tumble is 0. Speed:
  100 at the guide's time, a line to 0 at one and a half times it.
- Aerials: air = half the height and half the distance against the zone's
  targets; form = 50 for the planned rotation done plus 50 for steadiness
  (none on the other axis, fading out by 90 degrees); landing = 100 softened
  by up to 40% for how steeply it met the snow, 0 for a tumble.
- The guide's "92% of what the line allows" is the best run on the line scaled
  to 92% pace, as above; the driver never skids and uses skating off the flat.
  Its look-ahead is 3 m + 0.1 s per m/s (at most 8 m), chosen so a 4 m x 50 m
  wave is followed within 1 m.

## Sound events

The physics returns the events the cues follow; nothing plays them yet
(SKI-AUDIO / SKI-VIEW): `skiCarve` and `skiSkid` (each `{on}`, when a hard
carve or a skid starts and stops), `skiPop`, `skiLand` (`safe`, `impact`
m/s for a heavier thud, `angle`, the flight), `skiTumble`; the scoring returns
`skiStart`, `skiGate` (`index`, `passed`) and `skiFinish`.

## Tests and checks

New `tools/test-ski-physics.mjs`: a fall-line run settles within 2% of the
drag-balance speed (standing and tucked), a tuck is faster, thinner air is
faster (by formula and in the run), wax orders the speeds; a 60 degree carve
turns at 8.5 m (a half turn ends 17 m across), 30 degrees at 17 x cos 30, and
a carve keeps its speed; a skid slows by 0.4 g; skating stops at 15 km/h; a
jump off a lip follows the ballistic path to 2 cm; safe, crooked, spun, half
spun and popped landings follow the rule; the same run at 30, 60 and 144
frames a second matches exactly; gates, medals, moguls and aerials have worked
scoring examples; the guide matches the hand-skied tucked line within 2% and
follows bendy lines within 1 m.

Run in the cloud (Linux, no graphics): `npm run build` passes. Lane tier
(`--changed --jobs 8 --keep-going`, run on the branch before the preview
launcher line was added): 404 passed, 9 failed. Eight need the laptop and none
touches the ski code: `test-course-kit`, `test-earned-cars-ui`,
`test-full-check`, `test-drive-through`, `test-medals` (each asserts `win32`
or runs `pwsh`), `test-salt-flats`, `test-salt-flats-art` (read
`C:\\Users\\kyleb\\dev\\art-library`) and `test-vesper-art` (needs a real
local Blender). The ninth, `test-preview-launcher`, was the new switch missing
from `start-preview.bat`; fixed above and it passes.

## Removed

Nothing.
