# TOWN-OUTPOST-SCENE

The short board entry controls current state, ownership, dependencies and locks.

Outpost art placed in the Scablands as solids, with people standing around, Bo wandering, Tuesday the dog, Tam's goats, and fences the protection builds. Bury each pad's edges in the ground. `src/town/view/town-outposts-scene.js`, the outposts' list in `src/world/scablands.js` as a new list that does not move any existing place.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
