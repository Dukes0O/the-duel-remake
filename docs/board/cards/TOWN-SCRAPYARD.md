# TOWN-SCRAPYARD

The short board entry controls current state, ownership, dependencies and locks.

MACHINES section 5. `src/town/town-scrapyard.js`, `content/machine-parts.js`. Every machine has a list of parts to find: a tractor wreck to tow home from the Boneyard, a chain, rams from an airliner's landing gear. Parts come from salvage, jobs and traders, shown as a picture with what is still missing. Building takes a short time at the Scrapyard, and the first start-up is an event. First machines in order: flatbed (you have it), trencher, dump truck, excavator. `tools/test-town-scrapyard.mjs`.

Design: [docs/MACHINES.md](../../MACHINES.md), which wins over [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md). Read MACHINES sections 1, 2, 8 and the section this card names. **No button makes a thing. Real materials, machines and physics, no paperwork. The game will be added to for years: no fixed limits, content in data, and a town saved today loads in every later build.** Pure sim files import no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. Everything is behind `wasteland-town`. Keyboard always works. If something the card needs is missing, write your choice under "Codex decided (Claude to review)" and carry on, unless it touches saves, a released course or a replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list exactly what Claude should try in the browser. No Chrome under `codex exec`. Memory-only saves. No network, account or key; a library only if MACHINES section 12 names it.

## Claude answers

### Codex decided (Claude to review)

The lane has no scrapyard screen or machine graphics hook in its owned files. This card will keep the pure simulation and part definitions in its named modules, and expose a display-ready machine list with a picture key and missing parts. A later screen or art card can render that list. Part arrival is recorded with its source (`salvage`, `job` or `trader`); the caller that completes those activities supplies the part. Building takes 15 simulated minutes. The flatbed is owned from the first view; each later machine can start only after its predecessor is owned and all listed parts are present. Finishing records a one-time startup event.
