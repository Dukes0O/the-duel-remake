# WW-ART-SHIPS

Status: incomplete; the Patience candidate is committed for review, but it does
not meet the ship realism target. The Good Hope, Marigold, lighthouse and pilot
boat remain unbuilt because Patience did not pass the photo comparison.

## Changes

- Reworked the existing recipe's Patience hull into a dense, flared profile
  with a rounded bilge and full keel; kept the photo projection on the hull.
- Simplified the deck to one walkable deck and raised forecastle, retaining the
  chart room, ladder, mast platform, bell, anchor chains and bow name.
- Made the photo projection hull-specific and removed overlay plates that
  covered the hull curvature.
- Corrected the sand mound's up axis and replaced the oval with a low irregular
  heap that fades into the bed.
- Added the projection crop credit. The GLB contains the Patience candidate
  only; it is not a finished family asset.

## Checks and review

- Blender 4.5.13 LTS: exported GLB, cleared the authored scene, reimported the
  exported GLB, and rendered the review views. Last render: round 2.
- GLB read-back: 5,522 triangles and 605,696 bytes, within the 50,000 triangle
  and 3 MB limits.
- `tools/test-blender-output.mjs`: passed, 250 checks; exit 0.
- `tools/test-repo-hygiene.mjs`: passed; exit 0. Reported repository size
  targets are advisory and unrelated to this card's file placement.
- Browser check: not run; Claude handles browser and look checks.
- Changed assertions: none.
- Race fingerprints: none; this is art-only work.
- Look check: failed self-review. The cabin and deck remain too plain, and the
  hull reads as a projected photo on a simplified structure. A person would
  not take this result for a real stranded ship. Do not build the family from
  this recipe until Patience passes Claude's look review and is improved.

## Removed

- Removed the oversize floating hull overlays that obscured the hull's curve.
- Removed superseded round 1 sheet and scratch renders; retained only the last
  sheet, its review note, source recipe and final candidate model.
