# P4-FINISH-1014: Claude's finishing pass on Harbour Lights, Tremblant Woods and Tremblant Snow

Claude (builder agent), 14 October 2026, lane `claude/finish-1014`. Cards: P4-FINISH-HARBOUR,
P4-FINISH-TREMBLANT. All three courses are live; nothing here goes live before Kyle's "go live".
Measurements: `tools/track-review.mjs` (stock test driver, as before) and `tools/drive-through.mjs` plus a
scratch run of the same review numbers with the racing-line driver (the one the computer racers, the
reference laps and the drive-through use). Seed 1989, Falcone F42, memory-only saves.

## Two drivers, two answers

The stock test driver (`App._driveAutopilot`) looks only 220 m ahead and ignores how slippery the road is.
The racing-line driver brakes from the circuit's own speed profile and scales it by grip. The old numbers
(Harbour 2:26 and a game over, Snow held at Beaver Hairpin) are the stock driver's. The racing-line driver
already drove all three courses cleanly before this pass.

## What changed

**Harbour Lights** (`src/circuits/harbour-lights.js`, `docs/CIRCUITS.md` 5.2, generated reference lap)
- Easier road, `layoutVersion` 1 to 2: Casino Corner radius 22 to 27 m; old town 12 m wide (10 before);
  Hairpin Approach, Lantern Hairpin and the road after it 13 m (12 before). The Lantern Hairpin radius stays
  9 m: two existing tests pin it (radius 9, slowest flying-lap speed under 35 mph) and it is the signature.
- Crest at the hairpin braking point softened: the descent used to start as a drop at Precinct Bend (grade 0
  to minus 13 percent). It is now spread (Hillside minus 4 m, Precinct Bend minus 3 m, Hairpin Approach
  minus 2 m, hairpin and the road after it level, Reservoir Run minus 17 m); the total drop is unchanged. Steepest grade
  14.5 percent before, 10.2 percent after. The level hairpin also keeps the two arms beside it on the same
  ground (a steeper version failed the existing "ground never lies over the road" test).
- The loop closes by stretching its straights by under 1 percent, as before. Length 4,053 m to 4,069 m.
  Harbour Return 61 to 63 m, because the closing seam left a sliver with no drawn ground under two paddock
  pieces at some lengths (see Open).
- Every distance after Casino Corner moved 9 to 20 m: shop rows, signs, lantern strings, lamp ranges, the
  waterside lamps, the three basins, Team Room intel flags and review frames were moved by the same amount.
  The hairpin escape road keeps its 55 m run (50 to 58 m were tried; this value keeps every kit barrier
  within the existing 1.5 m of a wall).
- Look: longer, stronger lamp pools on the road (pool length 13 to 20 m, strength .10 to .15 or .17), neon
  signs every 24 m from s 600 to the Fishmarket (every 30 m from s 905 before), neon halo 2.6 to 2.9 size and
  .5 to .7 strength, one more lantern string in the Fishmarket. Existing kit pieces and night glows only.
- `src/generated/reference-laps/harbour-lights.json` rebuilt with `node tools/build-reference-laps.mjs
  --event=harbour-lights` (the recipe, not hand edited).

**Tremblant Woods** (`src/circuits/tremblant-woods.js`)
- The 36 grove and 12 hill "autumn-tree" kit pieces (the round orange trees) are gone. The grove forest is a
  little denser instead (rows 4 to 5, 31 to 36 m deep, spacing 4.6 to 4.4 m); the share of tinted pines stays
  at 40 percent (an existing test pins 35 to 45 percent).
- 150, 100 and 50 m braking boards, existing `braking-board-*` kit pieces, added before Lodge Bend and
  Final Turn (Ridge Corner, Devil's Chicane and Beaver Hairpin already had them).

**Tremblant Snow**: no change (see below).

## Before and after

Harbour Lights, flying lap (second lap), review tool:

| | Before | After |
| --- | --- | --- |
| Racing-line driver lap | 1:23.23 | 1:23.09 |
| Racing-line driver, stops, crashes, resets | 0, 0, 0 | 0, 0, 0 |
| Racing-line driver, Lantern Hairpin / Casino Corner minimum | 26 / 48 mph | 33 / 53 mph |
| Racing-line driver, airborne | none | none |
| Drive-through lap (one standing-start lap, three CPU levels) | 86.1 s, pass | 86.0 to 86.2 s, pass |
| Reference lap (Stuttgart 959S) | 88.05 s | 77.70 s |
| Stock driver lap | 2:26.31, game over | 2:26.78, game over |
| Stock driver stops | Casino Corner, Lantern Hairpin (0 mph) | Casino Corner, Lantern Hairpin (0 mph) |
| Stock driver, airborne | 114 mph at Precinct Bend crest (s 1764); 143 mph in the braking-point frame | none (114 mph over the softened crest, wheels down) |
| Steepest grade | 14.5 % | 10.2 % |

The design lap (1:34) and the card's 1:30 to 1:45 band are not met on the fast side: the racing-line driver
is under 1:30 before and after (opening corners makes it slightly quicker). The stock driver cannot meet "no
stop": at Casino Corner it arrives at 189 mph with 220 m of lookahead, and the existing tests
(`test-campaigns`, `test-opponents`) already say so. No circuit number fixes that.

Tremblant Woods (look and boards only; driving numbers identical): racing-line lap 1:22.08, no stops, lowest
corner 49 mph (Beaver Hairpin); stock lap 1:32.65, lowest 47 mph, no stops; airborne only at the intended
crests (Ridge Run, the two on Timber Straight; Pine Drop for the line driver). Drive-through pass, 84.6 s.

Tremblant Snow (unchanged): stock driver on winter tyres 1:55.34, eight samples stopped at Beaver Hairpin
(s 1846 to 1852), corner minimums Lakeside Plunge 21, Ridge Corner 9, Beaver Hairpin 0, Lodge Bend 26,
Final Turn 17 mph. Racing-line driver: 1:34.54, lowest corner 41 mph, no stop. Drive-through: FAIL with the
same 7 issues as before this pass (a driven point 0.05 m past the road edge at s 396, and two barrier probes,
pit wall s 110 and catch fence s 1692, that stop short of the drawn wall); summer tyres on snow in that tool.

**Snow cause, found in the allowed time.** At Beaver Hairpin the stock driver arrives at 55 to 80 mph on
packed snow (grip .7), cannot turn, runs 3 m wide (lateral 9 to 10 on a 7 m half width) and crawls along the
tyre wall at 0 to 9 mph until it pulls clear. The stock driver sets its corner speed from the corner and the
car only, never from the surface. A scratch copy of the same driver with its corner speed multiplied by the
square root of the surface grip (what the racing-line driver already does) drives Snow in 1:39.79 with no stop
and a lowest corner of 32 mph (Beaver Hairpin 38, Beaver Kink 41, Ridge Corner 57, Final Turn 70). So the
cause is the driver, not the ice, the banks or the radius. Snow shares its road with Woods, so changing a
radius would change a live course for no gain. The fix is one factor in `src/app.js` (a busy file); it needs a
small Codex card: "stock autopilot: corner speed times the square root of surface traction".

## Records and ghosts

Saved times and ghosts are keyed by `layoutVersion` (`src/progression.js`, `src/ghost.js`,
`src/leaderboard.js`; `docs/GHOSTS.md`, `docs/PROGRESSION_V2.md`; `tools/test-layout-archives.mjs` and the
"Layout revisions isolate records" test cover it). Changing a course's road without raising the number would
let old times and ghosts race a different road. Raising it is the game's own, already tested path: old
leaderboard rows and ghost recordings move to `archivedEntries` / `archivedRecords` in the same save, intact
and never deleted, but they are not shown in rankings and are not played as ghosts on the new road; the new
road starts a fresh best-time table and reward baseline; money, cars and unlocks are untouched. So Harbour
Lights is changed (version 2) and its current records are archived, not lost; Kyle and Gratian start
Harbour times again. Lap recordings for the Team Room compare by a road fingerprint, so old recordings stop
matching the rebuilt reference (that is the check doing its job). Tremblant Woods and Snow: no road change, no
version change, records and ghosts untouched (trees, boards and forest density are looks and scenery; trees do
not alter the road). **Decision for Claude/Kyle before release: accept the Harbour record reset, or drop the
Harbour road commit and keep only the look and the crest.** The road change is one commit's worth of lines in
`harbour-lights.js` (the `script` array, width and climb numbers, the anchor shifts and `layoutVersion`).

## World signatures (not regenerated)

Fixtures in `tools/fixtures/world-signatures/` are untouched, so `tools/test-world-composition.mjs` fails on
exactly these two rows; Snow is identical. Printed by a scratch copy of that test, nothing written:

| Course | Fixture hash | New hash | Nodes | Meshes | Instances |
| --- | --- | --- | --- | --- | --- |
| harbour-lights | 0c6a6b5e...c1fd4c526a | fa7ebcc531f42009d2148fb18d21444315243f984a3b72670f620c657c69ef94 | 1141 to 1122 | 1124 to 1105 | 225,980 to 223,086 (geometries 230 to 228) |
| tremblant-woods | f9f8bc9c...ab9798db | e41e7deaf2d94c30669de64666291aee5cd0aecadc81daa23d130211cf7b5cca | 307 to 305 | 271 to 269 | 23,134 to 24,982 |
| tremblant-snow | unchanged | unchanged | 324 | 304 | 22,909 |

The visual differences are on the comparison sheets (`docs/board/looks/p4-harbour/round-3.jpg`,
`docs/board/looks/p4-tremblant/round-3.jpg`). Claude reviews and then regenerates these two rows.

## Tests run

- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`, final run: 40 passed, 1 failed:
  `test-world-composition`, on exactly the two rows above (expected; fixtures left for Claude to approve).
  `npm run build`: ok.
- Focused, all passing: test-circuit-harbour (15), test-circuit-layouts (12), test-circuit-ground (12),
  test-circuit-barriers (6), test-circuit-tremblant (24), test-circuit-tremblant-snow (17), test-track-kits
  (Harbour 1961 placements validated, Woods 323, Snow 459), test-course-kit (4), test-reference-laps,
  test-drive-through, test-replays, test-grand-prix-existing.
- Drive-through: Harbour pass, Woods pass, Snow fail unchanged (above). Track review with browser pictures run for
  all three before and after (Snow before only; unchanged).
- No frame check was run (AGENTS rule 9 for art; the full check's frame step owns it). Woods grew by 1,848
  instanced pieces (8 percent); Harbour has about 2,900 fewer. Worth a look in the next full check.

## Changed assertions

None. Two existing assertions (hairpin radius 9; flying-lap hairpin speed under 35 mph) were the reason the
hairpin radius stays 9.

## Removed

- The "autumn-tree", "autumn-tree-golden" and "autumn-tree-copper" placements in Tremblant Woods and the
  `trees()` function and its three unused imports. The three kit models stay (the kit manifest, `test-p4-kits`
  and the ground tests still list them); the janitor can remove them if the repository audit shows nothing
  loads them.
- The old Harbour reference lap data (replaced by the rebuilt file).

## Open

- Wet look: the road material is already the glossy "wet" version; without new shader code the best data-only
  gain is the longer lamp pools. A real mirror finish needs a small code card.
- Autumn pines read dark rust, not bright orange (the tint multiplies a green crown). Needs a code card or a
  changed share test; left alone.
- Latent fault, worth a small card: whether the closing seam leaves a sliver with no drawn ground depends on the
  road's exact length (Harbour road lengths 4062, 4065, 4066, 4067 and 4070 m failed; 4068.8 m passed). Also kit barrier pieces
  beside the hairpin escape road are placed by a nearest-road round trip that drifts by up to 1.3 m.
- Stock autopilot: lookahead and surface blindness (cards above). With those fixed the review tool would show
  Harbour and Snow inside the card targets.
