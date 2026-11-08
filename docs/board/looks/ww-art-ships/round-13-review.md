# WW-ART-SHIPS round 13 review

Date: 7 November 2026  
Build: Blender 4.5.13 LTS; all six views rendered from the exported GLB imported into an empty scene  
Sheet: `round-13.jpg` (1600 x 1800, 115,134 bytes)

## Triangle counts

- Good Hope: 10,064 triangles.
- Marigold: 9,790 triangles.
- Patience: 8,568 triangles.
- Named ship roots total: 28,422 triangles.
- Whole-file read-back: 42,668 triangles. The remaining 14,246 are the lighthouse (3,060), pilot boat (6,950), lake-bed geometry (3,600), and ship mesh fragments exported outside their named ship roots (636). A default 12-triangle Cube in a second raw import tally is not in the review-scene count.

## Scores

- Reference resemblance: 3/5.
- Readability: 3/5.
- Grounding: 3/5.
- Fleet consistency: 3/5.
- Frame cost: not measured; the ships are not wired into the game.

The whole-fleet view shows the three different hull colours, their separate lists and their shared northbound heading, though the ships remain modest in their panels. The overhead view contains all three. The Good Hope close panel reads mostly along the hull side rather than clearly from the bow, and its deck view leaves more sky than I wanted. The Marigold close view is tightly framed and shows her shaft and propeller. Both deck panels show the cabins and railings from deck level.

The ships read as rusted and stranded, and the drifts connect the hulls to the sand. The pale cabins and neat rails still feel maintained, while the sand looks smooth and deliberately shaped. Driving past, I would believe they have been stranded for a long time, but I would not confidently believe all three have lain here for thirty years. Claude should judge the whole view, bow angle on the Good Hope and the remaining cabin and sand contrast.

`tools/test-blender-output.mjs`: passed, 381 checks, 0 failed. `tools/test-repo-hygiene.mjs`: passed; size targets are advisory. No browser check, lane tier, build or frame check was run for this art-only sheet task. Changed assertions: none. Race fingerprints: none. Model geometry, materials and exported GLB are unchanged in this change.
