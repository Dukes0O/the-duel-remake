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

Left as is: on the Scrapdome ring and the Pit the floor edge stops a car 1.5 m
short of the wall face (Salt Flats is now 0.6 m). Moving it means changing the
frozen floor width and the arena fingerprints; it is a choice for Claude.

## Fuel Run: finding your pad

- Depot colours are now strong and far apart: cyan (yours, always first),
  orange, lime, magenta (`FUEL_RULES.colors`, with `colorNames`).
- The depot is a lit disc with a thick ring. Yours also has a tall light column
  (56 m, brighter while you carry fuel, fainter when you are close so it never
  fills the view). Rivals get a short column in their own colour. A thick arrow
  floats above your cargo pointing at your depot while you carry fuel.
- Loaded fuel pads show a short pale column so pickups read from afar.
- HUD: the objective line is in your depot colour and names it (`BRING FUEL TO
  YOUR CYAN DEPOT`, replacing the fixed word BLUE); the top line says
  `TAKE IT TO THE CYAN DEPOT` while carrying. The carried can already took the
  depot colour.
- Pictures and review notes: `docs/board/looks/fuel-run/`.

## Tests

New, each failing before the fix and passing after:

- `tools/test-arena-tanker-feedback.mjs` (5): body-miss message and its 6 s
  hold, valve-broken count, HUD armor percent, tanker bar on valves, intro.
- `tools/test-arena-wall-fit.mjs` (4): every boundary piece against the
  committed model (face within 0.5 m, centred), no solid reaching into the
  floor (13.75 m before, 19.4 m after), straight-in contact at the drawn face,
  and every wall closed on thin paths in all three venues.
- `tools/test-arena-fuel-beacon.mjs` (5): colours, columns, arrow, fade, HUD.
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

OPEN: `tools/test-arena-wreck-rate.mjs` (Medium full-field mean must be 10 to
14) now reads 14.42, was 13.83. Three of the twelve rounds took a different
path (viper 1989 and 7, banshee 2024) because cars can no longer slip into the
old slots. Wall-hit counts per round are unchanged, so this is the simulation
moving, not more wall damage. I did not touch the limit. Claude to decide:
accept and rebalance, or re-seed the rounds.

## Removed

- The thin 0.22 m depot ring geometry and the fixed `BLUE DEPOT` text, replaced
  by the thicker ring and the real colour name.
- The map-aligned collision for Salt Flats ring pieces (kept only as the
  Blender fit input, not as what anything collides with).

## Gate results

- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`):
  390 of 391 suites pass. The one failure is `test-arena-wreck-rate.mjs`
  (OPEN above). An earlier run also showed `src/test.js`, `test-terrain`,
  `test-shortcuts` and `test-audio` failing at 5 to 32 s while the machine was
  loaded; each passed on its own and in this run.
- `npm run build`: passes (run after the release full tier finished).
