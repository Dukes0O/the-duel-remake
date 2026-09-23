---
task: FND-10
status: building
kind: tooling
flag: none
player_facing: no
---

FND-10 remains incomplete until a non-lossy storage design makes the hard 4 MB (4,000,000-byte) whole-origin limit enforceable.

## What changed

Added seven synthetic, literal historical save fixtures: single profile,
player list, drivers, courses, race settings, weapons, and current plus
archived leaderboard/ghost records. The fixture test loads each from
memory-only storage, checks retained fields, saves it, and checks the
round trip. No real browser career is read.

Added a whole-origin local-storage budget model. It counts every current
key and value as UTF-16 bytes, including a legacy profile, the old shared
best-time key, preferences, current and archived leaderboard rows, and
ghosts. It reserves the full 1,250,000-byte active-ghost budget rather than
using a small sample in its place.

## Evidence

- `node tools/test-save-fixtures.mjs`: seven shapes and 246 first-load/round-trip
  checks pass. The v1 fixture proves awardedWins moves into settledResults.
  The archive fixture keeps one current and one old-layout
  leaderboard entry and ghost, with every raw record field and ghost sample
  checked on first load.
- `node tools/test-storage-budget.mjs`: the explicit planning envelope uses
  3.67 MB of 4.00 MB (decimal; 4 MB = about 3.81 MiB). It has eight fully
  unlocked players, 60 history rows,
  128 personal bests and 128 keys in each settled-key collection per player;
  192 current and 96 archived leaderboard entries; 200 legacy shared bests;
  all current preference keys; the full active-ghost reservation; and one
  archived ghost with 1,800 eleven-field samples.
- Expected boundary: the same model reaches 4.08 MB with four valid archived
  ghosts. The real
  ghost loader retains all four. Thus the modeled envelope passes, but a
  literal whole-origin maximum below 4 MB **does not** hold.

## Remaining gap and safe follow-on

Player count, personal-best and settled-key counts, leaderboard rows and
archived ghosts have no production limit. The test does not impose one or
discard any career data. More than one plausible career can exceed the
budget even if the modeled envelope is below it. Future gallery images are
planned for IndexedDB and are outside this local-storage measurement.

To meet the hard acceptance criterion, first ship FND-11 export and automatic
backup. Then move growing archives out of localStorage into IndexedDB with
a transactional copy, readback validation and recovery path before removing
the old key. Measure the whole origin again with growth in players and
records; if any collection still cannot be bounded without losing data,
keep its archives in the larger store and show a clear save-failure path.
Do not silently cap old records, ghosts or player careers.

## Behavior and test changes

No game source or save format changed. These tests are discovered by the
existing test runner.
