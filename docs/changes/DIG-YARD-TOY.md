# DIG-YARD-TOY: the pale ring (19 November 2026)

- **Cause, measured in the running Dig.** `src/world/ground-view.js` read each corner's 3 by 3 samples with x and z swapped, so every
  edited chunk's spoil, darkening and soil were drawn mirrored across its diagonal. Rays on the opening view: the heap's own
  corners carried `made` 0 and flat ground 7 m away carried 0.7 to 1.1. With no made value the heap was drawn as a scarp's rock,
  and the rock's pale scree band (slope .02 to .14) was the ring at its foot. Pixels, same camera: ring (134,114,91) before,
  (82,45,19) after; the mirror patch went from spoil (73,45,21) back to plain ground (125,82,42).
- **Two more pale bands of the same kind, cured with it.** The chunk edge's corners leaned to a slope of .55 because their normals
  were averaged with the skirt's upright faces (a pale kerb round every dug square); normals now come from the top faces only.
  At a ditch's end the cut and its own ridge summed to 0 in `made`, so the shader drew rock there; it now reads `aMoved` (mean
  of the absolute change), which cannot cancel (`src/world/scablands-ground-look.js`, cache key `ground-look-10`).
- **No rule changes:** drawing only; the ground edit layer, heights and saves are untouched.
- **Checks** on base `00382d70b` plus this change: `test-ground-view` (new checks: made value in place, edge corners face up,
  worked ground beside a ditch; each fails on the old code), and the suites listed in the commit message.
  Shader compiled with the Dig's own material; with the old earth test the ditch's end shows 10 rock pixels, with the new none.
  Lane tier on `ce0a4650d` (current integration `bb7aace9c` merged in): 36 of 36 passed, replay fingerprints unchanged; left
  to the night: `test-convoy-tanker-art`, `test-first-person-polish`. `npm run build` passed on the same commit.
- **Pictures** (`.evidence/2026-11-19/DIG-YARD-TOY/`): `ring-before.png` and `ring-after.png` from the same camera,
  `ring-terms-before.png` (rock red, scree yellow, spoil blue) and `driver-seat-after.png`.
- **Removed:** the swapped sample index and the signed-sum earth test. Nothing else.
