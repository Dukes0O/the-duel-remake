# RELEASE-TREMBLANT-SNOW: switch on Tremblant Snow

Claude (Sonnet agent), 12 October 2026, lane `claude/release-snow`. Not merged; Claude reviews
and releases. Same job as `RELEASE-TREMBLANT.md` (yesterday's Tremblant Woods release).

## What changed in the game

- `src/feature-flags.js`: `'tremblant-snow': 'on'`. `panorama-ridge` and `harbour-lights` stay `dev`.
- No other game code changed. Every other change is a test, a pin, the README release section,
  one price row in `docs/COURSE_ACCESS.md` or this note.

## Real bugs found

None. Each of the ten failing suites failed because a count grew by one, a replay and a world
signature were added, or a switch changed state, all expected with a new course switched on.

## Save check

- Tremblant Snow is the last entry of `COURSE` (entry 18), right after Tremblant Woods (entry 17).
  The sixteen older events and Tremblant Woods keep their position and id (`test-release-tremblant`
  checks the first sixteen ids, then `['tremblant-woods', 'tremblant-snow']`).
- Records, ghosts, history, unlocks and settings are keyed by event id. Tremblant Snow has its own
  record key (`tremblant-snow|layout:...`) that no other event shares. The unfinished-race marker
  already saves the course id (RELEASE-TREMBLANT); new checks show a saved Tremblant Snow race
  resumes by id, and that its id beats a stale position.
- The eight historical save fixtures in `tools/fixtures/saves/` are not edited. They load with
  Tremblant Snow locked unless the save itself lists it, with unlocked lists, credits, records and
  ghosts unchanged (`test-release-tremblant`, `test-save-fixtures`).
- Price and menu: 1,800 credits, a paid unlock. Buying charges exactly 1,800, adds only Tremblant
  Snow, and does not grant Tremblant Woods (and the reverse). One credit short cannot buy it. The
  course screen lists it with its price, locked until bought, unlocked after.
- Combat course count is still 11: `noCombat` is set on Tremblant Snow, so it hosts no Mad Max
  Duel, raiders or UFO. Rival Duel, Time Trial and Grand Prix stay.

## Replay fingerprints and world signatures

- Replays: `git diff tools/replays/expected-fingerprints.json` shows one added entry,
  `tremblant-snow-duel` (the same three fingerprints at 30, 60 and 144 FPS), and nothing else.
  The file was re-recorded with `--record` and then compared entry by entry with the committed
  one: all 19 older entries are byte for byte equal, so none was regenerated in effect.
  `tools/replays/recorded-inputs.json` gained the matching case (the test requires one primary
  replay per event).
- World composition: all 17 older scene signatures pass unchanged. The new `tremblant-snow`
  signature was captured twice with identical output, from the reviewed round-2 art.
- Tremblant Woods is unchanged: its replay, its world signature and its dedicated suite pass, and
  `test-circuit-tremblant-snow` still checks that the live circuit has no winter, ice, pit lane or
  snow option.

## Changed assertions and the reason for each

| File | Was | Now | Reason |
| --- | --- | --- | --- |
| `tools/test-circuit-tremblant-snow.mjs` | switch is `dev` ("until Kyle approves it"); Tremblant Snow is not on `COURSE` | switch is `on` (Kyle approved on 12 October 2026); it is the last `COURSE` entry, right after Tremblant Woods, and on for players with no URL flag | The switch is on |
| `tools/test-circuit-layouts.mjs` | released circuits: Tremblant Woods only; `COURSE` has 17 | Woods and Snow released; `COURSE` has 18; Snow is entry 18 and costs 1,800; a QA request for one dev circuit lists it plus both released ones | The switch is on |
| `tools/test-feature-flags.mjs` | `tremblant-snow` listed as dev | `tremblant-snow` is `on`, still 24 switches | The switch is on |
| `tools/test-wasteland-beta.mjs` | catalogue copy has `tremblant-snow: 'dev'` | `'on'` | The switch is on |
| `tools/test-reference-laps.mjs` | released circuit switches: Tremblant Woods only | Woods and Snow are `on`, the rest `dev`. The 28 reference targets are unchanged: they already include Snow (its 1:28.317 record is in `src/generated/reference-laps.json`) | The switch is on |
| `tools/test-storage-budget.mjs` | 13 record events; 26 current and 13 archived records per player | 14; 28 and 14 | One more event with records. The 8-player budget still fits: 3.51 MB of 4.00 MB |
| `tools/test-replays.mjs`, `tools/replays/recorded-inputs.json`, `tools/replays/expected-fingerprints.json` | 17 events, 19 cases | 18, 20; one added entry | Primary replay for the new event; the older 19 fingerprints are unchanged (above) |
| `tools/replays/salt-flats-controls.json` | file hash of the fingerprint file `ae370b62...` | `959c4802...` | The Scrapdome and Salt Flats tests pin the whole file hash. The only change to that file is the one added Tremblant Snow entry |
| `tools/test-world-composition.mjs` | 17 event scenes | 18; `tremblant-snow` signature added | New scene. All 17 older signatures identical |
| `tools/test-release-tremblant.mjs` | one appended course | two appended courses; new checks for Snow's key, price, purchase, course screen, saved race, no combat; fixture loop checks both ids | Extends the save proof to the new course |
| `tools/test-titan-climb.mjs` | no change | no change | It failed only because it runs the replay suite; it passes with the replay entry added |

No tolerance was loosened and no old fingerprint or signature was regenerated.

## Removed

Nothing replaced. No file removed.

## Checks run

- Ten suites failed with the switch on (lane gate, jobs 4): `test-circuit-tremblant-snow`,
  `test-circuit-layouts`, `test-feature-flags`, `test-release-tremblant`, `test-reference-laps`,
  `test-replays`, `test-storage-budget`, `test-titan-climb`, `test-wasteland-beta`,
  `test-world-composition`. Each now passes alone.
- Lane gate (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): 376 passed, 0 failed, 0 not run (1,586 s). `test-ufo-landing` still reports 11 combat courses. `npm run build` passes.
- No frame timing and no browser check were run in this lane. The P4-TREMBLANT-SNOW note lists
  the frame check as still pending.

## For Claude

1. Frame check for Tremblant Snow is still pending (P4-TREMBLANT-SNOW note); run it on the awake
   display before or after release.
2. Open balance item from the card: Easy first-lap pile-ups (3 of 30); Medium not rerun since the
   new forest.
