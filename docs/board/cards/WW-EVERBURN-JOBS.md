# WW-EVERBURN-JOBS

The short board entry controls current state, ownership, dependencies and locks.

Design section 5. `src/world/jobs/everburn.js`, six jobs and the three side jobs, data only. `tools/test-everburn-easy.mjs`: a child-pace test driver (`tools/water-easy-driver.mjs` pattern) wins each job on Easy at least 8 in 10, headless. If a job cannot reach that with its own settings, stop and ask Claude. Never change shared numbers.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-EVERBURN-JOBS.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.
