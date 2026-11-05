# TOWN-VEHICLES

The short board entry controls current state, ownership, dependencies and locks.

`src/town/work-vehicles.js` and the smallest hook in the arena's player setup. Fire truck, water tanker, supply truck and tow rig become drivable as section 9: not in `CARS`, no menu, medal or computer field. Heavy and honest: slow to turn, a real sense of weight, all driveable by a child, with the fire truck's bell on a key. Handling numbers on the card's change note. `tools/test-town-vehicles.mjs`: drives, stops, turns inside a road; no change to any existing fingerprint. Dozer, ambulance and Vane's trucks join by data when TOWN-ART-TRUCKS-2 lands.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
