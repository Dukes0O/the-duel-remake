# WW-LINES

The short board entry controls current state, ownership, dependencies and locks.

Design section 5, every word as written. `src/story/ember-lines.js`, as `src/story/water-lines.js`: captions with the radio click, no voice file, no new cue. Line ids `story.ember.<who>.<n>`. Note ids unspoken.

**Checks:** new `tools/test-ember-lines.mjs`: every line of the table is registered, unique, has a speaker and a place, and contains no em dash. Words only: imports nothing from the game.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-LINES.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.
