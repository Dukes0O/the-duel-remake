# WW-ART-RAIL: small props and last touches

Date: 6 November 2026

## Changed

- Kept the Hollis suitcase model id and label child as `case-hollis`; retained the source image name `case-fourteen.jpg`. Review shots now use `case-hollis`.
- Tightened the book, tooth-jar, megaphone and suitcase outlines by 8 pixels to reduce the photo shadow fringe. A faint pale edge remains and is called out for Claude's look review.
- Kept the token-ring mask seed in the hoop centre; the exported render shows a real open hole.
- Kept the 15 m sand drag as a 1.5 m feathered heightfield with rail stub and thick timber stop. Its two car-height views are at about 18 m and frame the ridge across its length.
- Reduced tin-car wheel radius to 35 mm and width to 12 mm, moved them nearer the body, and reduced hub size.
- Kept the 1.20 m lever and small case dimensions. Tightened the two-row lineup and moved the sand ridge behind the props.
- Added `rail-props.py` and its GLB budget to the Blender output coverage list. This adds generator coverage only; no existing assertion was weakened.
- Added the round 8 comparison sheet. No new reference pictures were added; existing source pictures remain credited in `CREDITS.md`.

## Checks

- Blender recipe: passed; imported the exported GLB into an empty scene for every prop and the lineup. No `SKY seed` warnings or Blender errors. GLB readback: 20,336 triangles, 2,428,476 bytes, and only `TEXCOORD_0`; metallic factors are at or under 0.3.
- `node tools/test-blender-output.mjs`: passed, 296 checks, 0 failures. First run exposed the missing `rail-props.py` coverage entry; added the entry and reran.
- `node tools/test-repo-hygiene.mjs`: passed.
- Browser and look checks: not run in this job; Claude should inspect `docs/board/looks/ww-art-rail/round-8.jpg`.

## Changed assertions

- Added one expected generator entry to the existing coverage list because `rail-props.py` produces a committed Blender asset. No assertion was removed or loosened.

## Race fingerprints

- None. The model is not wired into a playable scene.

## Removed

- None.

## Claude should inspect

- The faint pale edge at the base of the books, tooth jar, megaphone and suitcase.
- Whether the sand ridge overlaps too much of the second prop row in the lineup.
- The tin-car wheel placement and open token-ring centre.

## The small props

The card is finished. `tools/blender/rail-props.py` and `public/assets/models/wasteland/rail/rail-props.glb` join the card's file list, because `rail-trains.glb` is near its limit. All pass; see `docs/board/looks/ww-art-rail/round-8-review.md`. Removed: the separate props from any earlier recipe, none of which had shipped.
