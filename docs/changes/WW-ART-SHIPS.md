# WW-ART-SHIPS

Status: incomplete; round 6 of the Patience is committed for review, but it does
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
- Round 5 projects the photo over the curved lower hull and cabin sides, narrows
  the bow stations, adds the aft rail, replaces the mast lattice with a stout
  spar, kingposts, derricks, ladder and platform, and corrects the review car
  to 4.5 m. The GLB still contains the Patience only.
- Round 6 narrows the bow texture projection, puts the deck fittings on physical
  two metre UVs, and gives the ground drifts a darker salt-bed color. The GLB
  still contains the Patience only; the Good Hope, Marigold, lighthouse and
  pilot boat were not built because she did not pass the look target.

## Checks and review

- Blender 4.5.13 LTS: exported GLB, cleared the authored scene, reimported the
  exported GLB, and rendered the review views. Round 6 rendered successfully.
- Round 6 GLB read-back: 17,284 triangles and 1,718,852 bytes, within the
  50,000 triangle and 3 MB limits. Maximum metallic factor: 0.28. Review-car
  bounds: 4.50 x 2.02 x 1.01 m.
- `tools/test-blender-output.mjs`: passed, 254 checks; exit 0.
- `tools/test-repo-hygiene.mjs`: passed; exit 0. Size targets are advisory.
- Lane tier and build: not run, per the art card.
- Browser check: not run; Claude handles browser and look checks.
- Changed assertions: none.
- Race fingerprints: none; this is art-only work.
- Look check: failed self-review. The ship still reads as a projected photo on
  a simple form; the blocky cabin and flat ground do not pass. Claude should
  review `round-6.jpg`, especially the three-quarter bow and on-deck views.

## Removed

- Removed the oversize floating hull overlays that obscured the hull's curve.
- Removed superseded round 1 sheet and scratch renders; retained only the last
  sheet, its review note, source recipe and final candidate model.
- Moved round 2 through round 5 look sheets and their review notes to the
  Recycle Bin; round 6 is the only retained sheet and review note.
- Removed this run's temporary round 4, 5 and 6 render inputs, composition
  attempt and logs from `.qa-dist/`. Kept the named `.qa-dist/task.md` brief.
