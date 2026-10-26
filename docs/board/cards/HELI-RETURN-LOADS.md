# HELI-RETURN-LOADS

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/HELICOPTER.md` section 13.2; this card names the slice.

Codex. Needs HELI-LANDED (the arrival panel shows the board's line).
Switch: `helicopter` (on): a live feature, so it ships only when green.

Build section 13.2: one crate job per away pad per play day, seeded from the
play day and the place; 60% of the same leg's car pay (plus 25% in Real
mode); one line saying who sent it; "Nothing more today" once done. Crates
use the lesson 4 crate and hook rules. Save one done-flag per place per play
day in `heli` through `normalizeHeli` (unknown keys kept), with a save
fixture for an old save without it.

Owns: `src/heli/heli-jobs.js` (the board), the panel line in
`src/heli/heli-ui.js`, tests in `tools/test-heli-jobs.mjs` and
`tools/test-heli-save.mjs`, `docs/changes/HELI-RETURN-LOADS.md`.
Hooks: `src/heli/heli-session.js` for spawning the crate at the away pad.

Acceptance: tests for the seed (same day, same job), pay against fuel (each
return load pays more than its leg's fuel), done-flag saved and old saves
loading; a scripted flight that takes a return load home and is paid;
a picture of the board line at Tremblant Snow; lane tier and build; the
independent save review (it adds a save key). Removed: nothing.
