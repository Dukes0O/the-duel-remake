# TOWN-WORLD

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-world.js`, the grading hook in `src/world/scablands-ground.js` and the hook in the Scablands venue. Section 11. Buildings and sites are solids, roads are road, walkers step aside. The Dome and its gate stand in the middle, solid; driving up to the gate shows the prompt and goes to the Scrapdome panel. DRIVE starts a no-goal job at the town gate. A job's replay is repeatable from seed, inputs and layout. Everburn's Easy proof still passes unchanged. `tools/test-town-world.mjs`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
