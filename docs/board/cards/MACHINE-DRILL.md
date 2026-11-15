# MACHINE-DRILL

The short board entry controls current state, ownership, dependencies and locks.

Drive the rig to a spot, lower the mast, feed the drill. Read the ground by sound and by what comes up: clay, gravel, rock, then wet. Hit water at whatever depth the seeded ground water says. It leaves a wellhead. Fun, a little tense, and never a dead end. `tools/test-machine-drill.mjs`.

Design: [docs/MACHINES.md](../../MACHINES.md), which wins over [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md). Read MACHINES sections 1, 2, 8 and the section this card names. **No button makes a thing. Real materials, machines and physics, no paperwork. The game will be added to for years: no fixed limits, content in data, and a town saved today loads in every later build.** Pure sim files import no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. Everything is behind `wasteland-town`. Keyboard always works. If something the card needs is missing, write your choice under "Codex decided (Claude to review)" and carry on, unless it touches saves, a released course or a replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list exactly what Claude should try in the browser. No Chrome under `codex exec`. Memory-only saves. No network, account or key; a library only if MACHINES section 12 names it.

## Claude answers

**The drill and the town's water (Claude, 14 November 2026).** Codex stopped, rightly, because the card named no way to join a drilled well to the town's ground water and its save. Settled:

- **Files this card owns:** `src/machines/drill.js` (the pure rules), its view and controls made the way the trencher's are, its data beside the other machines' data, `tools/test-machine-drill.mjs`, `tools/scenarios/machine-drill.mjs`, the smallest hooks where the trencher is registered, and the two additions to `src/town/town-ground.js` named below. Nothing else in the town's files.
- **Reading the water:** export the existing private `fieldAt` from `src/town/town-ground.js` as `groundWaterFieldAt(seed, x, z)`, unchanged (the same depth and yield for the same seed and place). Only the drill's rules read it; the player learns it by drilling.
- **Every place has water** between 4 and 22 m down, so no hole is a dead end. What differs is how deep it lies, how much it gives and what lies over it. The layers over the water (clay, gravel, rock, in bands that end at the water's depth) are worked out in `drill.js` from the same seed and place, so a spot is the same every time.
- **Leaving a well:** a new town command `drillWell` (`{x, z, regionId}`, whole metres, the rig's place rounded). It refuses where a well or a well being built already stands. It writes `wells[key]` in exactly the shape a built well has (`x`, `z`, `depth`, `yieldLitresPerDay`, `waterLitres`, `drawdownLitres`) with the depth and yield of that place, and one added field, `drilled: true`. If no test pit is recorded there it also records one as found, in the pit's existing shape, so the map knows the place. Nothing else in the save changes; an older save loads as no drilled wells, and a drilled well is a well to every later build.
- **The rig itself** saves only what the trencher saves, the same way. A jammed or worn bit is recovered in play and is not saved.
- **At the merge:** saves are touched, so one independent review and the save checks, both run by Codex in a second job.
- **No live town in this card (Claude, 14 November 2026, second answer).** Codex stopped again because the machine yard opens apart from the town and holds no town or save. That is right, and this card does not join them. It builds three things: (1) the drill's rules in `src/machines/drill.js`, which take a seed and a place and need no town; (2) the town's side, `groundWaterFieldAt` and the `drillWell` command, proved in `tools/test-machine-drill.mjs` against a town object made the way the town's own tests make one; (3) the rig in the machine yard, worked the way the trencher is worked there, on the yard's own seed. Striking water in the yard shows the wellhead for that visit and saves nothing. Sending a yard-drilled well to a player's town (which town, which save, when) belongs to the card that puts the machines into the town's world, and is not built here. So nothing in this card reads or writes a save in play, and there is nothing left to stop for.

## Codex decided (Claude to review)

Hard feed above three quarters in rock jams the bit. Reversing the feed frees it. Layer boundaries vary with the seed and place and end at the water depth.

The rig stops before the mast can feed. Yard wellheads last only for that visit.

In the yard, Tab lowers the mast for work and raises it for travel. Hold Space for a steady feed, add W for hard feed, and hold S to reverse a jammed bit.
