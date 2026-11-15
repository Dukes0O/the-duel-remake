# MACHINE-ROADS

Work in progress. Added pure road work rules for cutting, carrying and filling material, rolling a fill, and paving it. Soft and rough work can be corrected. The dozer, roller and paver now have driving rules that apply work along their path. These rules are not connected to the yard or town yet.

## Checks

- `node tools/test-machine-roads.mjs`: passed for the rules built so far, including movement and raised tools.
- `npm.cmd run build`: passed for this partial change. PowerShell blocked `npm.ps1`, so the Windows command was used.
- Machine, dig, town, replay, world-signature and lane checks: still to run after the remaining work.
- Browser scenario: still to write; Claude must run it.
- Race fingerprints: not checked yet.

## Sound cues

The rules name `dozer-blade`, `roller-ground` and `paver-surface`. Playback remains to be built.

## Changed assertions, for Claude to review

None.

## Removed

Nothing yet. This adds new work; no existing feature is replaced.
