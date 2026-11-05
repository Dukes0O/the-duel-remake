# SHIPS-SCENE

The short board entry controls current state, ownership, dependencies and locks.

`src/world/ships-scene.js`: the three ships, the lighthouse and the pilot boat placed where the job data says, with solids matching what you see and the deck plates lined up with the art. The lighthouse beam turns from the start of the game, so Captain Imre's line is true. The boat moves to the north gate once towed. The Dome lockup, a small barred door at the back of the Dome, comes from the existing Dome art if it has one, or a simple part from the kit. The new places go in the list MULE-SCENE made and do not move any existing place.

**Checks:** a headless test that the solids match the art's outline and the plates' heights match; `tools/test-everburn-easy.mjs` unchanged. Claude runs: looks, and the frame check once it can be reached.

Design: [docs/story/the-long-dry.md](../../story/the-long-dry.md), [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) section 9 and 13. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
