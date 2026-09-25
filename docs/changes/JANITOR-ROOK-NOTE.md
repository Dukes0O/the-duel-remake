---
task: JANITOR-ROOK-NOTE
status: ready
kind: docs
player_facing: no
---

# Fold the rejected Rook trial recipe into the asset guide

## Changed

`docs/ASSET_PIPELINE.md` now holds the durable GFX-01-P2 recipe. It preserves both generated-image prompts verbatim, the verified external original paths and hashes, the face and garment calibration exceptions, the structural and selected-paint rebuild commands, and the 7,500/1,833-triangle final trial identity. It records the unchanged runtime assets, the scored 3/3/3/3 verdict with frame cost unmeasured, and the separate GFX-01-P3 body and GFX-02-P1 hand gates. The guide also corrects its earlier claim that first-person hand work must wait for a winning crew body technique.

## Removed

`docs/changes/GFX-01-P2.md` is removed after its lasting facts were folded into the asset guide. Its round-by-round verdicts remain in the committed `docs/board/looks/crew-p2/` JPG and review pairs. No Blender source, candidate test, calibration, reference, runtime GLB, generated original or player save is changed or deleted by this card.

## Verification

The two fenced prompt bodies in the guide were extracted directly from the old note and compared byte for byte before removal. The guide retains the exact selected-trial command and external source hashes. `rg` found no test or build code that reads `GFX-01-P2.md`; source and candidate tests read the committed JSON, Blender script and approved reference instead. This docs-only card adds no tests or art rebuild. Run the repository lane and build gates on the final commit as required by the board.
