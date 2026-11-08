# TOWN-ART-MACHINES-2 ? round 7

## Changed

- Rebuilt the mixer truck as a photo-carved cab/chassis with its photo-lathed drum, six individual photo-measured tyres, water tank, ladder, fenders and pivoting chute. The other six machines are unchanged.
- Removed an unnecessary `ends_split`/`front_favour` treatment: the truck is one continuous body, and the cab-only front-photo weighting was producing a visible transition seam.
- Corrected the drum's three-quarter work-pose rotation to use its local Blender Z axis. Added this review-axis fault to `docs/ART_LINE.md`.
- Raised only the machines-2 family byte limit in `tools/test-blender-output.mjs` from 3 MB to 8 MB, as Claude approved on 8 November. No shape, joint, part or triangle assertion changed.
- The rebuilt family is 3,879,516 bytes. The photo/model comparisons and rest/work views are in `docs/board/looks/town-art-machines-2/round-7.jpg` and its review note.

## Checks

- `node tools/test-blender-output.mjs`: 384 checks passed, 0 failed.
- Blender family export completed. Bounds printed for the body, drum, six wheels, water tank, ladder, fenders and chute. The six tyres meet the ground.
- Reviewed the exported model beside the side, front, rear and top photos and in two three-quarter poses. The review note records the remaining seams, body gaps and view mismatches for Claude.
- Browser checks: none run; Claude owns the look review for this art card.

## Changed assertions

- The machines-2 family size assertion changed from 3,000,000 to 8,000,000 bytes, including the registered generator size cap. This applies Claude's 8 November decision. All other assertions remain unchanged.

## Race fingerprints

Unchanged; no race or simulation code was edited.

## Removed

- Removed the obsolete `machines2-mixer-truck-views.jpg` credit line. The separate mixer-truck photo references remain credited.
- Replaced the prior machines-2 family GLB with the rebuilt family export.
