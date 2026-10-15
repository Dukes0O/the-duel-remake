# P4-FINISH-SUMMIT

Claude's finishing pass on Summit Run (dev course). One file changed: `src/circuits/summit-run.js`, course data only, using helpers that already exist. The road, Gallery, avalanche timing, pit and every race number are unchanged. The review and the checklist scores are in `docs/board/looks/p4-summit/round-4-review.md`; the before and after sheet is `round-4.jpg`.

## What changed

- **Valley below the Ledge (item 2).** One `basins` entry (`ledge-valley`, s 11459, lateral -420, surface -190, no `water` key) digs the far ground into a valley. The road and 36 m of shoulder each side are exactly as before (checked over every road station); nothing else within 150 m of the road changes outside s 10,700 to 12,100. The 48 town lights are moved from the hidden lower road (ground height 151 to 183 m) onto the valley floor (364 to 384 m, Ledge at 583.9 m), larger and warmer (size 7, strength 1.5).
- **Hut and observatory (item 3).** Eight warm halos around the hut's window band and nine down the observatory slot, through the existing `glows` rows.
- **Snow tone (item 4).** Fourteen pine clumps (7 pines, radius 10) and five large frozen ponds in the snow range, through the existing `pineClusters` and `ponds` options. Snow pine placements go from 39 to 135, all placements 845 to 941. Their random numbers are separate from the course's, so desert, pines and tree line are untouched.
- **Gallery wash (item 1).** Wash toned from strength 3.1 to 2.2 and a greyer colour (it was blowing out to white where the shed is visible). This only shows at the entrance tile until the cover is hidden (see below).

## Not done, with proposed hooks

1. **Gallery roof.** The dark mound is the tunnel rock cover. Proposed hook in `src/race-structures.js` `addTunnel`: skip the two `'rock'` geometry calls when `tunnel.cover === false`, then set `cover:false` on the Summit gallery. Tested and photographed (round-4 sheet, top row, right pair), then taken out of the lane. Patch: two one-line changes, no effect on any other course.
2. **Open Road banks.** `roadBranchMaterial` (world.js) only darkens snow branches, and the soft banks follow the main road only. A hook to give a paved branch the authored tone and edge banks would make the ploughed look.
3. **Snow tone.** The variation in `winterTerrainMaterial` has fixed strength and scale; a `snowWorld.variationStrength` and `variationScale` would let this track break the flat blue properly.
4. **Yeti fur.** Frost is a car paint; `yeti-view.js` has no tint. A `furTint` colour applied to cloned materials would lift it.
5. Review tool frames 2 to 16 for Summit come out black (also on the unchanged code); small card needed.

## Numbers

- Native races, before and after identical: summer 276.78 s, pit 277.37 s, winter 269.15 s. Summit's `--drive` still fails the pit-saving check (stop costs 0.58 s) exactly as before; no assertion touched.
- Review tool lap: 7:14.98, top 189 mph, same as before.
- World signature (Summit only, `test-world-composition --capture` with Summit added): old `4e30db187ac75a8feb0215365b665db53e664e4c5f0267e25ad4b461b194ebf4`, new `4e5196c3a209db5806184cbce2833adbcc90973e7519f5543b3b136b47b0a2e6`; counts unchanged (667 nodes, 642 meshes, 21,123 instances, 113 geometries, 62 materials, 19 textures). The fixture `tools/fixtures/world-signatures/summit-run.json` is NOT regenerated; Claude to approve the visual change shown on the sheet. The twenty other scene rows are unchanged (the normal test passes).

## Tests

`node tools/test-circuit-summit.mjs` passes; `node tools/test-circuits.mjs` passes (116,894 checks); 
ode tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going passes 38 of 38 (348 s) on the final commit contents; 
pm run build passes. One earlier lane run stopped on the looks-folder size check (see Removed) and was rerun after the fix. The lane tier does not include the Summit scene signature (Summit is not in the default course list), so the signature numbers above come from the capture tool with Summit added.

Changed assertions: none.

## Removed

The old 48 town lights on the lower road, replaced by the valley rows. The superseded round-2 sheet (docs/board/looks/p4-summit/round-2.jpg, its verdict is on the P4-SUMMIT card; the review note stays) is deleted: the looks folder was 116 KB from its 20 MB limit and the new round-4 sheet would have broken it. Scratch browser scripts and the lane's `.evidence` were deleted.
