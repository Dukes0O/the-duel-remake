# FIX-RUSTWALL-CLEAN

status: ready-to-merge

## Removed

The committed runtime wall test no longer depends on an ignored, consumed `art-build` source PNG. Exact source PNG/hash equality remains in the fresh isolated full-wall and probe export tests, along with embedded atlas pixel equality. No runtime feature or asset was removed.

## Cause and decision before code

On a clean worktree, the committed wall GLB has `sourceRenderPath: art-build/rustwall-p2/wall-relief-source.png` and a 64-character source hash, but `art-build/` is intentionally ignored and absent. The focused wall test fails with ENOENT at `tools/test-rustwall-p2.mjs:324`. A committed runtime asset cannot require a consumed scratch file for its ordinary geometry test.

Keep the committed wall's path and hash format, geometry, UV, material, and budget assertions in the ordinary test. The separate atlas test retains committed embedded-pixel checks. Exact source PNG-to-recorded-hash equality stays in `tools/test-rustwall-p2-relief.mjs`, where the test builds its own isolated full wall and probe and checks each fresh export against its own atlas snapshots. Do not compare a new render to the committed hash: the source renderer has observed 1–3 pixel variation between builds. Do not copy ignored scratch into a clean checkout or skip a failing assertion.

## Reproduction

`node --test --test-name-pattern="P2 full wall has source-rendered" tools/test-rustwall-p2.mjs` fails 0/1 in this clean lane with ENOENT for `art-build/rustwall-p2/wall-relief-source.png`.

## Changed assertion review

Director approved the minimal relocation, subject to Crew's independent diff review. Old: committed-asset test read ignored PNG and required its SHA to equal GLB metadata. New: committed-asset test checks path/hash provenance shape; isolated actual-export test reads its freshly generated PNG and requires exact SHA equality to its own GLB metadata, alongside exact embedded atlas pixel equality. The equality requirement remains; its fixture becomes reproducible. No extra export was added. The wheel-probe test itself runs the generator before reading its ignored probe output.

Crew independently reviewed the diff and found the relocation clear. The isolated full/probe output directories were absent in the fresh checkout before the focused run. The focused committed-wall test passed 1/1; the isolated relief suite passed 6/6 from fresh outputs, including both same-build source hashes, all three embedded atlas pixel comparisons, and unchanged production wall/wash bytes. The sandbox initially denied writes under the isolated lane's ignored `art-build/`; rerunning with authorized lane write access passed. No runtime asset or generator changed.

## Gates and files

`node tools/run-tests.mjs --tier lane --changed --jobs 8`: eight suites passed, zero failed, 64.15 seconds. The Rustwall P2 suite passed 11/11, the isolated relief suite passed 6/6, and the core source test passed 518/518. Log: `.evidence/fix-rustwall-clean/lane.log` (ignored, retained in this lane until Director consumes it).

`npm run build`: passed; 220 modules transformed. Log: `.evidence/fix-rustwall-clean/build.log` (ignored, retained). No runtime asset, race rule, visual, or save file changed. Race fingerprints are unaffected by the test-only diff and were not regenerated.
