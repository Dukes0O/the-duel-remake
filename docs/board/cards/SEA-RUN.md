# SEA-RUN

The short board entry controls current state, ownership, dependencies and locks.

`src/world/jobs/steps/outrun.js`, the water front, **The Last Run**, **A Fortnight** as day captions over rising water, Imre's report, Hollis's log, and **Bo's answer** with its one button, as section 6 says. Then `sea.next`. The code has no "game finished" state.

**Checks:** `tools/test-sea-run.mjs`: a child-pace driver wins on Easy at least 8 times in 10; a caught car restarts its leg; nothing in the run is timed; the fortnight moves the town's clock 14 days and only once.

Design: [docs/story/the-sea-works.md](../../story/the-sea-works.md), [docs/story/the-long-dry.md](../../story/the-long-dry.md) and [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) sections 2, 3, 10, 11. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, with no em dashes, and comes from the story page. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
