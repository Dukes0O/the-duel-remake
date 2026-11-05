# TOWN-PANELS

The short board entry controls current state, ownership, dependencies and locks.

`src/town/ui/town-reports-panel.js`, `town-card.js` (person and building), `town-ledger.js`, `town-teach.js`. Section 4 and 10. Why? names the problem in one sentence and lights the route on the map. The Ledger has two columns and a plain profit line. Teaching follows `docs/board/cards/LAB-CLASSROOM-LANGUAGE.md`: whole sentences, every word explained the first time, no bare sliders. `tools/test-town-panels.mjs`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
