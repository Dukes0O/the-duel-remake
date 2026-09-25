# JANITOR-RUSTWALL-NOTE

status: integration sync and final gate pending

## Design before edits

Fold the selected Rustwall paint prompt, source identity, atlas mapping, explicit input command, recovery limit and current exported geometry count into `docs/ASSET_PIPELINE.md`. Append one short final acceptance decision to `docs/board/decisions.md`. Then remove the consumed EGG-02-P2 task note. Keep the ten immutable review sheets and all runtime assets. Historical test and browser logs are already summarized in board records and do not need a second copy.

The selected image is a generated original outside Git. Its exact SHA and path are required for recovery. The committed GLB embeds its selected paint, while the generator's no-input P2 route produces a procedural fixture; document that difference clearly. The actual exported wall count is 55,834 triangles, while the prior 56,122 count is the pre-export source total.

## Tests planned

Review the exact diff and search for consumers of the task note path. Run `node tools/test-review-evidence.mjs`, the changed lane tier and `npm run build`. No runtime or test source changes are authorized.

## Evidence so far

The exact prompt line in the old note and new asset pipeline compared equal. No literal source/tool/doc path reference to `docs/changes/EGG-02-P2.md` remains. `node tools/test-review-evidence.mjs` passed 9/9 (261 checks). Preliminary lane tier passed 6/6 in 39.75 seconds, including 518 core checks. Integration moved to 49d2b2a during this gate, so a normal sync and final lane/build gate follow before readiness. The preliminary log is retained under ignored `.evidence/janitor-rustwall-note/lane.log`.

## Removed

Deleted the consumed EGG-02-P2 task note after preserving the exact generated source prompt, hash, original path, explicit input recipe, no-input limitation, GLB recovery rule, actual exported counts, measured verdict and P3 residual in the asset pipeline and decisions. The ten immutable review sheets and runtime files remain.
