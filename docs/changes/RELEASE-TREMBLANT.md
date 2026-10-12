# RELEASE-TREMBLANT: switch on Tremblant Woods

Claude (Sonnet agent), 11 October 2026, lane `claude/release-tremblant`. Not merged;
Claude reviews and releases.

## What changed in the game

- `src/feature-flags.js`: `'tremblant-woods': 'on'`. `panorama-ridge` and `harbour-lights`
  stay `dev`. `grand-prix` is whatever integration has (the Grand Prix went out first).
- No other game code changed. Every other change is a test, a pin or this note.

## Real bugs found

None in the game. Switching the course on exposed two old test habits that assumed every
course is an old-style two-lap course, plus one place where a frozen copy of old code hard-wired
an 8 m road step (below). No saved-data or replay problem was found.

## Save check (rule 6)

- Earlier events keep their position and id: the sixteen older events are the first sixteen
  entries of `COURSE`; Tremblant is entry 17 (appended). Records, ghosts, history, unlocks and
  settings are keyed by event id (`stageEventId`, `eventKey`, `profile.courses.unlocked`), not by
  position. The only value saved by position is the in-progress race marker (`activeRace.stageIndex`),
  which lasts one race. See "For Claude" below about Panorama and Harbour.
- Old saves get nothing: the seven historical fixtures in `tools/fixtures/saves/` load with
  Tremblant locked, their unlocked lists exactly as saved, credits, records and ghosts unchanged
  (`tools/test-save-fixtures.mjs` and the new `tools/test-release-tremblant.mjs`).
- Price and menu: 1,600 credits, a paid unlock, listed on the course screen (locked until bought,
  unlocked after). Buying charges exactly 1,600 and adds only Tremblant to the list. The Team
  Room button and Grand Prix list follow the `grand-prix` switch; track analysis and the 27
  reference lap targets already include Tremblant (`test-track-analysis`, `test-reference-laps`).
- New test `tools/test-release-tremblant.mjs` pins all of this.

## Replay fingerprints

The 18 existing replay fingerprints (30, 60 and 144 FPS) are byte for byte unchanged with
Tremblant on: `git diff tools/replays/expected-fingerprints.json` shows one added entry
(`tremblant-woods-duel`) and nothing else. `tools/replays/recorded-inputs.json` gained the matching
case, because the replay test requires one primary replay per event. All 16 existing
world-composition signatures are also identical (checked with `--capture`).

## Mad Max (combat): decision for Claude

`docs/CIRCUITS.md` does not say whether the new circuits host Mad Max Duel, raiders and the UFO.
Tremblant is a `hasRival` course, so the shared rule `supportsCombat` already admits it, as it admits
the six expansion circuits. I checked it works rather than guessing: the UFO landing matrix (100 safe
jumps), the raider camp checks, the crossbow probe and the on-foot terrain check all pass with
Tremblant as a twelfth combat course. So the counts below went from 11 to 12 and no shared code was
changed. If you want Tremblant race-only, the fix is one generic option (for example `noCombat: true`
in the circuit data, read by `supportsCombat`) and the counts go back to 11.

## Changed assertions and the reason for each

Counts that grow by one with a correct new course:

| File | Was | Now | Reason |
| --- | --- | --- | --- |
| `tools/test-storage-budget.mjs` | 12 record events, 24 current / 12 archived records per player | 13, 26 / 13 | One more event. The 8-player budget still fits: 3.49 MB of 4.00 MB |
| `tools/test-world-composition.mjs` | 16 event scenes | 17; Tremblant signature added | New scene, baseline recorded from the reviewed round-2 art. All 16 older signatures identical |
| `tools/test-world-composition.mjs` (test canvas) | no radial gradient | `createRadialGradient` recorded like the linear one | Tremblant paints pebble textures with it; older scenes never call it |
| `tools/test-replays.mjs`, `tools/replays/recorded-inputs.json`, `expected-fingerprints.json` | 16 events, 18 cases | 17, 19 | Primary replay for the new event; older fingerprints unchanged (above) |
| `tools/replays/salt-flats-controls.json` | file hash `b55182cb...` of the fingerprint file | `ae370b62...` | The two Scrapdome/Salt Flats tests pin the whole file hash. The only change to the file is the one added Tremblant entry |
| `tools/test-ufo-landing.mjs`, `test-raiders.mjs`, `test-crossbow-aim.mjs`, `test-onfoot-camera-choice.mjs` | 11 combat courses (792 crossbow cases) | 12 (864) | Tremblant hosts Mad Max; the safety checks themselves pass for it |
| `tools/test-circuit-layouts.mjs` | all three circuits dev, COURSE has 16 | Tremblant on and appended as entry 17; the other two dev; players see only released circuits | The switch is on |
| `tools/test-feature-flags.mjs`, `tools/test-wasteland-beta.mjs` | `tremblant-woods` dev | on | The switch is on |
| `tools/test-reference-laps.mjs` | every circuit switch is dev | released ones are on, the rest dev | The switch is on |
| `src/test.js` | exactly 6 `kind: 'circuit'` events | 6 with `expansion` data | The count is of the six expansion circuits; Tremblant is an authored circuit |

Checks that assumed every course is an old-style course (each fixed for authored circuits only,
identified by `def.script`; the old courses keep the exact old rule):

| File | Change | Reason |
| --- | --- | --- |
| `src/test.js`, `tools/test-circuits.mjs`, `tools/test-campaigns.mjs`, `tools/test-course-car-choice.mjs` | "two laps" now "the course's own laps" (`def.laps \|\| 2`) | Tremblant is a three-lap Grand Prix circuit |
| `tools/test-campaigns.mjs` | starts the event by its list position, not by its `stage` number | Tremblant's `stage` label is 18, its position is 16 (it worked only because the start is clamped) |
| `src/test.js` | authored circuits must have zero chicken flock bonuses; others still at least 15 | A pure race has no roadside nitro bonuses; the circuit builder creates none |
| `tools/test-circuits.mjs` | the 60 m "real mountain climbs" rule skips authored circuits; their grade is held to the existing 32% authored limit (measured 27.9%) | Tremblant is rolling forest (32 m of relief by design, docs 5.3) with crests |
| `tools/test-shortcuts.mjs`, `tools/test-shortcut-presets.mjs` | authored circuits expect no generated shortcuts, like the expansion circuits | They are drawn by hand |
| `tools/test-terrain.mjs` | authored circuits expect the 16 m far-ground grid, like expansion circuits | That is what the circuit builder uses |
| `tools/test-polyline-terrain-integration.mjs`, `tools/test-practice-map.mjs` | the byte-exact legacy comparison covers the original fifteen race events | These compare against snapshots and frozen old code made before Tremblant existed |
| `tools/test-course-nearest.mjs` | the frozen copy of the old nearest-point search uses the course's own road step instead of a fixed 8 m | Tremblant's road is sampled every 2 m. The fixed 8 m made the frozen copy differ from the game by one nanometre on it. For the older courses (step 8) the copy is unchanged and results are still exactly equal (135,708 queries) |

No tolerance was loosened and no old fingerprint or signature was regenerated.

## Removed

Nothing replaced. No file removed.

## Checks run

- Lane tier, run 1 (flag on, before fixes): 23 suites failed; every one is accounted for above.
- Lane tier, run 2: 323 of 325 passed. The two failures were the Scrapdome and Salt Flats
  replay-file pin (now updated); both pass alone (`test-arena-pit`, `test-salt-flats`).
- Final, after merging integration 9948e9dc (Grand Prix on, Harbour landed, RELEASE DONE): lane tier 326 of 326
  suites passed, and `npm run build` passes.
- No frame timing (Tremblant passed 16.8 ms earlier). No browser check.

## For Claude

1. Combat on Tremblant: host (done) or race-only (one generic option), see above.
2. Order of circuits: `ALL_CIRCUITS` is Panorama, Harbour, Tremblant, and `COURSE` appends only the
   ones that are on. When Panorama or Harbour is released later, Tremblant moves up one place. Saved
   data is by id, so nothing breaks; only an interrupted race marker (`activeRace.stageIndex`) holds
   a position, so a race left unfinished across that release could point at the wrong course. If you
   want it airtight, release the circuits in the order they appear, or key the marker by event id.
3. `Tremblant.stage` is 18, not its list position. Harmless (it seeds scenery), noted because tests
   used it as a position.
