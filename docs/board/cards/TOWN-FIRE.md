# TOWN-FIRE

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-fire.js`, registered. Section 11's fire numbers: starts, spreads to neighbours, burns to `burnt-N`, rebuild at half price; Fire Station sends itself within reach; a pure `hoseFire(town, buildingId, seconds)` the mission and the station both use. The first fire of chapter 4 is scripted on the soup kitchen and cannot destroy it before the player arrives. `tools/test-town-fire.mjs`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
