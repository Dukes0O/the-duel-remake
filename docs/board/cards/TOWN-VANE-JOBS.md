# TOWN-VANE-JOBS

The short board entry controls current state, ownership, dependencies and locks.

The three smaller jobs of Act 3 and what they need, from `docs/story/the-polite-letter.md`: **A Bottle of Her Water**, **Sand from the Shore** and **Walk the Bounds**, as `POLITE_JOBS` in `src/world/jobs/polite-letter.js`, and `POLITE_WORK` in `src/town/content/`. Also `toBuilding` on `haul`, the `mirage-billboard` row with its report, and the new `opensWhen` conditions in `src/town/town-opens.js` (section 7).

**Checks:** `tools/test-polite-jobs.mjs`, headless: each job wins on Easy at least 8 times in 10 at a child's pace; the plant's sand and salt cell stop and say why when short; paying for the billboard takes the money, changes no water, and the real plant can still be built.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read `docs/story/the-polite-letter.md` first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
