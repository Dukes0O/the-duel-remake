# TOWN-EASY

The short board entry controls current state, ownership, dependencies and locks.

`tools/test-town-easy.mjs`: a test player who only ever does what the NEXT line says, plus sensible placing, across 10 seeds, on Easy. Must meet section 11's targets. Then tune `town-data.js` numbers up to 30% each way until it does, writing every change and why in the change note for Claude's review of the design numbers. Also: a test player who ignores everything never gets a stuck town; a greedy Dear-everything town loses people and recovers when prices drop; a full 300-person town runs 1 game day in under 20 ms of sim time.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
