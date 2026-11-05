# WW-SAVE

The short board entry controls current state, ownership, dependencies and locks.

Design section 8. `src/story/ember-save.js` and `src/world/world-save.js`, following `src/story/water-save.js`.

`profile.story.ember` through `registerStory`: read, job marks, end; marks only rise; unknown names kept. `profile.world.found`: places and finds, a list that only grows. Earning the flamethrower at job 3 and Cinder at job 6 goes through the existing routes
(`getProfileWeapons` unlocks, `wasteland.crew.unlocked`), never a new copy. A job's lending never writes anything.

Needs one independent review and the save checker (saves). A real career without these keys loads and saves unchanged.

**Checks:** new `tools/test-ember-save.mjs`: marks only rise, normalise keeps unknown names, a saved career round-trips, lending writes nothing, earning twice changes nothing, old fixtures in `tools/fixtures/saves/` load unchanged.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-SAVE.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.
