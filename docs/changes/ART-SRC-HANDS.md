# ART-SRC-HANDS — existing first-person hand sources

Status: source checkpoint ready; catalog waits for ART-SRC-CREW to merge.

Two CC0 hand models are cached outside the repository and compared with the
current in-game Rook hands holding the RPG. Recommend WRAD ARMS by wriks.
No fitting, game model replacement or motion changes have started. Kyle’s
choice is the next art decision after catalog and merge checks.

## Evidence

- `docs/board/looks/first-person-src/round-1.jpg`: one 113,025-byte comparison.
- `round-1-review.md`: original sources, authors, licences, SHA-256 values,
  measured geometry, rigs, motion gaps and fitting costs.
- `tools/art/hands-source-sheet.py`: repeatable source inspection and sheet.
- `tools/scenarios/art-source-hands.mjs`: current production hands/RPG capture
  using a private memory-only fixture and no player-profile persistence.
- Original licensed files: Kyle’s external `art-library` cache.

## Tests and browser checks

Blender 4.5.13 inspected the original GLB and Blender sources. WRAD has 1,196
arm triangles and a 50-bone bound skin; DevMops has 520 base triangles, 1,040
after its mirror modifier, and 48 skin bones on its 257-bone control rig.
Neither source includes action clips. Original textures loaded successfully.

The private browser capture passed on port 15762 with one image, memory-only
storage, zero warnings and zero errors. The current Rook holds the production
RPG; the renderer reports three draw calls and 6,932 triangles. The finished
sheet was inspected visually for genuine current game content and readable
source labels.

The mandatory lane tier, production build and independent review are pending
the Director’s gate queue. No green merge gate is claimed by this checkpoint.
No new implementation tests are needed for this source-only comparison.
Existing assertions and race fingerprint files are unchanged.

## Removed

No runtime asset or code path is replaced by a shortlist. The first missing
texture render was corrected from the supplied original PNG and superseded
in ignored evidence. Two accidental relative-path Blender previews outside
the lane were deleted after explicit path verification; the recipe now
resolves render paths. The final review retains only one compact sheet.
Raw review evidence is deleted by the Director after its verdict is recorded.
