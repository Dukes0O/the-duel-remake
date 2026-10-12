# P4-TREMBLANT-SNOW: Tremblant Snow

Claude (Sonnet agent), 11 and 12 October 2026, lane `claude/tremblant-snow`. Not merged;
Claude reviews the sheet and merges. Round 2 (Claude's four art notes) is described under "Round 2". Behind its own new switch `tremblant-snow` (dev).

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
| `src/snow-world.js` | `snowWorld.softBanks`: the plough banks are one continuous rounded heap along each side (`softBankGeometry`, one draw), grey on the road side, instead of 1,600 kit pieces | Kit banks as before |
| `src/track-script-course.js` | `scenery.forest` takes `scale: [least, most]`, `jitter` and `clumps: { cut, size }` (groves with clearings, bigger trees in the groves); no extra random draws, so a forest without them is placed exactly as before | The old even rows |
| `src/circuit-effects.js`, `src/circuit-winter.js` | `effects.birches` (bare birches in groves, one instanced mesh), `effects.plainHills`, `backdrop.colours.patches` (dark rock and forest patches on the far hills) | Unchanged |
| `src/world.js` | Passes `snowWorld.drifts` to the terrain shader | Identical |
| `src/track-kits.js`, `src/circuit-effects.js` | `setPlacementPose(index, matrix, refresh = true)` and a new `refresh()`: the lift moves all its chairs and then refreshes the drawn selection once, not once per chair. Found by the frame check: with this circuit's 3,300 snow pines in the kit chunks, twenty refreshes a frame cost 10 ms (renderer update 10.4 ms, now 1.9 ms). The picture is the same; Tremblant Woods's lift gets cheaper too | The default `refresh = true` is the old behaviour |
| `src/circuits/index.js`, `feature-flags.js`, `race-field.js`, `course-access.js`, `start-preview.bat` | The new circuit, switch (`dev`), Grand Prix entry, price, preview flag | |

## Checks

- Own suite `tools/test-circuit-tremblant-snow.mjs` (16 tests): registration and switch, same
  road as the autumn circuit, the live circuit untouched, surfaces and tyre choice, ice rules and
  boards, pit lane and boxes, winter on and banks, scenery (no autumn trees, kit pieces clear of
  the road, no pine on a ski run), snowmen unused, skiers and smoke, light, and a full Grand Prix
  race with all seven computer racers home, and the solid barriers.
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

### Field balance (`tools/race-field-balance.mjs --course tremblant-snow`, 30 races per difficulty)

The test driver and the field both race on winter tyres (the balance tool now picks them on a winter
course). Starting from Tremblant Woods's pace (.87/.85/.85) the computer racers were far too slow
(test driver won 100/93/73%), so `fieldPace` went up.

| Run | `fieldPace` easy / medium / hard | Test driver wins | First-lap pile-ups |
| --- | --- | --- | --- |
| 1 | .87 / .85 / .85 | 100 / 93 / 73% | 0 / 1 / 2 |
| 2 | .92 / .91 / .91 | 80 / 27 / 10% | 3 / 0 / 3 |
| 3 | .91 / .90 / .90 | 90 / 50 / 27% | 2 / 1 / 0 |
| 4 (Claude's nudge, with `fieldFollow.firstLap` added) | .92 / - / .905 | 87 / - / 23% | 2 / - / 1 |
| 5 (final code, new forest) | .94 / - / .905 | 70 / - / 23% | 3 / - / 1 |

Final `fieldPace` is **.94 / .90 / .905** with `fieldFollow: { firstLap: { margin: 5, reaction: .5, closeIn: .8 } }`
(Harbour's first-lap care; Tremblant Woods has none). Every computer racer finished in 100% of races.
Targets met: Easy wins 70% (60 to 80), Hard wins 23% (10 to 25) and Hard pile-ups 1 of 30. **Still
missing**: Easy first-lap pile-ups, 3 of 30 (10%, target at most 1 in 20); they moved 3, 2, 3 across runs
whatever the pace, so pace alone does not fix them. **Not rerun**: Medium (.90, 50% wins and 1 pile-up
in run 3, before the round-2 forest and the first-lap care). Quick 8 to 10 race trials informed the
choices; they are not counted as results.

### The Tremblant fix (TREMBLANT-FIX, merged into this lane at 69b3935b)

The snow variant takes the fix's shared code (ribbon ground, hill pads, far-ground blending) and uses
its options: `farGround: { band: 120 }`, `solid: true` on the same eight kit pieces (barriers, fence,
pit wall, garages, stands, posts, lift towers), the hill pines sunk 0.35 m. The shared lake bowl
and dock carry the fix by themselves. Checked, not assumed:

- `tools/test-circuit-ground.mjs` now covers Tremblant Snow too (no ground, hill or water over the
  road or its shoulder; no piece floating or sunk; the ground behind the lake slopes). The pit
  garages floated 0.31 to 0.35 m (limit 0.3), so they stand 28 m from the road centre (was 31).
- Barriers: `tools/test-circuit-tremblant-snow.mjs` has the same checks as `test-circuit-barriers.mjs`
  for this circuit (solid boxes where drawn, no box in the pit lane, a car on winter tyres driven at
  seven barrier spots at 70 and 110 mph stops against them).
- The sheet was made after the merge: the road is clear of grass everywhere (see frames 8 to 10 at
  Beaver Hairpin).
- The reference lap rebuilt after the merge is identical (1:28.317).

### Round 2 (Claude's four art notes, same lane)

1. **Plough banks**: continuous rounded heaps with smooth tops, 0.5 to 1.2 m, slightly grey toward the road
   (`softBanks`). The kit pieces are no longer placed; the physical deep-snow band is unchanged and lies inside the heap.
2. **Pines**: groves of every size (0.45 to 2.1 times) with bare clearings, loose spacing, going back 56 m
   from the road (was 31), plus bare birches in groves (about 50, a white trunk, dark bands, thin branches).
3. **Light**: sun 20 degrees up, warm (`#ffd9a8`) and strong (3.0), the fill cut to 1.0 with a blue ground
   colour so shadows are clear and blue; sky clear and pale blue toward the horizon, fewer clouds. Exposure
   unchanged, so the snow keeps its form.
4. **Far hills**: dark rock patches on the upper slopes and dark forest on the lower, over the snow.

Changed assertions in my own new test: the sun is 15 to 26 degrees (was 10 to 20) and "warm" (red well above blue)
instead of "pale". The sheet is `docs/board/looks/p4-tremblant-snow/round-2.jpg` (replaces round 1).

### Frame check

**Pending, for the morning** (Claude: the laptop display is asleep overnight, which made the live
Tremblant Woods read 35.8 ms too). Last numbers, before round 2, display state unknown: Performance
17.6 / 18.2 ms; High 17.7 / 35.9 ms and Tremblant Woods in the same scenario 35.6 ms. Round 2 changes
the draw count (the 1,600 kit banks became one mesh; more pines, birches, one more ground mesh); measure
again with `node tools/browser-harness.mjs scenario tremblant-snow` (add
`TREMBLANT_SNOW_COURSE=tremblant-woods` for the comparison).

One real cost was found and fixed earlier: the lift refreshed the drawn selection of the snow pines once
per chair, twenty times a frame (renderer update 10.4 ms, now 1.9 ms; see the shared-code table).

### Lane gate

`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going` on the lane after merging integration
(69b3935b, Tremblant fix) and every change above: **399 of 399 passed, 0 failed, 0 not run**
(1,308.8 s). After round 2 the same gate again: **399 of 399** (1,298.3 s, jobs 4); `npm run build` passes.

## Changed assertions and the reason for each

No tolerance was loosened and no old replay, signature or save fixture changed.

| File | Was | Now | Reason |
| --- | --- | --- | --- |
| `tools/test-feature-flags.mjs` | 23 switches; dev list without the new one | 24; `tremblant-snow` in the dev list | The new switch |
| `tools/test-wasteland-beta.mjs` | catalogue without it | `tremblant-snow: dev` | The new switch |
| `tools/test-circuit-layouts.mjs` | three circuits registered, stages all different (3) | four, stages 4 | The new circuit. The driven-lap tests now start a winter circuit on winter tyres (`driveCircuit` takes a `tyre`), and **the reverse build is not driven for a winter circuit**: its ice, boards and pit lane belong to the forward road, and the reversed Beaver Hairpin on packed snow slid 3 m off the road for the test driver. P4-VARIANTS builds and tests reversed winter circuits with their own surfaces. The forward lap assertions (no crash, no reset, clean laps, lap times) are unchanged and pass |
| `tools/test-reference-laps.mjs` | 27 references | 28 | The new circuit's reference |
| `tools/test-circuit-ground.mjs` | Tremblant Woods, Harbour, Panorama | Tremblant Snow added to the cover, floating and slope checks | Same assertions, one more circuit |

## Removed

Nothing replaced and no file removed. The pit lane's start on a straight that runs through the
start line replaces a case no course had used.

## Left open for Claude

1. Price 1,800 credits approved; `docs/COURSE_ACCESS.md` has no row for it (dev only).
2. Balance: Easy first-lap pile-ups (3 of 30); Medium not rerun since the new forest.
3. Frame check pending for the morning (above).
4. Ice reads quiet from the driver's seat (a glossy patch with the board), the lodge smoke is faint on snow
   and the lake is a smooth sheet: say if any needs more. Look sheet `round-2.jpg` is round 2 of three.
