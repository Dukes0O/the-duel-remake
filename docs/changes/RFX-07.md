---
task: RFX-07
status: review-needed
kind: refactor
flag: none
player_facing: no
---

## What changed

Expanded the packed save and record code in `src/progression.js` and
`src/leaderboard.js` into readable blocks. Profile normalization, player
selection, race settlement, purchase rules, record validation, archive
handling, and leaderboard ordering now have visible conditions and object
fields. No condition, value, property order, public export, or storage key
was intentionally changed.

The two files were formatted with cached Prettier 3.9.6 using single quotes,
a 100-character line width, no trailing commas, and unparenthesized single
arrow arguments. `--debug-check` passed on both the original committed source
and the formatted result. No formatter dependency or configuration was added.

## Assertions and fingerprints

No test or fixture assertion was edited. The seven historical save files,
record fixtures, and expected replay fingerprints are unchanged. The save
fixture suite checks every historical row field on first load and on round
trip, including archived rows.

## Verification

- Based on integration commit `fbe4389`, which includes OLD-02.
- `node tools/test-progression.mjs`: 27 progression and leaderboard checks.
- `node tools/test-progression-integration.mjs`: 141 App assertions.
- `node tools/test-drift-leaderboard.mjs`: 33 score, time, persistence and
  compatibility checks.
- `node tools/test-save-fixtures.mjs`: seven historical shapes and 246
  first-load and round-trip checks.
- `node tools/test-career-backup.mjs`, `node tools/test-career-budget.mjs`,
  and `node tools/test-old-best.mjs`: passed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 85 passed, 0
  failed in 436.42s. Replay fingerprints passed 162 checks; all eight
  campaign shards and 48/48 expansion driving runs passed.
- `npm run build`: passed, with the existing large rendering chunk warning.
- `git diff --check`: passed.

## Review

Independent save and record review is requested before integration. This
refactor changes presentation of the code only, so any changed race or record
fingerprint is a blocker.

## Independent review and current-source forward port

An independent reviewer regenerated both changed JavaScript files from their
parent with cached Prettier 3.9.6 and the recorded options. The outputs match
this commit byte for byte. Parsed code structures match after removing only
source positions and formatter metadata; comment text and order also match.
This covers literal storage keys, exports, control flow and object property
order. The reviewer reran historical save, progression, leaderboard and OLD-02
record checks with no findings.

The isolated `codex/wasteland-save-forward` branch applies the same commit to
current integration `41a6374`. Neither source file changed between the
original base and that integration source, so cherry-pick was conflict-free.
On the forward branch, seven historical shapes and 246 load/round-trip checks,
27 progression checks, 33 drift leaderboard checks, and the 64-player origin
budget all pass. The 93-suite lane gate passed in 200.73 seconds, production
build passed, and private High/Performance smoke captured four screenshots
with zero warnings or errors. This remains an isolated, reviewed lane while
the combat balance stop line is red.

## Integration

The combat balance gate is green after the tactical UFO revision. The reviewed
refactor merged as `6aa3da5` and `709faf3`. The exact 164-suite merge gate passed,
including unchanged replay fingerprints and all historical save fixtures;
the production build passed. Status: merged on `integration/wasteland`.
