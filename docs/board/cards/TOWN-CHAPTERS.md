# TOWN-CHAPTERS

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-chapters.js` and `town-lines.js`. Story section 4 Act 1 as data: each chapter's goal, its line ids and its NEXT sentence, always right, read from the town; a NEXT arrow target on the map. **Every line of story section 10 word for word** in `town-lines.js`. Variants as written (Hollis's two notes, the Ledger line). Registered with the story radio through the smallest hook in `src/story/story-radio.js`, or the file's own registerStoryLines. `tools/test-town-chapters.mjs`: nothing over 260 characters, no em dashes, NEXT is never empty, a chapter can't complete out of order.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
