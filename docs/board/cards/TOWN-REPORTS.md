# TOWN-REPORTS

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-reports.js` and `town-events.js`, registered. Section 4: a queue with who, what, where and up to three answers; worst and newest first; each answer says what will happen; `answerReport` command; a report ignored plays out as it said. First events: fire, sickness, traders' deals (buy food or fuel), dust storm (fog and a slow day), Road Rat raid on the edge of town, child's drawing, Vultures' saving. Seeded, with none in the first 10 minutes except scripted ones, and never more than three unanswered bad ones at once. Plain text ids in `src/town/town-report-text.js`, no em dashes, funny where it can be, section 9 of the story for voice. `tools/test-town-reports.mjs`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
