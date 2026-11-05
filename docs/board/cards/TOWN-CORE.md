# TOWN-CORE

The short board entry controls current state, ownership, dependencies and locks.

The base every other town card builds on. Sections 9 and 11.

Files: `src/town/town-data.js` (every building and number in section 11, one frozen table, nothing hidden in code), `town-state.js` (createTown(seed, name), serialize, deserialize with run-length rows), `town-grid.js` (64 by 48 cells, the Dome's 28 by 20 blocked, four spoke cells, footprints and rotation, "next to a connected road"), `town-commands.js` (`road`, `place`, `paint` homes or shops, `demolish` with half back; each returns ok or one plain sentence a child can read: "That needs to be next to a road."), `town-sim.js` (`stepTown`, `registerTownSystem(name, order, fn)`, date, generator from `src/rng.js` with its state inside the town), `index.js` (one import line a system).

`tools/test-town-core.mjs`: every command's yes and no cases; identical commands and seed give an identical fingerprint after 2,400 ticks; saving and loading mid-run changes nothing; a full town serializes to under 40 KB; every building id in the table matches the art cards' ids.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
