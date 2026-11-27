# WW-ART-FAR: the Far Side's art kit

Claude session (local), 26 November 2026. Two rounds; Claude's director judges round 2.

- **What changed:** `tools/blender/far-side.py` builds `public/assets/models/wasteland/far-side/far-side.glb`: twenty
  named parts under one root `far-side` (the mill with its wheel and stream, the house, the barn, Maud's cart, the Top
  Pond's bank and new gate, PRUDENCE with her head and lunch tin, the old gallery, a tunnel ring, the portal, the spoil
  heap, Fourteen, a sheep, two conifers, an apple tree, grass, a rock, Maud and Wick). 29,408 triangles, 2.42 MB.
- No new photographs: surfaces are photographs already in the repository or pictures drawn in the recipe.
- One entry `ww-art-far` in `tools/test-blender-output.mjs`. Nothing is wired into the game; no event, so no sound cue.
- Sheets and reviews: `docs/board/looks/ww-art-far/round-1.jpg` and `round-2.jpg`. Lessons: `docs/ART_LINE.md`.
- **Checks, on the round 2 commit:** `tools/test-blender-output.mjs`, `tools/test-repo-hygiene.mjs`,
  `tools/test-review-evidence.mjs`, `tools/test-board.mjs`, `npm run build`. No frame check (rule 9). No lane tier:
  no game file changed.
- **For FAR-REGION:** the people face +Z, every other part's front is -Z; moss is on +Z; a walking Fourteen needs the
  wildlife line's rig.
- **Removed:** nothing. The kit is new and replaces no file.
