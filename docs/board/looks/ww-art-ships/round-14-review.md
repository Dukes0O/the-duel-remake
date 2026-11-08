# WW-ART-SHIPS round 14 review

Date: 7 November 2026  
Build: Blender 4.5.13 LTS; six views rendered from the exported GLB imported into an empty scene  
Sheet: `round-14.jpg` (1600 x 1800, 93,892 bytes)

## Triangle counts

- Good Hope: 10,796 triangles.
- Marigold: 10,751 triangles.
- Patience: 10,640 triangles.
- Named ship roots total: 32,187 triangles.
- Whole-file read-back: 45,477 triangles; 2,853,904 bytes. Both whole-file budgets and the per-ship 13,000 triangle budgets pass.

## Scores

- Reference resemblance: 3/5.
- Readability: 3/5.
- Grounding: 3/5.
- Fleet consistency: 3/5.
- Frame cost: not measured; the ships are not wired into the game.

The bow and stern ends now use the dark side-plating texture and no longer read as pale panels. The Good Hope and Marigold sand banks have curved cross sections and tapered ends, but still read somewhat like long raised strips from these low side views. The Marigold propeller is built as four tapered plates on a hub; its bow-oriented close view does not show the stern wheel, so Claude should inspect it in the exported model. The overhead and family views contain all three ships, though the family view keeps them small. Both deck views now show the decks and cabin fronts from deck height. Claude should judge the drift shape, the Marigold stern and whether the family view is large enough.

`tools/test-blender-output.mjs`: passed, 381 checks, 0 failed. `tools/test-repo-hygiene.mjs`: passed; size targets are advisory. `tools/test-review-evidence.mjs`: 7 passed, 2 failed on two runs. The suite still requires the removed `round-13.jpg`, and the audio-analysis subtest cannot spawn `ffmpeg` (`spawnSync ffmpeg EPERM`). No browser check, lane tier, build or frame check was run for this art-only task. Changed assertions: none. Race fingerprints: none.