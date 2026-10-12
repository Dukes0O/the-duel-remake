# SCRAPDOME-TANKER-FIX

Kyle's reports from play (11 October 2026): the tanker boss takes no damage;
the hit area around the walls is far too wide; the Salt Flats has problems
near its walls; he drove through the outer wall in the Fuel Run; and he could
not tell which delivery pad was his.

## Design decision (the tanker)

The tanker is not broken: it follows the written rules. Its body cannot be
wrecked (SCRAPDOME.md section 10). Only its three red fuel valves take damage,
and the win is breaking them and planting the charge. The fault was that the
game never said so. The tanker's armor bar read 50 of 50 for the whole fight,
the top line read `VALVES 0 / 3` until a valve fully broke, and a ram that
missed the valves removed nothing without a word. All of that read as "no
damage". Headless runs confirmed the damage path works for every weapon: a
crossbow bolt removes 6 from the nearest valve, rockets 10 each in range, a
mortar every valve in its blast, a harpoon 6, and a hard side ram about 39
(a ram only counts within 3 m of a valve, which is about 5 m of the 11 m body).

How the player damages it (plain words): shoot or ram the three red valves on
the sides of the tank. Each valve has 150 armor. Hitting the body does
nothing. After a Toll Gate the rear valve glows for 3 seconds and takes double.
Break all three, then board it and plant the charge.

## What changed

- `src/arena/convoy.js`, `src/arena/modes/convoy-raid.js`: a player hit that
  misses every valve now says `TANK BODY TAKES NO DAMAGE / HIT THE RED VALVES`
  (at most once every 6 s); breaking a valve says `VALVE BROKEN / n OF 3`.
  New `convoyValveArmor` helper and `bodyHintAfterSec` state on the convoy.
- `src/combat-hud.js`: the tanker's floating bar now counts valve armor
  (`VALVES 441 / 450`) instead of the body armor that never moves.
- `src/screen-arena.js`: top line reads `VALVES 0 / 3 BROKEN · 98% ARMOR LEFT`;
  the Warlord introduction adds `WEAK SPOT: RED VALVES ON THE TANK`.

## What was wrong with the walls

Salt Flats: the wall containers and the inner salvage cars are drawn turned
along the oval, but each collided as the box that stays square to the map
around it. Where the ring bends that box reached up to 5 m past the drawn face
(the closest point sat 13.75 m from the centre line; the drawn wall is at about
19.6). Cars, shots and fighters stopped on nothing, up to 7.5 m early. The
Blender recipe fits the models to that old box, so it is kept as `collision`
and a new `contact` box (the turned box, `src/arena/venues.js`) is what
`src/course.js` now collides with. The model is unchanged and no rebuild is
needed.

Closed walls (Kyle: drove through the outer wall): walking thin paths through
every wall showed the Scrapdome ring's outer wall had open slots on 780 of
4,800 paths (16 percent, up to 2.7 m wide) because pieces sit every 8 m on the
centre line, which is further apart on the outside of a bend. Pieces now
lengthen to meet (`src/course.js`; the yellow stripe follows,
`src/race-structures.js`). The Salt Flats outer wall had 100 open paths of
6,400 and its inner salvage ring 44; contact boxes now lengthen the same way.
The Pit already had none. Cars were never able to leave the floor (the floor
edge stops them at 18 m on all three venues, checked headlessly on both cars
at full speed with boost), so the visible fault was gaps you could see through
and slip a shot or a footstep through.

The Scrapdome ring and Pit gap (1.5 m) is fixed in round 2 below.

## Fuel Run: finding your pad (round 2)

- Depot colours are strong and far apart: cyan (yours, always first), orange,
  lime, magenta (`FUEL_RULES.colors`, with `colorNames`). The depot is a lit
  disc with a thick ring.
- One tall beam at a time (Claude's rule). Not carrying: only loaded fuel pads
  show a warm white beam, and no depot does. Carrying: only your own depot
  shows a beam, in its colour; rival depots show just their coloured pad. A
  beam brightens and pulses gently within 40 m.
- A large screen arrow in the depot colour (top-centre, `src/combat-hud.js`,
  `src/combat-hud.css`) points to your depot, turned to the way you face, with
  `CYAN DEPOT · 122 m`, whenever you carry fuel. The round-1 floating 3D arrow
  was removed.
- HUD: the objective line is in your depot colour and names it; the top line
  says `TAKE IT TO THE CYAN DEPOT` while carrying.
- Pictures and notes: `docs/board/looks/fuel-run/` (round 2 replaces round 1).

## Wall hit box on the Scrapdome ring and the Pit (round 2)

The floor edge stops a car's centre 18 m out (Pit 32), so its side is at 19.02
and the wall face was 20.5 (Pit 34.5): a 1.5 m gap, which is Kyle's "far too
wide". Moving the floor edge is not an option: it is also the road width, and
jump landings, the ramp-side launch check and other pins depend on it (tried
19: the ramp-side test goes 4.1 m against its 4 m limit). So the wall moved in
instead:

- Scrapdome outer wall: `outerWallOffset: 20` (`src/arena/venues.js`,
  `src/course.js`); face 19.5, gap 0.48 m. The inner wall stays at 21: it bends
  the other way and a long car already touches its piece ends 1 m early; a
  closer wall would snag it.
- Pit: collision wall 35 to 34 and the drawn hulk wall 75 to 74.5
  (`src/arena/venues/pit.js`); drawn face 73.46, a car at the floor edge reaches
  73.02, gap 0.44 m (was 0.98 m), collision face 73.5.
- Salt Flats: unchanged (0.5 m).

Pins and fixtures updated, each because Kyle asked for the walls to meet the
visible face (not a tolerance change): `tools/replays/salt-flats-controls.json`
(ring physical hash), `tools/replays/arena-fuel-run-controls.json` (Last Car
Rolling and Sal pins; the three road pins are exact), `tools/test-arena-pit.mjs`
(wall offset 35 to 34, curvature ratio .875 to .85) and
`tools/test-rocket-fighter-contacts.mjs` (two parked cars moved from 20 m to the 18 m floor edge: 20 is now inside the wall) and
`tools/test-arena-ramp-side.mjs` (the three Titan straight-jump landings 24.3,
25.6, 29.1 to 19.5, 20.2, 28.8: the wide Titan drifts into the closer wall;
flight heights are unchanged).

## Wreck rate (round 2)

`test-arena-wreck-rate` (limit 10 to 14, untouched) now reads 13.17 (round 1:
14.42, baseline 13.83). Cause, found by comparing a round step by step: in round
1 the first difference was a car at the 18 m floor edge brushing the end of a
wall piece where a slot used to be; wall-hit counts per round did not change.
The wall change makes cars take a slightly different path and three of twelve
rounds went differently, so the mean drifted. A glancing-wall rule was tried
and had no effect on the number, so it was not kept. The number now sits at
13.17 after the Scrapdome outer wall moved in; it is a chaotic measure, so any
later arena change can move it again.

## Tests

New, each failing before the fix and passing after:

- `tools/test-arena-tanker-feedback.mjs` (5): body-miss message and its 6 s
  hold, valve-broken count, HUD armor percent, tanker bar on valves, intro.
- `tools/test-arena-wall-fit.mjs` (6): every boundary piece against the
  committed model (face within 0.5 m, centred), no solid reaching into the
  floor (13.75 m before, 19.4 m after), straight-in contact at the drawn face,
  every wall closed on thin paths in all three venues, a car at the floor edge
  within 0.5 m of the drawn face in all three venues, and the drawn Pit hulk
  wall measured in the built scene.
- `tools/test-arena-fuel-beacon.mjs` (5): colours, one tall column at a time,
  40 m brightening, screen arrow direction, HUD colour name.
- `tools/scenarios/arena-fuel-look.mjs`: private browser pictures, both
  graphics modes, both venues (a recipe; the pictures are not kept).

Changed assertions (reason: they encoded the defect). In
`tools/test-salt-flats.mjs` and `tools/test-salt-flats-art.mjs`, pieces placed
along the ring no longer have to equal the model's map-aligned box. They must
keep the drawn centre and stay within half a metre of it, and the turned fit
is measured against the model in `test-arena-wall-fit.mjs`. Nothing else was
loosened; the closed-cycle enclosure proof in the art test still passes.

## Checks run

- Salt Flats suites (`test-salt-flats.mjs` 61 and 16 checks,
  `test-salt-flats-art.mjs` 29 checks including the Blender build): pass.
- Convoy, Tollkeeper, fuel, depot, HUD, arena UI suites: pass.
- Lane tier and build: results at the end of this note.
- No frame timing (not needed for this card).

## Fingerprints

Non-arena courses: unchanged (replay fingerprints in `src/test.js` and the
circuit suites pass untouched). Arena courses changed, only because of the wall
fix, and three pins were updated with that reason:

- `tools/replays/salt-flats-controls.json`: Scrapdome `physicalSha256` (the ring
  outer wall pieces are longer). The eight-second trace and the ordinary replay
  file hashes did not change. Used by `test-arena-pit.mjs` and
  `test-salt-flats.mjs`.
- `tools/test-world-composition.mjs`: `titan-arena` and `titan-stunt-trial`
  hashes (the drawn wall pieces and stripes are longer). Node, mesh, instance,
  geometry, material and texture counts are identical.

Also the Titan arena and Titan stunt trial courses use the same ring walls, so
their walls are now closed too.

The wreck-rate drift this caused in round 1 is explained under "Wreck rate"
above and now passes.

## Removed

- The thin 0.22 m depot ring geometry and the fixed `BLUE DEPOT` text, replaced
  by the thicker ring and the real colour name.
- The round-1 floating 3D depot arrow and the rival depot columns, replaced by
  the screen arrow and the one-beam-at-a-time rule.
- The map-aligned collision for Salt Flats ring pieces (kept only as the
  Blender fit input, not as what anything collides with).

## Gate results

- Lane tier (`--jobs 4 --keep-going`): 391 of 391 after the one fixture fix above
  (the first run of the final code showed 390 of 391 with only that suite).
  `test-arena-wreck-rate` passes at 13.17.
- Earlier suites rerun on the final code: Salt Flats (61 and 16 checks), Salt
  Flats art (29, Blender), Pit, Pit render, ramp side, ambush alley, shove, fuel
  run, depot, beacon, wall fit.
- `npm run build`: passes.
- Pictures: `docs/board/looks/fuel-run/round-2.jpg`; no frame timing.
