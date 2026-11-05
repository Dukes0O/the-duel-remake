# MACHINE-CORE

## Changed

- Added data definitions for an excavator and dump truck, including drive type, mass, controls, joints and tools.
- Added a renderer-free joint solver and machine stepper. Track machines support separate left and right track speeds; wheel machines use the shared forward and steering controls. Constant controls integrate as a repeatable arc, and carried material changes handling.
- Added ground tool operations for digging and tipping, material loads and transfers, and capped demonstrations recorded at 10 Hz with speed, target accuracy and spill measures.
- Added `tools/test-machines.mjs` for a ground-to-truck excavator cycle, data-only machine definition, material conservation, demo metrics and repeatable movement at 30, 60 and 144 fps.

## Checks

- `node tools/test-machines.mjs` — passed.
- `npm.cmd run build` — passed. Vite reported its existing dynamic-import and large-chunk warnings. Plain `npm run build` could not start because PowerShell blocked `npm.ps1` under the local execution policy.
- Lane tier — not run by request; Claude runs it.
- Browser and look checks — not run by request; Claude runs them.
- Changed assertions — none. The card adds a new test; no existing test assertions changed.
- Race fingerprints — none. This pure simulation core is not wired into races or app state.

## Claude browser checks

This card adds no in-game screen or app wiring. When MACHINE-VIEW connects this core behind `wasteland-town`, use memory-only saves and check that Tab switches drive and work controls, the excavator arm follows its controls, the bucket loads material, and tipping moves that material into the ground or truck. Confirm that ordinary racing remains unchanged.

## Removed

- None.
