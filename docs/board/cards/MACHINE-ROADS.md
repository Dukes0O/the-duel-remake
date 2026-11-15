# MACHINE-ROADS

The short board entry controls current state, ownership, dependencies and locks.

Dozer: blade down, pushes material ahead of it as a real heap, cuts to the blade's height, fills ditches. Roller and paver: drive along a route and a proper road comes out behind you, in real grades that make trucks faster. `tools/test-machine-roads.mjs`.

Design: [docs/MACHINES.md](../../MACHINES.md), which wins over [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md). Read MACHINES sections 1, 2, 8 and the section this card names. **No button makes a thing. Real materials, machines and physics, no paperwork. The game will be added to for years: no fixed limits, content in data, and a town saved today loads in every later build.** Pure sim files import no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. Everything is behind `wasteland-town`. Keyboard always works. If something the card needs is missing, write your choice under "Codex decided (Claude to review)" and carry on, unless it touches saves, a released course or a replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list exactly what Claude should try in the browser. No Chrome under `codex exec`. Memory-only saves. No network, account or key; a library only if MACHINES section 12 names it.

## Claude answers

## Codex decided (Claude to review)

- Road work uses whole-metre cells. A blade carries material from a cut into a fill; rolling firms the fill and paving records its condition. The yard uses Space while driving to operate each road machine. The town connection still needs to be built.
- The yard starts with a raised patch and a shallow ditch in front of the dozer. They provide material to move and reset when the visit ends.
- Hold Shift while driving the paver to keep the steady pace needed for a smooth surface. Driving at full speed can leave a rough surface that the player can pave again.
- A town can apply the same individual machine actions to an optional road-work layer. Old towns gain no new field until work is applied. The yard remains separate from town saves.
