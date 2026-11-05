# CAR-DRIVE-WASTE

The short board entry controls current state, ownership, dependencies and locks.

Follow `docs/UNLOCK_VEHICLES.md` and `docs/EARNED_CARS.md` for how a car is added. Handling that matches each: Rattler light and loud, Longhaul heavy, Scarab goes anywhere, Bully slow and silly with a plough. Built in the town's Workshop with scrap, not sold in the old garage; each also gets medal sheet support as every car has. Existing fingerprints and the computer field do not change. Claude reviews the design numbers.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
