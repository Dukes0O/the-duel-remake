# WW-ART-SHIPS round 17 review (lighthouse round 1)

Date: 7 November 2026  
Build: Blender 4.5.13 LTS; views rendered from the exported glb  
Sheet: `round-17.jpg` (1600 x 1778, 114,358 bytes): the lighthouse from the road at car height 40 m away (left), the same view at dusk with the lamp on (right), and the first landing from inside (bottom).

## Budget

- Whole-file read-back: 38,029 triangles; 2,927,540 bytes. Lighthouse 5,974 triangles, within its 6,000. All budgets pass.

## Scores

- Reference resemblance: 3/5.
- Readability: 3/5.
- Grounding: 4/5.
- Fleet consistency: 3/5.
- Frame cost: not measured; the lighthouse is not wired into the game.

## Verdict (Claude)

The lighthouse's first round. Its shape is right: a tall tapering stone tower on a flared foot, with a stone gallery, an iron rail, a glazed lantern and a dark iron dome. The lamp glows at dusk and the stray spiral on the horizon is gone.

Still wrong, for round 2:

- The stone is a mirrored, repeating pattern that reads as wallpaper, with a pale vertical streak down the left side.
- Each window shows a white L shape, and the door has a flat white slab around it.
- At dusk the beam is a solid pipe with a capped end; it should fade out along its length.
- Inside, the landing reads as a grey space: no visible floor or wall, a floating ring rail, and drawings made of thin sticks rather than crayon pictures.

`tools/test-blender-output.mjs`: passed, 381 checks, 0 failed. `tools/test-repo-hygiene.mjs`: passed; size targets are advisory. `tools/test-review-evidence.mjs`: run by Claude outside the sandbox. No browser check, lane tier, build or frame check applies to this art-only task. Changed assertions: none. Race fingerprints: none.
