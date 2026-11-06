# TOWN-ART-MACHINES-1

**Status:** Round 2 candidate built. Independent art review is pending; this is
not ready for beta. The model is not wired into the game.

## Design

Keep the four machines as original, full-size scrapyard builds. Preserve the
town-machine axes and root names. Keep each named moving part as its own node at
its real hinge. Show rest and working poses side by side.

## Change

- Added measured joint pivots and preserved the mesh positions beneath them.
- Reworked track loops and shoes, the excavator working pose, the dump-truck
  soil load, the trencher lamp mounts and the dozer working pose.
- Combined fixed meshes by parent and material to reduce GLB node overhead.
  The exported moving joints remain separate.
- Replaced the draft Round 2 sheet with a reference, rest pose, work pose and
  close detail for each machine.
- Final GLB: 2,398,176 bytes, one embedded 1K JPEG atlas, 43,804 triangles
  total. Per machine: trencher 14,536, excavator 7,616, dump truck 14,216,
  dozer 7,436.

## Checks

- `node tools/test-blender-output.mjs` — passed, 238 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs` — failed on the pre-existing
  `tools/blender/machine-reference.jpg` and `machine-wear.jpg` placement. The
  card identifies these as recipe inputs. This card does not own the shared
  hygiene rule or those input files.
- `node tools/test-review-evidence.mjs` — 8 passed, 1 failed. Its audio
  analysis could not launch FFmpeg (`spawnSync ffmpeg EPERM`). One same-commit
  rerun failed the same way. The sandbox cannot read the FFmpeg install folder.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4` — stopped after
  `tools/test-circuit-eifel.mjs` failed. The Eifel bell loudness check could
  not launch FFmpeg. One same-commit rerun failed at
  `measureLoudness` with `FFmpeg loudness measurement failed`. Thirteen suites
  passed before the failure; 33 later suites did not run.
- `npm run build` — pending. Two other heavy jobs were active when this note
  was written; the shared two-job limit prevented another build from starting.
- No browser or frame check applies because the model is not in the game.
- No test assertions changed.

## Removed

Replaced the draft Round 2 sheet and review text with the final four-view sheet
and builder review. No older version was retained.
