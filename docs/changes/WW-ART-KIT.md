# WW-ART-KIT change note

## Changed

- Updated `tools/blender/scablands-kit.py` for round 2: added cliffs and lamps; darkened and partly buried the rocks; rebuilt the barricades with welded steel plate, visible welds, pipe, tyres and spikes; added painted sign words; doubled the job pennant; kept the mast and ember pot. The recipe exports the GLB to the card's runtime path.
- Added the existing Cinder crew model as a render-only size cue. The export excludes it.
- Updated the card's one `tools/test-blender-output.mjs` entry and named-part checks.
- Replaced the old round 1 sheet and note with one round 1/2 comparison sheet and review note. The sheet is 131,278 bytes. Claude should review it and the three round 2 views under `.evidence/2026-11-05/WW-ART-KIT/round-2/`.

## Checks

- Blender export and overview, detail and mast renders: passed. Readback: 6,568 triangles and 526,152 bytes, within the limits.
- `tools/test-blender-output.mjs`: passed in the lane run; 193 checks and zero placement failures.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`: not green. Per-suite records reached the end of 48 scheduled suites; 46 passed and two failed. `test-circuit-eifel.mjs` failed, then failed its one rerun, because FFmpeg loudness measurement could not run. `test-review-evidence.mjs` failed while the previous tracked sheet path was still in Git's index; its direct rerun also reported that old path missing and `spawnSync ffmpeg EPERM`. The lane runner held the shell open after per-suite results, so I stopped it before it printed the aggregate summary.
- `npm.cmd run build`: passed; Vite built in 1.84 seconds. It reported the existing dynamic-import and large-chunk warnings.
- Browser scenarios and in-game look: Claude runs. No frame check was requested or run.

## Changed assertions

The output test now expects the runtime GLB path and checks new cliffs, lamps, painted signs and welded barricade parts. No assertion or tolerance was weakened.

## Race fingerprints

No simulation, course or replay inputs changed. The lane tier replay guard passed 297 checks across 33 cases, 31 events and 9 categories. It covered three frame rates and three runs.

## Removed

Removed the superseded round 1 sheet and note after carrying their facts into the comparison sheet and review note. No old model or runtime path was removed.
