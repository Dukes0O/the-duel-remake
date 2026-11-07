# TOWN-ART-SAFETY — guard post, round 7

## Changed

- Replaced the single long sandbag bar with a 6 m by 4 m hut. Four photo-carved waist-high wall runs enclose the building; two front sections leave a 1.4 m road-side doorway.
- Added timber supports at the corners and intermediate points on all sides, including door jambs.
- Rebuilt the roof as two pitched slopes meeting at a ridge, with a 0.3 m overhang. The top faces use the straight-down patched tin photo. The underside uses a valid tin UV range.
- Kept the photo-carved brazier inside and grounded its feet. Packed lower-resolution copies of the two tall wall photos to keep the complete safety family GLB under 3 MB; the carving photos stay full resolution.
- Round 7 sheet: `docs/board/looks/town-art-safety/round-7.jpg` (333,379 bytes). Exported model: `public/assets/models/wasteland/town/safety.glb` (2,983,396 bytes; 3,704 guard-post triangles).

## Checks

- `python -m py_compile tools/blender/town-safety.py` — passed.
- Blender recipe and GLB round-trip — passed. It printed each piece's bounds and checked footprint clearance and contact.
- `node tools/test-blender-output.mjs` — passed, 377 checks, 0 failed on the final GLB.
- `node tools/test-repo-hygiene.mjs` — passed; reported existing repository size targets as advisory.
- `node tools/test-review-evidence.mjs` — 7 of 9 subtests passed. Two unrelated failures: town-art-outposts round 15 is missing its review note, and the audio analysis test could not launch `ffmpeg` (`EPERM`). The round-7 JPG publisher check passed.
- Browser and look review — Claude's check. Inspect the matched gable, road-side wall, rear and roof views; all four walls and the doorway; the posts on each side; and the brazier position.
- Changed assertions: none. Lane tier and build: not run, as directed.
- Race fingerprints: no race code or state changed.

## Removed

- Removed the superseded `round-6.jpg` and `round-6-review.md`. Deleted this round's temporary grids, renders, masks and logs before handoff.
