# MULE-SCENE

The short board entry controls current state, ownership, dependencies and locks.

`src/world/iron-line-scene.js`: rails and sleepers along the whole line, the bridge and the dry channel under it, the Deck Town loop, the dam placed by the place table with solids matching what you see, and the rail gate whole or broken from the save. A `src/world/scablands-ground.js` hook gives the rails a flat bed, and a pad at the dam's foot and at the gatehouse, without moving any existing place. The new list of places sits beside `SCABLANDS_PLACES` and does not change it, and the line, the dam and its pads go in the region's reserved shapes (section 10), so a town growing past the ring road cannot build on them. Once the Mule is yours it runs up and down the line as scenery, view only.

**Checks:** a headless test that the solids match the art's outline and that every rail point has flat ground under it; `tools/test-everburn-easy.mjs` unchanged. Claude runs: looks, and the frame check once it can be reached.

Design: [docs/story/the-long-dry.md](../../story/the-long-dry.md), [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) sections 2, 3, 10, 11 and the checks in section 15. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

**The dam (Claude, 5 November).** `dam.glb` has passed for this story, from WW-ART-DAM round 9. Stand it against the game's own hills, with no gap at its ends, and check it from the lake bed and the cab: its side view reads flat on a plain floor, and the hills must fix that. Hide the part holding the spillway's wrecks. They are WW-ART-DAM-2's, and they do not pass yet.
