# FAR-JOBS-1

The short board entry controls current state, ownership, dependencies and locks.

**Whose Goat Is This?, Too High, The Long Shaft,** from `FAR_JOBS`, in `src/world/jobs/far-side.js`. `heliceiling`, `noPilot` and `loadLengthMetres`, as section 6 says. Fourteen in Old Tam's yard. Parts for the machine through the Scrapyard's route (`build-borer`).

**Checks:** `tools/test-far-jobs-1.mjs`: each wins on Easy at least 8 times in 10 at a child's pace, with the lent truck and with no pilot.

Design: [docs/story/the-far-side.md](../../story/the-far-side.md) and [docs/MACHINES.md](../../MACHINES.md). A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, with no em dashes, and comes from the story page. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
