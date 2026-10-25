# SKI-SAVE

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/HELI_SKIING.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). H5 sections 7 and 9. Switch
`heli-skiing` (dev). Can start now.

- `profile.heli.ski = {version: 1, best, medal, paid, stashes}` in the
  helicopter save (`src/heli/heli-save.js`), optional, unknown keys kept.
- `recordRun(profile, run, result)`: keeps the best time or score, raises the
  medal, pays the difference up to that medal (150, 300, 500 in all), once;
  `findStash` pays 100 once; credits stop at the save's cap.
- Fixture `tools/fixtures/saves/<next free>-heli-ski.json`; the save checker.
- `tools/test-heli-ski-save.mjs`: medals pay once and only the difference;
  stashes once; old saves read as nothing skied; switch off records nothing.

Owns: `tools/test-heli-ski-save.mjs`, the fixture,
`docs/changes/SKI-SAVE.md`. Hooks: `src/heli/heli-save.js`. Locks:
`save-shape`. Sound: none. Art: none.

Acceptance: the test, the save checker, lane tier, build, one save review.
Removed: nothing.

## Claude answers

Settled 25 October: all three answers in the question file are approved as built. (1) The medal comes from the ski rules through the caller; the save accepts only a whole 0 to 3 (a result with any other medal, or a bad time or score, is refused) and the pay is capped at 500 a run. (2) Run and stash names this game does not know are kept and never paid; a `ski` record with a newer version is left exactly as it is and every write is refused, and so is a write over a newer helicopter. (3) No zero entries are stored; a paid medal raises `medal` to it; the fixture is `tools/fixtures/saves/19-heli-ski.json` and the save checker gained one check.
