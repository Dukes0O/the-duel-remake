# TOWN-ART-PLANTS follow-up: radar

## Changed

Finished the radar model begun in the prior lane commits. Kept the four credited single-view reference photos and the separate `radar:dish` pivot. Tightened the side and front tower trace masks to exclude the separately modeled dish and drive assembly. Added an art-line note about removing moving photographed assemblies from static trace masks. The family model is 2,518,540 bytes; the radar is 1,688 triangles. The dish is a vertical-axis moving node at its centre.

Added the round-10 comparison sheet and review. The visual review found remaining side-view fragments, a red strip at the dish edge, and inconsistent top-view reference details. Claude should review these points and decide if another visual round is needed.

## Checks

- Blender recipe/export and renders: completed. Piece bounds, footprint checks, ground/contact checks and radar triangle count printed in `.qa-dist/town-art-plants-radar-blender.log`.
- `node tools/test-blender-output.mjs`: 377 checks, 0 failed.
- Browser checks and in-game look review: not run here; Claude should inspect the round-10 sheet and exported model.
- Lane tier and build: not run, as directed for this art card.
- Changed assertions: none in this follow-up. The previous radar registration in `tools/test-blender-output.mjs` was inherited from commit `c694c4e44`.
- Race fingerprints: not applicable; town art is not wired into race simulation.

## Removed

No prior passed building or model was removed. Scratch renders and logs will be cleaned from `.qa-dist` after the evidence is committed.
