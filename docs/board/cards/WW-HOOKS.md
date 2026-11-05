# WW-HOOKS

The short board entry controls current state, ownership, dependencies and locks.

Design section 8. `src/arena/modes/world-job.js`, `ARENA_MODES` entry, `canLeaveCar` list, the engine's requests carried out through raiders, pilot and captions, lending built for this game only. No `state.objective`. Replay fingerprints of every other mode unchanged.

**Checks:** new `tools/test-world-job-mode.mjs` on a real headless duel: start, step out and back, a lent weapon fires and is not in the save, a job finishes and settles once. Claude runs: one playthrough.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-HOOKS.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.
