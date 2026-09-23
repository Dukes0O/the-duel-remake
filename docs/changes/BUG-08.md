---
task: BUG-08
status: ready-to-merge
kind: gameplay-fix
flag: none
player_facing: yes
---

## What changed

Bumper, crossbow and shield meshes now attach to named mounting points under the actual rendered player and rival car models. Every car has front, rear, roof, hood, left, right, door and shield points derived from its model size with a per-car adjustment. The rigs inherit the model's final slide, crash-spin, terrain, tumble and jump pose. The shield mesh scales to the car and sits closer to its body. Old models release their rig meshes before disposal, so changing cars does not dispose a mesh still in use.

## Evidence

- `node tools/test-vehicle-sockets.mjs`: 751 checks passed. It covers nine car keys, both player and rival roles, slide, crash spin, tumble and jump transforms, eight socket positions, model replacement and visibility. All nine checks use the actual runtime models, including the two licensed GLB trims loaded by the existing headless model fixture.
- A memory-only browser scenario on private port 20137 captured five car pairings covering all nine models, with zero warnings and zero errors. I inspected the Falcone/Titan, licensed-trim and Jesko/Dusthawk screenshots after tightening the shield envelope. The licensed models rendered after the QA wait.
- `npm run build` passed with the existing large-chunk warning.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going`: 152/152 jobs passed in 387.34 seconds; replay fingerprints unchanged.
- `node tools/browser-harness.mjs smoke`: High and Performance each reached an active race on private port 40730, with four screenshots, zero warnings and zero errors.

## Behavior and test changes

No simulation rules or existing assertions changed. The new test checks the combat rig's world position against each car model's matrix and mount point. Browser QA used temporary storage and a private port; screenshots are in ignored `.qa-dist/browser-output/` until the next QA build.

## Follow-up visual review

The first shield review showed a bright wire cage that spread well beyond the car, especially on the Falcone and Titan. I reduced the shell and rim to the model dimensions, replaced the dense wireframe rim with one thin ellipse near the wheels, and gave the shield its own dim material. The car body remains visible through the effect. This changes appearance only; socket placement and combat timing are unchanged.

- `node tools/test-vehicle-sockets.mjs`: 751 checks passed again.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going`: 24/24 affected suites passed in 44.55 seconds.
- A private, memory-only browser run on port 5574 captured each of the nine cars as the player car with both shields active. I inspected all nine 1280 × 800 screenshots; the shell stays close to each model and the road-wide ring is gone. The run reported zero warnings and zero errors. Evidence: ignored `.qa-dist/browser-output/vehicle-sockets-review-2026-09-23T05-16-47-351Z/`.
- `npm run build`: passed, with the existing large-chunk warning.
