# WW-ART-SHIPS round 16 review

Date: 7 November 2026  
Build: Blender 4.5.13 LTS; views rendered from the round 16 review scene  
Sheet: `round-16.jpg` (1600 x 3004, 199,432 bytes): the family from car height across the top; the Patience (port) and the Good Hope (starboard); the Marigold from both sides; both sisters' cabins from their decks; all three from above and the Patience (starboard).

## Budget

- Whole-file read-back: 35,115 triangles; 2,727,300 bytes. Each ship is within 13,000 triangles. All ship and file budgets pass.

## Scores

- Reference resemblance: 3/5.
- Readability: 4/5.
- Grounding: 4/5.
- Fleet consistency: 4/5.
- Frame cost: not measured; the ships are not wired into the game.

## Verdict (Claude)

The sisters' fourth round, and their last: the Good Hope and the Marigold are done. The pale panel inside each bow is gone; the bow plating matches the side on all three ships. The Marigold's cabin roof edge and forward corner are rusted steel, with no white face. Names read left to right on both bows, the sand banks against each hull from the true ground, and both cabin fronts show their windows, rails and ladders from the deck.

Accepted faults: the photo-painted cabins look patchy close up, and the Patience's cabins read paler than her hull (accepted in her round 12). Neither changes how the ships read from the road or the deck.

`tools/test-blender-output.mjs`: passed, 381 checks, 0 failed. `tools/test-repo-hygiene.mjs`: passed; size targets are advisory. `tools/test-review-evidence.mjs`: run by Claude outside the sandbox. No browser check, lane tier, build or frame check applies to this art-only task. Changed assertions: none. Race fingerprints: none.
