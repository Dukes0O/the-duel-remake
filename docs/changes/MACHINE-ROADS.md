# MACHINE-ROADS

Work in progress. Added pure road work rules for cutting, carrying and filling material, rolling a fill, and paving it. Soft and rough work can be corrected. The dozer, roller and paver have driving rules that apply work along their path. The yard simulation now holds all three machines and their shared road work for one visit. The machines can now be selected, driven and controlled in the yard, with a separate controls panel for each. Worked cells now have a visible surface that changes with their condition, and each road machine plays its named work sound. Starting material and the town connection still need to be built.

## Checks

- `node tools/test-machine-roads.mjs`: passed for the rules built so far, including movement, raised tools, yard simulation and visit lifetime.
- `node tools/test-the-dig.mjs`: passed after adding the yard simulation state and machine selection.
- `node tools/test-machine-roads.mjs`: passed after adding machine selection and controls.
- `npm.cmd run build`: passed for this partial change, including the yard controls. PowerShell blocked `npm.ps1`, so the Windows command was used.
- `node tools/test-machine-roads.mjs`: passed after adding the visible surface and a repair appearance check.
- `npm.cmd run build`: passed after adding the surface and sounds.
- Machine, dig, town, replay, world-signature and lane checks: still to run after the remaining work.
- Browser scenario: still to write; Claude must run it. The lane tier also remains to run.
- Integration branch: already an ancestor of this lane before this round.
- Race fingerprints: not checked yet.

## Sound cues

The rules name `dozer-blade`, `roller-ground` and `paver-surface`. These cues now play through the game mixer when work events occur.

## Changed assertions, for Claude to review

None.

## Removed

Nothing yet. This adds new work; no existing feature is replaced.
