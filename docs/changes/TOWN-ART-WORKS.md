# TOWN-ART-WORKS

## Design settled before code

The card fixes the footprints, axes, object IDs, movable and lit child names,
and art direction. It leaves no design question open. Each building is a
separate named child with its own local origin at the ground center. The recipe
reuses `town_base.py` and its packed atlas; no new runtime texture or credit
file is added. The generated photo reference is used only as a small review
crop and remains outside the repository.

## Changed

- Added `tools/blender/town-works.py`, which builds all 20 requested town
  assets under a `town-works` root. Building origins, the movable flatbed
  load, kiln lamp, trench pieces and twelve grave markers are named separately.
- Reused the accepted town material atlas sources and geometry helpers. The
  opaque packed atlas exports as a 1K JPEG to meet the family file budget.
- Exported `public/assets/models/wasteland/town/works.glb` and added its
  generator and per-building budget checks to `tools/test-blender-output.mjs`.
- Added one 254 KB comparison sheet and its scores in
  `docs/board/looks/town-art-works/round-1.jpg` and the review beside it.

## Checks and review

- Blender 4.5.13 generated the GLB and 40 views (above and driver height for
  each of 20 IDs). The single sheet is 254,337 bytes.
- The model readback is 2,510,320 bytes and 29,828 triangles. All per-building
  counts are inside the card budgets. `node tools/test-blender-output.mjs`
  passed with 239 checks; repository placement passed; the production build
  passed with `npm.cmd run build`.
- `node tools/test-review-evidence.mjs` passed eight of nine subtests, then
  failed the unrelated audio-analysis test because spawning `ffmpeg` returned
  `EPERM`. `Get-Command` and `where.exe` found no FFmpeg executable on PATH.
  One rerun reproduced the same failure.
- The changed-file lane tier reported 12 passed, one failed and 34 not run.
  Its one failure was Eifel's audio loudness check: FFmpeg returned an error.
  Running `node tools/test-circuit-eifel.mjs` alone reproduced that failure
  (17 of 18 subtests passed). No game code or audio changed in this card.
- No race code or assertions changed; race fingerprints do not apply. No
  browser or game look test applies because this family is not wired into a
  scene. The builder self-review rates likeness and materials 3/5: the yard,
  warehouse, saw, kiln and stockpiles read, but the small piles need stronger
  silhouettes and the pale sand washes out some driver-height views. Claude's
  art verdict is still required before this round can pass.

## Removed

Nothing removed. TOWN-ART-BASE's sample remains until another card replaces it.
