# TOWN-ART-MACHINES-2 — round 13: crane truck

## Changed

- Replaced the crane turntable block with a photo-faced lathe sampled from the
  overhead reference. Raised the pivot tower from the turntable and seated the
  boom pivot on it.
- Removed the stray floating carve fragment, added telescoping box-beam
  outriggers with vertical jacks, collars and pads, and matched the comparison
  camera scale and orientation to each source photo.
- Smoothed the rear projection weighting. The rear seam remains visible and is
  recorded for Claude's review; this round does not claim an art pass.
- Added `round-13.jpg` and its review note. The mixer truck recipe was not
  changed.

## Checks

- Blender 4.5.13 export and six imported-GLB crane renders: passed.
- `node tools/test-blender-output.mjs`: 389 checks, 0 failed; complete run.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement is valid.
- `node tools/test-review-evidence.mjs`: 8 passed, 1 failed. The audio-analysis
  subtest could not launch `ffmpeg` (`spawnSync ffmpeg EPERM`); the review JPG
  publication check passed.
- Family GLB: 5,259,104 bytes. Crane truck: 5,600 triangles (15,000 limit).
- `round-13.jpg`: 422,939 bytes (500 KB limit).
- Browser and in-game visual checks: not run in this lane. Claude should inspect
  the rear seam, turntable visibility, stabilizer details and camera scale, as
  listed in the round review.
- No assertions changed. No gameplay changes; race fingerprints do not apply.
- Lane tier and build: not run, as directed for this art card.

## Removed

- Removed the yellow block previously used as a turntable stand-in and removed
  the detached floating carve fragment from the crane body.
- No mixer-truck geometry or recipe was removed or changed.
