# WW-ART-CREW change note

## Changed

- Added a Blender recipe for the notice-board props and exported a candidate
  GLB. The recipe uses `town_base.py` and reuses part of the Boneyard GLB.
- Added the generator to the Blender output placement registry.
- Added one review sheet and a review note. The art is not accepted; see the
  review note for the specific gaps.

## Checks

- Blender 4.5.13 export, empty-scene reimport and review render: completed.
- GLB readback: 21,338 triangles and 1,520,692 bytes, within 40,000 triangles
  and 2 MB.
- `node tools/test-blender-output.mjs`: 258 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement is clean.
- Review sheet: 68,860 bytes. Browser checks are not applicable to this art
  candidate. Claude should review
  `docs/board/looks/ww-art-crew/round-1.jpg`.

## Changed assertions

- None.

## Race fingerprints

- Not applicable; no race code changed.

## Removed

- No prior implementation existed to remove. Blender logs and the temporary
  reference copy were removed from `.qa-dist/`; the supplied `task.md` was
  left untouched.
