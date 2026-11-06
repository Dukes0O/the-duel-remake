# TOWN-WORLD

## Design

The town world is a deterministic view of the saved town. Each town building becomes an 8 m high solid with its footprint measured in 8 m cells. The Dome, gate, Everburn routes, and Bowl approach use reserved ground. The old roads grade as dirt road while the town is set. Clearing the layout restores the prior Scablands queries.

The town drive uses the existing world-job mode and starts outside the gate at (0, -112). It has no goal and stays open. The gate prompt is part of the layout and appears through the world HUD model when the car reaches it. The app entry point is gated by `wasteland-town` and takes the current town as input.

## Changed

- Added the pure town layout builder, including building solids, road segments, walkers, the Dome and gate.
- Added strip reservations for the old routes to Tin Town, the Boneyard, the Everburn and the Bowl gate.
- Added opt-in Scablands town ground and building collision queries.
- Added `startTownDrive()` and a browser scenario for Claude.
- Added the card test for deterministic layout, road grading, native collision sweeps, open-ended drive replay, and a fully occupied unreserved footprint.

## Checks

- `node --test tools/test-town-world.mjs`: passed, 4 tests.
- `node tools/test-everburn-easy.mjs`: passed unchanged; all nine jobs finished 10/10.
- The full Everburn proof with every unreserved town cell filled was attempted several times and stopped after about eight minutes without a result. It remains unverified. The town test does verify that all unreserved cells can be occupied, the story road points remain road, and the native collision query keeps those routes clear.
- `npm.cmd run build`: passed. PowerShell blocked `npm.ps1`, so the Windows command shim ran the same `npm run build` script. Vite reported its existing dynamic import and large chunk warnings.
- Browser scenario: not run here. Claude should run it, inspect the town drive entry and gate prompt, and judge whether the remaining UI and scene hooks are needed before this card can be called complete.
- The gate reports `townGate`, but the allowed app hook has no route into the Scrapdome panel. The Scablands scene also does not draw the town solids or reserved road strips. Those acceptance points need a screen/scene hook before the world can be called complete.
- Race fingerprints: no race definitions or replay rules changed. Everburn's unchanged Easy proof passed.
- Changed assertions: none.

## Removed

- Removed the duplicated old-road coordinates from the town layout builder. The builder now reads the reserved strip data directly.
- No other code, tests, documents or assets were removed.
