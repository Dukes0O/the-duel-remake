# WW-ART-SHIPS

Status: incomplete; round 4 of the Patience is committed for review, but it does
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
- Round 4 raises the ship root so the deck is at y=11, sets the hull to 72 by
  12 m, raises the bow sheer, adds a 4 degree heel and a stern rail, and moves
  the Patience's mast platform to y=25. The GLB still contains the Patience only.

## Checks and review

- Blender 4.5.13 LTS: exported GLB, cleared the authored scene, reimported the
  exported GLB, and rendered the review views. Round 4 rendered successfully.
- Round 4 GLB read-back: 17,602 triangles and 1,737,876 bytes, within the
  50,000 triangle and 3 MB limits. Maximum metallic factor: 0.28.
- `tools/test-blender-output.mjs` and `tools/test-repo-hygiene.mjs`: not run
  yet; these are reserved for the final Patience round.
- Browser check: not run; Claude handles browser and look checks.
- Changed assertions: none.
- Race fingerprints: none; this is art-only work.
- Look check: failed self-review. The lower hull is too flat and dark, the
  superstructure photo is misprojected, the bow is blunt, and the review car is
  4.90 m on its longest axis. See `round-4-review.md`.

## Removed

- Removed the oversize floating hull overlays that obscured the hull's curve.
- Removed superseded round 1 sheet and scratch renders; retained only the last
  sheet, its review note, source recipe and final candidate model.
- Round 4 is a further intermediate round; its temporary render inputs and log
  are in `.qa-dist/` and will be removed after the next review sheet is committed.
