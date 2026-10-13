# RELEASE-PANORAMA: switch on Panorama Ridge

Claude (Sonnet agent), 12 October 2026, lane `claude/release-panorama` (off `integration/wasteland` at
`4bbd9b7a`). Not merged; Claude reviews, runs the release gates and does the live copy. Same job as
`RELEASE-HARBOUR.md`, `RELEASE-TREMBLANT-SNOW.md` and `RELEASE-TREMBLANT.md`. Kyle approved the
release ("go live") on 12 October 2026.

## What changed in the game

- `src/circuits/panorama-ridge.js`: the course's manifest says `state: 'on'` (was `'dev'`). That is
  the only game-code change. The feature switch, the course list, the price table and the Grand Prix
  list all follow the manifest, so nothing else needed a hand edit. Price stays 1,600 credits, a paid
  unlock; `noCombat` stays set, so it is a pure race track (Rival Duel, Time Trial, Grand Prix). The
  combat course count is still 11.
- Release order is unchanged (`releaseOrder` 3, after Harbour Lights at 2), so Panorama Ridge joins
  the end of `COURSE`. The released courses keep their places: Tremblant Woods is entry 17, Tremblant
  Snow entry 18, Harbour Lights entry 19 and Panorama Ridge entry 20 (zero-based 16, 17, 18, 19,
  asserted).
- `docs/COURSE_ACCESS.md`: price row for Panorama Ridge (1,600 CR) after Harbour Lights.
- `README.md`: a short Panorama Ridge release section.
- Everything else is a test, a replay or signature file, or this note.

## Real bugs found

None in the game. One test needed a correction (below): the "legacy trees" loop in
`test-expansion-vegetation-grounding.mjs` treated Panorama Ridge as an old course. It is not: its trees
are planted on the drawn mountain surface by design (`ridgeLandform`), and
`test-circuit-panorama.mjs` ("every native mountain tree root uses the actual upper drawn
triangles") already checks those roots. The stock demo driver did not crash on this mountain
circuit (unlike Harbour Lights), so `test-campaigns` and `test-opponents` needed no racing-line
exception, and the road-clear sweep in `test-circuits` needed no relaxed probe.

## Save check

- Panorama Ridge is the last entry of `COURSE`. The sixteen older events keep position and id, and
  the three released circuits keep theirs. With only the switches that were live before this release
  (Woods, Snow, Harbour) `circuitsEnabled` returns exactly those three in the same order (asserted in
  `test-release-tremblant`).
- Records, ghosts, history, unlocks and settings are keyed by event id. Panorama Ridge has its own
  record key (`panorama-ridge|layout:...`) shared by no other event. The unfinished-race marker already
  saves the course id: a saved Panorama Ridge race resumes by id, its id beats a stale position, and a
  saved Harbour Lights race still resumes Harbour Lights.
- The eight historical save fixtures in `tools/fixtures/saves/` are not edited. They load with
  Panorama Ridge locked unless the save itself lists it, with unlocked lists, credits, records and
  ghosts unchanged (the release test now loops over all four circuits).
- Price and menu: 1,600 credits, a paid unlock. Buying charges exactly 1,600, adds only Panorama
  Ridge, and none of the other three paid circuits gives it. One credit short (1,599) cannot buy it.
  The course screen lists it with its price, locked until bought, unlocked after. These checks are in
  `test-circuit-panorama-registry.mjs` (the course's own suite) and `test-release-tremblant.mjs`.

## Replay fingerprints and world signatures

- Replays: one new file, `tools/replays/courses/panorama-ridge.json` (19 lines): the primary case
  `panorama-ridge-duel` (Rival Duel, Falcone F42, same recipe as every other circuit) with three
  fingerprints at 30, 60 and 144 FPS, all equal (`95277c25eb8e289df27972c2a204b113ea31ca7f0431311a2016939aa5506927`).
  Course replays now live in per-course files (FAC-04), so there is no added line in
  `expected-fingerprints.json`. `node tools/test-replays.mjs --record` was run and then
  `git status` showed no modification to `expected-fingerprints.json` or to the Tremblant Woods,
  Tremblant Snow or Harbour Lights course files: every older entry was rewritten byte for byte
  identical (the file diff is empty; only the new file is added). Replay run afterwards: 198 checks,
  22 cases, 20 events.
- `tools/replays/salt-flats-controls.json` is not changed. Its `ordinaryReplayFileSha256` pin now
  covers the non-circuit fixtures only (FAC-04), which this release does not touch; the Scrapdome and
  Salt Flats suites pass.
- World composition: new file `tools/fixtures/world-signatures/panorama-ridge.json`, captured twice
  with identical output: hash `16c20d35f5ea41b662754b1887cb26a0b7a4d6bc07f3e07a7a8275d66cd1a44b`,
  337 nodes, 327 meshes, 20,150 instances, 57 geometries, 36 materials, 16 textures. All 19 older scene
  signatures pass unchanged; none was regenerated.

## Changed assertions and the reason for each

Most suites are now driven by the course manifests, so they followed the switch with no edit (feature
flags, wasteland beta, storage budget, course layouts count, replays count, ufo landing, campaigns,
opponents, circuits). These are the edits.

| File | Was | Now | Reason |
| --- | --- | --- | --- |
| `tools/test-circuit-panorama-registry.mjs` | manifest state `dev`, `FEATURE_STATES` `dev`, flag off for players, `COURSE` index -1 | state `on`, flag on, `COURSE` index follows the release order and is last, after Harbour Lights; price 1,600; 1,599 cannot buy; buying charges 1,600; no other paid course granted; course screen locked then unlocked (same checks Harbour's suite carries) | The switch is on |
| `tools/test-release-tremblant.mjs` | four-circuit order and release checks for Woods, Snow, Harbour | adds Panorama Ridge: places 16, 17, 18, 19, last on the list, own record key, saved id 19, price 1,600, purchase and course screen, saved unfinished race resumes by id, no combat, combat count 11 | Extends the save proof to the new course. The generic loops over released circuits (price, one credit short, unlocked list, all eight old-save fixtures) now include it |
| `tools/test-circuit-layouts.mjs` | a QA request for Panorama Ridge "goes after the released ones" and "players never see a dev circuit", using the live catalogue | the same two rules, using a test catalogue that holds Panorama Ridge back as a dev switch; comment updated | Panorama Ridge was the last dev circuit; with the live catalogue those two checks would pass without testing anything. Expected values are unchanged in meaning |
| `tools/test-expansion-vegetation-grounding.mjs` | the "legacy pine roots must not move" loop ran over every course that is not an expansion course | the loop skips ridge-landform courses (Panorama Ridge); the expansion loop is unchanged | Panorama Ridge's trees sit on the drawn mountain by design, covered by `test-circuit-panorama.mjs`. Trying the expansion loop on it fails (its mountain surface is not the expansion terrain), so it is a different kind of course, not a weaker check. Every older course is still held to bit-identical roots |
| `tools/test-reference-laps.mjs` | comment and check label say Panorama Ridge is still dev | comment and label updated; the check itself (switch state equals the manifest state) is unchanged | Wording only |
| `tools/test-replays.mjs` | success message "19 events" | "20 events" | One more event. The count of cases is asserted from `COURSE`, unchanged |
| `tools/test-world-composition.mjs` | success message "nineteen events" | "twenty events" | One more scene. Count is asserted from `COURSE` |
| `tools/replays/courses/panorama-ridge.json`, `tools/fixtures/world-signatures/panorama-ridge.json` | did not exist | new | Primary replay and scene signature for the new event |

No tolerance was loosened and no old fingerprint or signature was regenerated.

## Removed

Nothing replaced. No file removed.

## Checks run

- Full tier (`node tools/run-tests.mjs --tier full --jobs 6 --keep-going`, PowerShell) on the files as
  they stood during the run: 412 passed, 2 failed, 0 not run (1,922 s). The first failure was
  `test-expansion-vegetation-grounding` (explained above). The second, `test-salt-flats-art`, failed
  only because I edited that vegetation test while the run was in progress (that suite fingerprints
  protected files at its start and end). Both pass when run again alone on the final files (2 passed,
  0 failed).
- `test-drive-through` fails when the gate is started from Git Bash, because the tar program on
  that path cannot read a `C:` path ("tar: Cannot connect to C"). It passes (6 of 6) from PowerShell,
  where Windows' own tar is used. This is the machine setup, not the game or this release, and it
  does not involve Panorama's change. Start the gates from PowerShell.
- Lane gate (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`) on the final
  files, run from PowerShell: 38 passed, 0 failed, 0 not run (262 s). The lane tier is now a narrower set than in earlier releases (38 suites).
- `npm run build` passes (built in 688 ms; only the usual large-chunk notice).
- No frame timing and no browser check were run in this lane. Panorama's finishing evidence is in
  `P4-PANORAMA.md`.

## For Claude

1. The flag-off world is no longer testable with the live catalogue: no circuit is left in `dev`.
   `test-circuit-layouts` now holds Panorama back inside a test catalogue to keep the two
   dev-circuit rules honest. `test-drive-through`'s last test is still titled "a named dev circuit
   remains reachable"; it passes and still proves a named course is reachable, but the word "dev" is
   now stale. I left that file alone.
2. Run the release gates from PowerShell, not Git Bash (see the `test-drive-through` note).
