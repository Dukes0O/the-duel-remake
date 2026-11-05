# WW-ART-VEHICLES round 3

## Changed

- Corrected the review scene for +Y-up vehicles: review roots and ground convert to Blender Z-up; the exported roots stay in game coordinates.
- Turned the Big Bess and buggy wheel axles horizontal, added tanker bands and rivets, furnace armour fittings, open-frame buggy details, uneven material wear and a review-only person scale marker.
- Replaced the old review sheet at `docs/board/looks/ww-art-vehicles/round-2.jpg` with one compressed comparison sheet containing rounds 1–3 (74,305 bytes). Added the short round 3 verdict note.
- Regenerated `public/assets/models/wasteland/scablands/vehicles.glb` from the Blender recipe. GLB readback: Big Bess 3,476 triangles; Old Smoke 4,688; Thief Buggy 1,444; 634,372 bytes total. All are within the per-vehicle and file budgets.

## Checks

- Blender 4.5.13 LTS recipe build and nine review renders: passed.
- `node tools/test-blender-output.mjs`: passed, 192 checks, 0 failures.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): 45 passed, 2 failed, 0 not run. `tools/test-circuit-eifel.mjs` failed its FFmpeg loudness measurement; its one rerun failed the same way. `tools/test-review-evidence.mjs` had two FFmpeg process permission failures (`spawnSync ffmpeg EPERM`); its one rerun reproduced both. The sheet publication and review JPG checks passed on the rerun. No assertions changed.
- `tools/test-repo-hygiene.mjs`: passed in the lane tier.
- `npm.cmd run build`: passed. Vite printed its existing dynamic import and large chunk warnings.
- Browser and game look check: Claude runs; Chrome is unavailable in this job. Please inspect the consolidated sheet and decide the round 3 art verdict.
- Frame check: not run; this is art and the vehicles are not wired into the game.
- Changed assertions: none.
- Race fingerprints: unchanged; lane replay guard passed with all 297 fingerprints across 33 cases, 31 events, 9 categories and three frame rates.

## Removed

- Removed the superseded round 2 JPG and note after their relevant comparisons were carried into the consolidated sheet and round 3 note.
- No runtime code or dependencies removed.
