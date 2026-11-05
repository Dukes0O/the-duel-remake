# TOWN-UTILITY

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-utility.js` and `town-reach.js`, registered as systems. Sections 3, 9 and 11: connected roads carry water and power; reach by road distance; litres drawn against the Water Road limit (read through a function passed in; TOWN-LINKS provides it later); brown against clean; storage; power and fuel; latrines and waste; a latrine within 4 cells of a well makes people there ill, with the reason ready for the Why? button; clinic cures. Every shortfall returns a plain sentence and the cells to show. Data for the overlays (Water, Clean, Food, Safety, Fire, Reach) as plain arrays. `tools/test-town-utility.mjs`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
