# TOWN-VIEW

The short board entry controls current state, ownership, dependencies and locks.

`src/town/view/town-scene.js`, `town-camera.js`, `town-instances.js`, `town-pick.js`, `town-chunks.js`. Section 12's camera, continuous zoom from street to Scablands height. Uses the Scablands ground and distant detail from WW-SCENE. Reads town state only. Roads as a ground layer by class, painted zones, buildings per node with instancing and chunk culling and level of detail from `public/assets/models/wasteland/town/*.glb`, sites as `scaffold-N`, the Dome. The underground view (pipes, sewers, wires). Until a family's art lands its buildings draw as a plain box: list which in the change note; TOWN-VIEW-ART removes the boxes. Green and red placement ghost; picking. Holds rule 8 at a 10,000 person test town. Day, night and season from the calendar, lamps on at dusk. `tools/test-town-view.mjs` for what runs without a browser.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

## Codex decided (Claude to review)

- WW-SCENE's existing Scrapdome Yard and Tin Town models provide this slice's landmarks. Unfinished town building families use instanced, state-tinted stand-ins until TOWN-VIEW-ART supplies reviewed models. The view builds Scablands ground chunks around the camera even for an empty town, then culls distant chunks as the camera moves. The view reads town records and never writes them.
