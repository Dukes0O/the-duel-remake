# SEA-JOBS-1

The short board entry controls current state, ownership, dependencies and locks.

**The Long Ember, Finally, The Pour, The Haul,** from `SEA_JOBS`, in `src/world/jobs/sea-works.js`. `route` on `carry`, `keepOutside` on `hold` and `interrupts` on `escort`, as section 6 says.

**Checks:** `tools/test-sea-jobs-1.mjs`: each wins on Easy at least 8 times in 10 at a child's pace. Falling behind the Mule never ends the job.

Design: [docs/story/the-sea-works.md](../../story/the-sea-works.md), [docs/story/the-long-dry.md](../../story/the-long-dry.md) and [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) sections 2, 3, 10, 11. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, with no em dashes, and comes from the story page. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
