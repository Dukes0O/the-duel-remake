# TOWN-FIRE-JOB

The short board entry controls current state, ownership, dependencies and locks.

The first mission from a report to results and back. `src/world/jobs/steps/douse.js`, `src/world/jobs/town-jobs.js`, the mission card (vehicle pick, GO), `missionResult` settled once per run id. Fire cells on the real building, tank, refill at any tap or hydrant in a ring, hold H to spray at the nearest flames in front, fire grows as section 11. The town ticks during it as section 9, and the radio says serious news. A child-pace test driver wins it on Easy 8 in 10 or better (`tools/test-town-fire-job.mjs`). Sound: `town.bell`, `town.fire`. Flames use the helicopter's fire look.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
