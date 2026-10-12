# RELEASE-HARBOUR: switch on Harbour Lights

Claude (Sonnet agent), 12 October 2026, lane `claude/release-harbour`. Not merged; Claude reviews
and releases. Same job as `RELEASE-TREMBLANT.md` and `RELEASE-TREMBLANT-SNOW.md`. Kyle approved
the release on 12 October 2026.

## What changed in the game

- `src/feature-flags.js`: `'harbour-lights': 'on'`. `panorama-ridge` stays `dev`.
- `src/circuits/index.js`: `ALL_CIRCUITS` is now in release order (Tremblant Woods, Tremblant Snow,
  Harbour Lights, Panorama Ridge). The course list is built from it, so a circuit switched on later
  joins the end and the released ones never move. With only the switches that are live today
  (Woods and Snow) the list is exactly the live build's. Harbour Lights is the 19th entry.
- No other game code changed. Every other change is a test, a pin, the README release section, one
  price row in `docs/COURSE_ACCESS.md` or this note.

## Real bugs found

None in the game. Three suites tripped over Harbour Lights for test-method reasons, described below
(the road-clear sweep in a 9 m hairpin, and the stock demo driver in two suites). Nothing a player
would meet: the extra proof is a direct check that no wall stands inside the road, and the circuit's
own suite drives every lap with the racing-line driver without a single crash.

## Save check

- Harbour Lights is the last entry of `COURSE` (entry 19). The sixteen older events keep their
  position and id; Tremblant Woods is still entry 17 and Tremblant Snow entry 18, exactly as in the
  live build (`test-release-tremblant` checks the indexes 16, 17, 18, the first sixteen ids, and the
  full id list).
- The reorder does not change the live game: `circuitsEnabled` given only the live switches returns
  `['tremblant-woods', 'tremblant-snow']`, the same two in the same order (asserted). A circuit
  released later (Panorama Ridge) goes after the released ones whatever order switches were added in.
- Records, ghosts, history, unlocks and settings are keyed by event id. Harbour Lights has its own
  record key (`harbour-lights|layout:...`) shared by no other event. The unfinished-race marker
  already saves the course id: new checks show a saved Harbour Lights race resumes by id, its id
  beats a stale position, and a saved Tremblant Woods race still resumes Tremblant Woods.
- The eight historical save fixtures in `tools/fixtures/saves/` are not edited. They load with
  Harbour Lights locked unless the save itself lists it, with unlocked lists, credits, records and
  ghosts unchanged.
- Price and menu: 1,800 credits, a paid unlock (`COURSE_PRICES`, `docs/CIRCUITS.md` section 7;
  a row added to `docs/COURSE_ACCESS.md`). Buying charges exactly 1,800, adds only Harbour Lights,
  and neither Tremblant course gives it. One credit short cannot buy it. The course screen lists it
  with its price, locked until bought, unlocked after.
- Combat course count is still 11: `noCombat` is set on Harbour Lights (checked again). Rival Duel,
  Time Trial and Grand Prix stay.

## Replay fingerprints and world signatures

- Replays: `git diff tools/replays/expected-fingerprints.json` shows one added entry,
  `harbour-lights-duel` (three fingerprints, at 30, 60 and 144 FPS), 5 added lines and nothing
  else. The file was re-recorded with `--record` and then compared entry by entry with the committed
  one: all 20 older entries are byte for byte equal. `recorded-inputs.json` gained the matching case.
- World composition: all 18 older scene signatures pass unchanged. The new `harbour-lights`
  signature was captured twice with identical output, from the reviewed finishing round 2 art.
- Tremblant Woods and Tremblant Snow replays, signatures and dedicated suites pass unchanged.

## Changed assertions and the reason for each

| File | Was | Now | Reason |
| --- | --- | --- | --- |
| `tools/test-circuit-layouts.mjs` | `ALL_CIRCUITS` in the order Panorama, Harbour, Woods, Snow; released: Woods and Snow; `COURSE` has 18; Snow is last; a QA request for one dev circuit lists it first | release order (Woods, Snow, Harbour, Panorama); released: Woods, Snow, Harbour; `COURSE` has 19, Snow entry 18 and Harbour entry 19 (last); a QA request for Panorama Ridge goes after the three released ones; the "dev circuit never reaches players" check now uses Panorama Ridge | The switch is on and the list is in release order |
| `tools/test-circuit-tremblant-snow.mjs` | Snow is last in `ALL_CIRCUITS` and last on `COURSE` | Snow is right after Woods in both, and Harbour Lights is last on `COURSE` | Harbour Lights was released after it |
| `tools/test-feature-flags.mjs` | `harbour-lights` listed as dev | `harbour-lights` is `on`, still 24 switches | The switch is on |
| `tools/test-wasteland-beta.mjs` | catalogue copy has `harbour-lights: 'dev'` | `'on'` | The switch is on |
| `tools/test-reference-laps.mjs` | released circuit switches: Woods and Snow | Woods, Snow and Harbour `on`, Panorama `dev`. The 28 reference targets are unchanged (they already include Harbour) | The switch is on |
| `tools/test-storage-budget.mjs` | 14 record events; 28 current and 14 archived records per player | 15; 30 and 15 | One more event with records. The 8-player budget still fits: 3.52 MB of 4.00 MB |
| `tools/test-replays.mjs`, `tools/replays/recorded-inputs.json`, `tools/replays/expected-fingerprints.json` | 18 events, 20 cases | 19, 21; one added entry | Primary replay for the new event; the older 20 are unchanged |
| `tools/replays/salt-flats-controls.json` | file hash of the fingerprint file `959c4802...` | `0bbe35b5...` | The Scrapdome and Salt Flats tests pin the whole file hash. The only change to that file is the added Harbour entry |
| `tools/test-world-composition.mjs` | 18 event scenes | 19; `harbour-lights` signature added | New scene. All 18 older signatures identical |
| `tools/test-release-tremblant.mjs` | two appended courses | three; new checks for the live-switch list, Harbour's key, price, purchase, course screen, saved race, no combat; fixture loop checks all three ids | Extends the save proof to the new course |
| `tools/test-circuits.mjs` | the road-clear sweep probes 5 m (or road half width minus 2) either side of the centre line | same, except where the bend radius is under 15 m within the next 8 m, where the probe on the inside of the bend is 1 m closer to the centre line | See "The Lantern Hairpin sweep" below. Every other course and every other place on this one keeps the full reach |
| `tools/test-campaigns.mjs`, `tools/test-opponents.mjs` | every course driven by the stock demo driver | Harbour Lights driven by the racing-line driver (`useRacingLine`, the driver the circuit suites use) | See "The stock demo driver" below |
| `tools/test-titan-climb.mjs` | no change | no change | It failed only because it runs the replay suite; it passes with the replay entry added |

New check in `tools/test-circuit-harbour.mjs`: every corner of every track wall lies outside the
drivable width (nearest margin 0.49 m, test asks for 0.4 m).

No tolerance was loosened and no old fingerprint or signature was regenerated.

### The Lantern Hairpin sweep

`test-circuits.mjs` sweeps a 4.9 m by 2.2 m car straight along the road at three offsets and fails
if a barrier is hit. In the 9 m radius Lantern Hairpin the car body, 4 m inside of the
centre line, overhangs the bend by about half a metre, so the probe touched the inner wall. Direct measurement
shows the walls are not in the road: the nearest wall corner anywhere is 0.49 m outside the road
edge (new check above) and the hairpin driving test passes with no crash. The probe on the inside of
a tight bend is therefore 1 m nearer the centre line. A car hugging the inside edge of the hairpin
apex can brush the inner wall; that is what a walled hairpin does. Claude may want to look at it.

### The stock demo driver

The demo driver in `src/app.js` looks only 220 m ahead, so it cannot brake in time for Casino
Corner (22 m radius, after about 900 m at full speed) or the Lantern Hairpin. It crashed at both on
every lap, 3 hard hits ending the race. `track-script-drive.mjs` already says this, and the circuit
suites use the racing-line driver for that reason. The two suites now do the same for Harbour
Lights. The demo driver itself is untouched, as every reference lap and balance run uses it.

## Removed

Nothing replaced. No file removed.

## Checks run

- First lane gate run (jobs 4, partly while tests were being edited): 6 failed suites, each
  explained above: `test-circuits`, `test-campaigns` shard 3, `test-opponents`, `test-replays`,
  `test-titan-climb`, `test-world-composition`. Each now passes alone.
- Lane gate (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`) on the final
  files: 376 passed, 0 failed, 0 not run (1,137 s). `test-ufo-landing` still reports 11 combat
  courses. `npm run build` passes.
- No frame timing and no browser check were run in this lane. The frame check for Harbour Lights
  (11 October 2026, mid-race 17.8 ms) is in `P4-HARBOUR-FINISH-2.md`.

## For Claude

1. Decide whether the hairpin's inside wall is as you want it (above). It is not a blocked road.
2. Panorama Ridge stays dev; when it is released, it goes after Harbour Lights with no reorder.
