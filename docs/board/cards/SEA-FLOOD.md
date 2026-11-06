# SEA-FLOOD

The short board entry controls current state, ownership, dependencies and locks.

The sea, after `sea-open`. Section 6: a saved shape for the Scablands' ground through the edit layer, the water surface, the Causeway staying above it, hulls floating as view only, the lighthouse on its rock, driving into the sea stopping gently and returning you to the shore with a line, and the Harbour Wall with its gates and ramp. Until the `sea-wall` site is finished the ground is byte for byte as it is, and so are all replays. Courses and venues are untouched. Add the moved or stopped jobs in section 6.

**Checks:** `tools/test-sea-flood.mjs`: walks every job in every story list and refuses one that lands in the sea; the fingerprint before `sea-open` is unchanged; a save with the sea open loads. Claude checks frames.

Design: [docs/story/the-sea-works.md](../../story/the-sea-works.md), [docs/story/the-long-dry.md](../../story/the-long-dry.md) and [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) sections 2, 3, 10, 11. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, with no em dashes, and comes from the story page. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
