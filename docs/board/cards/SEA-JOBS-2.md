# SEA-JOBS-2

The short board entry controls current state, ownership, dependencies and locks.

**The Spillway, The Line, The Wheel, The Convoy,** from `SEA_JOBS`. `helpers` on `clear`, `helpers` and `enemies` on `defend`, `magnusClears`, and the scene with Mrs Vane walking up the steps, as section 6 says. Weapons do not fire in that scene. The Line reads who is at peace from the town and never from `wasteland.warlords`.

**Checks:** `tools/test-sea-jobs-2.mjs`: each wins on Easy at least 8 times in 10 at a child's pace, in three cases: every warlord at peace, none at peace, and every one driven off.

Design: [docs/story/the-sea-works.md](../../story/the-sea-works.md), [docs/story/the-long-dry.md](../../story/the-long-dry.md) and [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) sections 2, 3, 10, 11. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, with no em dashes, and comes from the story page. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
