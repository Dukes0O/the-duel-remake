# TOWN-ART-OUTPOSTS — round 11

## Round review

The exported family now contains a deck-town root. The deck is a separate low steel plate with raised rails, hatches and bollards; it has no hull. Four patched tin homes stand on it, with ladders, plank spans, washing and a separately named `deck-town:bell`. The deck-town footprint bounds printed during export fit within 4 by 4 cells. The new family file is 4,818,712 bytes, under the 5 MB limit. The family's triangle allowance is 44,000, adding the card's 14,000 for deck-town; deck-town's own limit is 14,000.

I inspected the mayor render. The first render showed unrelated diner imagery tiled on the walls. I changed the new homes to the standalone rusted corrugated-tin texture and attached the corrugation helper's rivets to each home. The updated mayor render shows a consistent tin pattern. This is a code-built approximation. It does not meet the requested photo-carve workflow: the generated four-view deck and home photographs were not saved, credited or compared beside the model. The sheet therefore shows model views only, and the model needs Claude's review before merge.

## Checks

- Blender 4.5.13 export and render: passed; GLB 4,818,712 bytes; emitted individual bounds for each deck-town piece and checked its overall cell footprint.
- `node tools/test-blender-output.mjs`: passed, 335 checks, 0 failed. It initially caught the unchanged 30,000 family ceiling and a metallic value that rounded slightly above 0.3; both were corrected. No assertions were weakened.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement passed, size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8 passed, 1 failed. Its audio-analysis fixture could not start `ffmpeg` (`spawnSync ffmpeg EPERM`); unrelated to this art change.
- Browser checks and game look checks: not run here. Claude should inspect the four deck orthographic views, the road, far-side and mayor views; the deck-town materials, bounds, house-to-walkway connections, ladder-to-door connections, and the complete round-11 sheet. The required photo-to-model comparisons remain outstanding.
- Race fingerprints: not applicable; this is an art-only model change.

## Changed assertions

Added `deck-town` and `deck-town:bell` presence checks, included deck-town as a direct family child, and applied its 14,000 triangle budget. Raised the family ceiling from 30,000 to 44,000. Existing diner, school and hermit limits and geometry checks remain unchanged.

## Removed

No prior model, sheet, source or test was removed. Round 4, 9 and 10 sheets remain.
