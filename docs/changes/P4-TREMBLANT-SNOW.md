# P4-TREMBLANT-SNOW: Tremblant Snow

Claude (Sonnet agent), 11 and 12 October 2026, lane `claude/tremblant-snow`. Not merged;
Claude reviews the sheet and merges. Behind its own new switch `tremblant-snow` (dev).

## Design, before code

Tremblant Snow is the Tremblant Woods road in deep winter (docs/CIRCUITS.md 5.3). Same
road, same lap length (4,443 m), same hill, lake bowl, lodge, chairlift and safety kit; it
lives in `src/circuits/tremblant-snow.js`, which takes the road and the shared scenery pieces from
`TREMBLANT_SHARED` (one export added at the end of `tremblant-woods.js`; nothing above it changed, so
the live circuit is byte for byte what it was).

- **Surfaces.** Packed snow on every piece except Lodge Straight and Timber Straight (ploughed
  asphalt, sunny). Two shaded 50 m ice patches: just past the Fir Esses on the start of Ridge Run,
  and on the spur before Beaver Hairpin (never on the hairpin apex). Each has its ICE board 100 m
  before (the existing rule). Plough banks (deep snow) line the road from the end of Lodge
  Straight round to the start of it; none along Lodge Straight, where the pits are.
- **Tyres.** The race setup already offers the winter or summer choice on any course with snow or
  ice; this course has both, so it does. Winter tyres hold packed snow (1.00 against 0.75).
- **Pit lane.** On Lodge Straight, right side, per P4-PIT. The straight runs through the start line,
  so the lane lies on the part after the line (entry 10 m, exit 303 m, middle box at 157 m). The
  garages and pit wall stand behind the eight boxes.
- **Look.** A winter morning: sun 16 degrees up, pale, with the sky's blue fill giving cold
  shadows. Snow pines on every planted tree (the Snow world's), plough banks, snow rocks. The
  frozen lake in the same bowl as the water lake, with the dock standing on it. The ski mountain
  and its ring of hills are rounded and snow-covered over their high ground, with dark pines low
  down. No dark rock peaks. Open ground has soft drifts and wind ripples, so field, road and
  banks read apart (the Snow world read flat white in its final review).
- **Life.** Skiers (still figures) on the ski runs of the hill beside the road and of the far
  ski mountain; the chairlift runs as before; smoke rises from the lodge chimney.
- **Snowmen.** `SNOWMAN_SPOTS` in the circuit file lists eight spots near the lodge side of Lodge
  Straight. Nothing is drawn: P4-SNOWMEN has not landed. It reads that list when it does.
- **Grand Prix.** Added to `GRAND_PRIX_COURSES`. Race-only (`noCombat`). Price 1,800 credits in
  `COURSE_PRICES` (my choice; the doc gives none: a notch over Woods).

### Shared code: generic opt-ins only (no shared file names the circuit)

| File | Opt-in | Without it |
| --- | --- | --- |
| `src/snow-world.js` | `snowWorld.always`: winter whenever the course is on the list; `snowWorld.drifts`: soft drifts and ripples in the snow shader; a light's `winter` block overrides the shared winter colours | Exactly as before (the shared switch decides) |
| `src/circuit-effects.js` | `lake.frozen`, `hills[].palette`, `backdrop.colours.snow`, `effects.plainHills`, `effects.skiers`, `effects.smoke` | The same drawn world as before |
| `src/circuit-winter.js` (new) | Draws the skiers and the smoke | Not loaded unless asked |
| `src/pit-lane.js` | A straight that runs through the start line: the lane starts just past the line (before, its entry was a negative number and the lane was drawn and driven wrongly); the approach board counts across the line | Courses whose straight starts after the line: identical numbers |
| `src/world.js` | Passes `snowWorld.drifts` to the terrain shader | Identical |
| `src/circuits/index.js`, `feature-flags.js`, `race-field.js`, `course-access.js`, `start-preview.bat` | The new circuit, switch (`dev`), Grand Prix entry, price, preview flag | |

## Checks

- Own suite `tools/test-circuit-tremblant-snow.mjs` (11 tests): registration and switch, same
  road as the autumn circuit, the live circuit untouched, surfaces and tyre choice, ice rules and
  boards, pit lane and boxes, winter on and banks, scenery (no autumn trees, kit pieces clear of
  the road, no pine on a ski run), snowmen unused, skiers and smoke, light, and a full Grand Prix
  race with all seven computer racers home.
- Kit clearance: `node tools/test-track-kits.mjs --validate-circuit src/circuits/tremblant-snow.js`:
  459 High/LOD placements validated.
- Review tool and landmark pictures: `tools/track-review.mjs` now reviews a winter course on winter
  tyres; `tools/scenarios/tremblant-snow.mjs` takes the landmark views and the frame check.
  Browser smoke: 0 warnings, 0 errors.
- Reference lap for the Team Room: Stuttgart 959-S, Medium, winter tyres, **1:28.317** (sectors
  25.6, 39.6, 23.1 s; Tremblant Woods 1:17.068). Added to `src/generated/reference-laps.json` by
  building that one record with the production recipe and appending it: the other 27 records are
  byte for byte unchanged (checked). `build-reference-laps.mjs` drives a winter course on winter tyres.
- Test driver, Medium, winter tyres: 1:34.5 laps, no crash, no wall, no reset.

### Field balance (`tools/race-field-balance.mjs --course tremblant-snow`, 30 races per difficulty, three runs)

The test driver and the field both race on winter tyres (the balance tool now picks them on a winter
course). Starting from Tremblant Woods's pace (.87/.85/.85) the computer racers were far too slow
(test driver won 100/93/73%), so `fieldPace` went up.

| Run | fieldPace easy / medium / hard | Test driver wins | First-lap pile-ups |
| --- | --- | --- | --- |
| 1 | .87 / .85 / .85 | 100 / 93 / 73% | 0 / 1 / 2 |
| 2 | .92 / .91 / .91 | 80 / 27 / 10% | 3 / 0 / 3 |
| 3 | .91 / .90 / .90 | 90 / 50 / 27% | 2 / 1 / 0 |

Final `fieldPace` is **.92 / .90 / .90**: easy from run 2, medium and hard from run 3 (each
difficulty is raced independently, so the results combine). Every computer racer finished in 100%
of races. Targets met: easy 80% (60 to 80), medium 50% (30 to 50), medium and hard pile-ups
(at most 1 in 20). **Still missing**: easy first-lap pile-ups 3 of 30 (10%), hard test-driver wins
27% (target 10 to 25). Three runs are used; more tuning needs Claude's word (pile-ups move at random
between runs, 0 to 3 of 30, so a fourth run could land either side). Quick 8-race trials at other
paces informed the choice; they are not counted as results.

### Frame check

FRAME_CHECK_TBD

### Lane gate

GATE_TBD

## Changed assertions and the reason for each

No tolerance was loosened and no old replay, signature or save fixture changed.

| File | Was | Now | Reason |
| --- | --- | --- | --- |
| `tools/test-feature-flags.mjs` | 23 switches; dev list without the new one | 24; `tremblant-snow` in the dev list | The new switch |
| `tools/test-wasteland-beta.mjs` | catalogue without it | `tremblant-snow: dev` | The new switch |
| `tools/test-circuit-layouts.mjs` | three circuits registered, stages all different (3) | four, stages 4 | The new circuit. The driven-lap tests now start a winter circuit on winter tyres (`driveCircuit` takes a `tyre`), and **the reverse build is not driven for a winter circuit**: its ice, boards and pit lane belong to the forward road, and the reversed Beaver Hairpin on packed snow slid 3 m off the road for the test driver. P4-VARIANTS builds and tests reversed winter circuits with their own surfaces. The forward lap assertions (no crash, no reset, clean laps, lap times) are unchanged and pass |
| `tools/test-reference-laps.mjs` | 27 references | 28 | The new circuit's reference |

## Removed

Nothing replaced and no file removed. The pit lane's start on a straight that runs through the
start line replaces a case no course had used.

## Left open for Claude

1. **Price** 1,800 credits (not in the doc), and the `docs/COURSE_ACCESS.md` table has no row for it
   (dev only).
2. Balance: the two misses above.
3. Merge integration again after TREMBLANT-FIX lands (Kyle's grass and barrier faults on Tremblant
   Woods); this circuit builds none of that ground or barrier code, and the sheet shows the road
   clear of grass everywhere.
4. Ice reads quiet from the driver's seat (a glossy patch with the board): say if it needs more.
5. The look sheet `docs/board/looks/p4-tremblant-snow/round-1.jpg` is round 1 of three.
