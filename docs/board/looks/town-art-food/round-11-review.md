# Greenhouse round 11 review

The round sheet compares one photo and one exported-model view at each matching orthographic camera: side, front, rear and overhead. It then shows both three-quarter views and the mayor's view on plain grey ground in even light. The sheet is 1000×1734 pixels, 159,977 bytes.

The gabled silhouette, rusty frame, translucent panes and three green rows read as a greenhouse. The long-side silhouette is close to the side reference, and the roof shape reads from above and from the mayor's view. The frame and panes stay separate; the gable ends are closed with traced panes. The photos show more irregular windshield shapes, cracks and varied plastic patches than the model. The model uses simpler rounded panes and broad translucent sheets. Claude should judge those differences, pane transparency and plant visibility at town scale.

The model has 4,964 triangles. All 129 printed greenhouse-piece bounds passed the 3×2-cell footprint and touch-ground-or-another-piece checks. The exported family is 2,713,948 bytes and 29,434 triangles. `node tools/test-blender-output.mjs` passed 377 checks, 0 failures. The first run caught a 33,962-triangle family total; the geometry was reduced without changing assertions.

Claude should inspect all four matched photo/model pairs, both three-quarter views, and the mayor's view. In particular, check the see-through panes, the pale plastic patches, rust contrast and whether the crops read at town scale.

- `node tools/test-review-evidence.mjs`: 7/9 subtests passed. Round-sheet publication passed. The unrelated failures were the existing missing town-art-outposts round-15 review note and `spawnSync ffmpeg EPERM`.
