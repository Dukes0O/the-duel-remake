# TOWN-JOBS-2

The short board entry controls current state, ownership, dependencies and locks.

Step kinds `tow`, `repair`, `fence`, `clear`, `hold` in `src/world/jobs/steps/`, and the jobs of story chapters 7 to 12 in `town-jobs.js`: the food run with trade back, Dot's fire with raiders, the fence run, the chalk run, up to the goats (Titan or rally only), the tanker (sloshing: heavy on the turn), the water crane on foot. Then the section 5 repeatable jobs: pipe patch, road clear, rescue in a dust storm, fuel escort (stolen turns into a chase), truck raid (same fight, other side: `side`). Each wins on Easy 8 in 10 at child pace (`tools/test-town-jobs.mjs`). Sounds named.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
