# WW-ART-BONEYARD — Round 1

Three original wrecks now form the Scablands Boneyard. Each has an arched steel fuselage, exposed cabin ribs, broken low wing ramps, raised tails, cockpit remains and detached ground-level engine pods. The centre and side shells stay open at both ends. The deck is 5.1 m clear. Oxidised steel and faded paint use a procedural palette based on the existing yard and Rustwall recipes. No art-library donor was used, so no new external credit is needed.

**Builder's look scores (1–5):** tail-up silhouette 4; rust and wear 3; drive-through readability 3; jump-ramp readability 2. The open tunnel and ramp use have not been driven in-game. Claude should judge the Blender sheet and, when WW-SCENE wires it in, check the game camera and vehicle clearance.

**Review sheet:** `docs/board/looks/ww-art-boneyard/round-1.jpg` (82,983 bytes, under 500 KB). Three Blender views are in lane `.evidence/2026-11-04/ww-art-boneyard/round-1/` for reference.

## Checks

- Blender 4.5 round 1 export completed after fixing the empty scene world and preview lighting. Final authored geometry: 15,668 triangles; GLB: 1,464,728 bytes. Read back from the GLB: 15,668 triangles, 669 nodes and the `Scablands Boneyard` root. Both budgets pass (45,000 triangles; 2 MB).
- `node tools/test-blender-output.mjs`: passed, 192 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed. Placement is clean; repository size targets remain advisory.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): 46 suites passed, 2 failed, 0 not run. `tools/test-circuit-eifel.mjs` failed on FFmpeg loudness measurement; its one same-commit rerun failed the same way. `tools/test-review-evidence.mjs` failed with `spawnSync ffmpeg EPERM`; its one same-commit rerun failed the same way. `ffmpeg` is not on this lane's PATH. No game code changed. These checks need a follow-up for the unreliable/missing local FFmpeg tool; assertions were not changed.
- `npm.cmd run build`: passed (Vite 8.0.16; 632 modules). Existing dynamic-import and large-chunk warnings remain.
- Browser checks: Claude runs. Please inspect round 1 for the steel/rust treatment, tail silhouette, 5.1 m interior and low ramp shape. No browser or frame check was run for this art card.
- Changed assertions: none.
- Race fingerprints: none; this lane changes no simulation or runtime wiring.

## Removed

No old recipe, model, or asset was replaced.
