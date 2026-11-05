# MACHINE-INPUT

Status: built in `codex/machine-input`.

## Changed

- Added an isolated `machine` input context. Tab toggles machine mode, and the keyboard controls drive and excavator work.
- Added axis learning, validation and per-browser storage for arbitrary gamepad axes. Axis roles do not assume a fixed stick layout.
- Added a reusable setup screen and a control picture with a clear Drive Mode or Work Mode label and an active control highlight.
- Added simulated-device checks for a four-axis stick and separate wheel/pedal axes.

The setup and picture exports are ready for the machine screen to mount. This card does not connect a screen that is built by a later machine-view card. No machine mode is wired into race input, so existing car, foot and helicopter controls are unchanged. No feature switch or game/save data changed.

## Checks

- `node tools/test-machine-input.mjs` — passed.
- `node tools/test-input-contexts.mjs` — passed after updating its context inventory for the new machine context.
- `npm.cmd run build` — passed. Existing dynamic import and large chunk warnings remain.
- The first `npm run build` attempt did not start because PowerShell blocked `npm.ps1`; rerunning as `npm.cmd` completed successfully.
- Lane tier and browser checks were not run. Claude owns the lane tier and browser review for this card.
- Race fingerprints: not run; no race simulation or existing car, foot or helicopter mapping changed.

## Claude browser review

- Mount `createMachineInputSetup` from a machine screen and check the instructions, keyboard fallback, and learned-axis status.
- Try the four-axis stick with X, Y, twist and slider in different orders; verify each learned control responds independently.
- Try a wheel with separate pedals; verify the chosen axis can steer or drive.
- Mount `machineControlsView` in both modes; check the large mode label, control picture and active highlight.
- Confirm no setup is present in car, foot or helicopter play unless the player opens it and saves a mapping.

## Changed assertions

Added `tools/test-machine-input.mjs`. Updated the existing input-context inventory assertion to include `machine`; it still requires an exact complete context list and was not loosened.

## Removed

None.
