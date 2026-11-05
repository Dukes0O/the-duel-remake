# TOWN-CORE

## Changed

- Added a data registry for the section 14 building schedule and its material goods, with checks for ids, footprints, materials, hours, upkeep and staff.
- Added the Scablands region, 8 m cells and sparse 16 by 16 cell chunks. The Dome oval and its south gate are reserved from the TOWN-ART-DOME footprint contract.
- Added the hour, day, month, season and year calendar; version 1 town creation, JSON save/load and a retained migration list; plain sentence commands; and ordered, seeded town systems.
- Added version 0 and version 1 town fixtures and the card's focused simulation test.
- Recorded the missing Dome map anchor under “Codex decided (Claude to review)” on the card.

## Checks

- `node tools/test-town-core.mjs`: passed, 624 checks. It includes a repeatable 100,000 tick fingerprint with a scripted command sequence and a 10,000 person, 5,000 building save/load/step case. The large town's measured 24 tick day took 0.05 ms in the final run; save/load plus stepping took 92.81 ms. The 30 ms target applies to stepping.
- `npm.cmd run build`: passed. PowerShell blocked its `npm.ps1` wrapper, so the Windows `npm.cmd` entry ran the same package script. Vite reported its existing dynamic import and large chunk warnings.
- `git diff --check`: passed.
- Lane tier: not run, as assigned to Claude.
- Browser and visual checks: not run. Claude should review the reserved Dome and gate extents against the TOWN-ART-DOME contract. No town screen is wired in this card.
- Existing race fingerprints and world signatures: unchanged; this card adds no race or world rendering hooks.
- Existing assertions changed: none. The new suite checks save/load separately and measures the simulation day against section 10's 30 ms target.
- Independent review: passed after fixing generated-id collisions, multi-sentence rename replies and the empty-command long-run test.

## Removed

Nothing was replaced or removed.
