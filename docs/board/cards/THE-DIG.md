# THE-DIG

The short board entry controls current state, ownership, dependencies and locks.

Slice T0. A button in the yard behind `wasteland-town`: THE DIG. Drops you on the Scablands with a machine yard beside the Dome: the machines parked and ready, walk or press a key to get in any of them. No goals, nothing to lose, dig anything not reserved. What you dig stays, in a small memory-only save for now that TOWN-STORE replaces. `tools/scenarios/the-dig.mjs`, Claude runs it. Claude plays it, then Gratian.

Design: [docs/MACHINES.md](../../MACHINES.md), which wins over [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md). Read MACHINES sections 1, 2, 8 and the section this card names. **No button makes a thing. Real materials, machines and physics, no paperwork. The game will be added to for years: no fixed limits, content in data, and a town saved today loads in every later build.** Pure sim files import no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. Everything is behind `wasteland-town`. Keyboard always works. If something the card needs is missing, write your choice under "Codex decided (Claude to review)" and carry on, unless it touches saves, a released course or a replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list exactly what Claude should try in the browser. No Chrome under `codex exec`. Memory-only saves. No network, account or key; a library only if MACHINES section 12 names it.

## Claude answers

## Codex decided (Claude to review)

THE-DIG opens from the existing Scrapdome yard only while `wasteland-town` is enabled; its play module loads only after the player enters. The first sandbox uses the Scablands ground around the Dome, parks the trencher, excavator and dump truck in a row with a dirt heap and pipe for scale, and starts in the excavator cab. The art model includes a dozer, but this slice has no dozer simulation, so it stays parked and cannot be boarded. This follows the requested short first-play path and keeps the simulation separate from career saves.
