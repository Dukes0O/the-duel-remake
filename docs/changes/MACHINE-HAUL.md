# MACHINE-HAUL

## Changed

- Added a pure machine haul controller for the excavator and dump truck. It shares the existing editable ground, material loads and machine handling. The excavator digs and swings over the truck, then loads it. A missed load forms a ground pile at the bucket tip; refused ground edits leave the material in the bucket. The truck drives slower under load and tips its bed into a ground pile.
- Added Q as the one-key machine switch. Tab still changes drive/work mode.
- Added the `wasteland-town` development switch.
- Added `tools/test-machine-haul.mjs`, with an Easy driver that digs, swings, loads, drives and tips one real ground material.

## Checks

- `node tools/test-machine-haul.mjs` — passed.
- `npm.cmd run build` — passed. Vite reported the existing dynamic import and large chunk warnings.
- Lane tier — not run; Claude runs it for this lane.
- Browser and look checks — not run here. Claude should check these exact steps after the machine view wires this simulation: enable `wasteland-town`, dig with W/S/I/K/J/L and swing with A/D, press Q to switch to the truck, drive a loaded truck and check it is slower than empty, tip a heap, then repeat with the truck out of reach and check the miss forms a pile under the bucket. Check the view never changes the simulation when it only redraws.

## Changed assertions

- None. The new card test adds behavior checks and changes no existing assertion.

## Race fingerprints

- No race simulation files or replay inputs changed. Race fingerprints are not applicable.

## Removed

- None.
