# TOWN-ART-MACHINES-2 — round 15: crane truck

## Changed

- Split the end-view carve at the cab back wall (side photo x=320; z=-1.208 m). The cab and rear deck now use separate end views, with the rear photo's cab/hoist pixels cut above the deck.
- Removed the standalone rear counterweight block. Outrigger beams now use tight worn-paint crops from the front photo across all beam faces.
- Added the round 15 comparison sheet and review note. The mixer recipe and model were not changed.

## Checks

- Blender 5.2.1 exported the family and rendered six views from the exported GLB, including rest and work poses. The recipe selects the available Eevee engine name for Blender 5.x.
- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed** (complete run). All seven machine roots/joints exist and each machine is within the 15,000-triangle cap.
- Family GLB: 5,363,768 bytes (8 MB limit). `round-15.jpg`: 260,720 bytes (500 KB limit).
- `node tools/test-repo-hygiene.mjs`: passed. `node tools/test-review-evidence.mjs`: 8 passed, 1 failed; its one rerun failed the same way because Windows blocked the audio-analysis `ffmpeg` subprocess (`spawnSync ffmpeg EPERM`). The JPG publication check passed both times.
- No lane tier or build was run. No browser check was run. Claude should inspect the rear cab projection and deck, the side-view boom pivot silhouette, the photo wear on every outrigger face, and both working poses.
- No assertions changed. No gameplay changes; race fingerprints do not apply.

## Removed

- Removed the standalone rear-counterweight box and its one-face rear-photo mapping, plus flat-yellow outrigger faces. No mixer truck parts or photos were removed.

---

# TOWN-ART-MACHINES-2 — round 11

## Changed

- Updated only the mixer truck: dark 0.30 m rubber treads, paired tyres on both rear axles, cubic photo sampling at the carved projection joins, and an overhead comparison render scaled to the reference photo.
- Added the round 11 review sheet and visual review note.

## Checks

- `node tools/test-blender-output.mjs`: 389 passed, 0 failed; complete run.
- Blender 4.5.13 exported and rendered the imported GLB. Family: 4,197,144 bytes. Mixer truck: 13,724 triangles. Ten tyres meet the ground.
- No browser check in this art lane; see Claude's visual review list in the review note.
- No assertions changed. No gameplay changes; race fingerprints do not apply.

## Removed

- Removed this round's temporary render images, Blender logs and sheet-generation helper from `.qa-dist` after making the review sheet.
- No round 10 model parts or photos were removed.

---

# TOWN-ART-MACHINES-2 — round 12: crane truck

## Design

- Build the crane truck from its matching side, front, rear and overhead photos. Carve the body above the lower frame rails; build the chassis, axles, tyres, fuel boxes and outriggers as separate parts.
- Trace the boom from its own side photo. Put the `crane-truck:boom` origin at the hinge pin and keep the hook as a child joint that can lower.
- Favor each end photo on its half of the truck to reduce texture seams where the rear deck and cab meet.

## Result

- The side view reads as a worn yellow crane truck. The lattice boom is traced from the source photo and the rest/work renders show its pivot moving.
- This does not pass. The rear projection still stretches across the cab and turntable. The outriggers and counterweight are too smooth and bright, and the hook is too thin to read as a working hook assembly.
- Round 12 uses the six additional rounds approved for this machine. The remaining rear seam needs a better photo carve or a different body method; more rounds need direction before work continues.

## Checks

- Blender 4.5.13 exported the family GLB and rendered six imported-GLB crane views, including the working pose.
- `node tools/test-blender-output.mjs`: 389 passed, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed. `node tools/test-review-evidence.mjs`: 8 passed, 1 failed in the audio analysis subtest because Node could not launch `ffmpeg` (`spawnSync ffmpeg EPERM`); one rerun failed the same way. No test assertion changed.
- Lane tier: 12 suites passed, then `tools/test-circuit-eifel.mjs` failed while loading texture `blob:` URLs; its one standalone rerun printed the same texture-loading errors. The remaining 34 suites did not run.
- `npm.cmd run build`: passed. PowerShell blocked the `npm.ps1` shim, so the equivalent `.cmd` entry point ran the same build script.
- Family GLB: 5,050,632 bytes (8 MB limit). Crane truck: 5,599 triangles (15,000 limit).
- `round-12.jpg` is under the 500 KB limit. Visual review: see `docs/board/looks/town-art-machines-2/round-12-review.md`; no art pass is claimed.
- No assertions changed. No gameplay changes; race fingerprints do not apply.

## Removed

- Removed the unused composite `machines2-crane-truck-views.jpg`; the model now uses the four separate view photos and the boom photo.
- Removed this round's temporary renders, masks, logs, candidate GLB and generated `.blend` after recording the review. The kept output is the runtime GLB and the compressed comparison sheet.


---

# TOWN-ART-MACHINES-2 ? round 14: crane truck

## Changed

- Replaced the square turntable cover with a photo-cropped circular disc and circular race; aligned the paired cheek plates and pivot pin with the boom hinge.
- Rebuilt the outriggers as photo-faced yellow box beams with sliding sections, silver hydraulic jacks and square silver foot plates.
- Reworked the rear into a solid counterweight with a rear-photo face. The rear cab and boom-support projections remain visibly imperfect for Claude's review.
- The mixer truck recipe and shape were left unchanged.
- Added the round 14 six-view comparison and review note.

## Checks

- Blender 4.5.13 generated the candidate GLB and six imported-GLB views.
- node tools/test-blender-output.mjs: 389 checks passed, 0 failed; complete run. All seven machine roots and joints are present, and every machine is at or below 15,000 triangles. Crane truck: 5,600 triangles.
- Family GLB: 5,449,472 bytes. Round 14 sheet: 426,148 bytes.
- node tools/test-repo-hygiene.mjs: passed.
- node tools/test-review-evidence.mjs: 8 passed, 1 failed because Windows blocked the audio-analysis ffmpeg subprocess (spawnSync ffmpeg EPERM). The JPG publication check passed; no assertion changed.
- No lane tier or build was run. No browser check was run; Claude should inspect all six panels, especially the rear projection, circular turntable and pivot, and outrigger faces and feet.
- No assertions changed. No gameplay changes; race fingerprints do not apply.

## Removed

- Removed the square deck plate and old crane outrigger bars, dark jack collars and feet. No mixer truck geometry or recipe was removed.
- Round 14 temporary renders, candidate GLB and check logs remain in ignored qa-dist. Cleanup was rejected because the attempted command would permanently delete them; the lane instructions require Recycle Bin deletion.
