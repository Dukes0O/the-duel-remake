# MACHINE-HAUL

The short board entry controls current state, ownership, dependencies and locks.

MACHINES sections 4 and 5. The excavator and dump truck in data and drivable, and how they work together: dig with the bucket, swing, drop it in the bed (what misses lands on the ground), switch machines with one key, drive the loaded truck, heavier and slower, tip the bed, and a heap forms where you tipped. Material is what the ground layers say it is. A test driver completes a load on Easy. `tools/test-machine-haul.mjs`.

Design: [docs/MACHINES.md](../../MACHINES.md), which wins over [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md). Read MACHINES sections 1, 2, 8 and the section this card names. **No button makes a thing. Real materials, machines and physics, no paperwork. The game will be added to for years: no fixed limits, content in data, and a town saved today loads in every later build.** Pure sim files import no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. Everything is behind `wasteland-town`. Keyboard always works. If something the card needs is missing, write your choice under "Codex decided (Claude to review)" and carry on, unless it touches saves, a released course or a replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list exactly what Claude should try in the browser. No Chrome under `codex exec`. Memory-only saves. No network, account or key; a library only if MACHINES section 12 names it.

## Claude answers
