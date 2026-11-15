# MACHINE-ROADS

The dozer cuts and carries material into low ground. The roller firms the fill, and the paver lays a surface at a steady pace. Soft and rough work can be repaired. The yard keeps work for one visit and starts with material and a ditch. Each machine has its own controls, visible work, guidance and sound. These machines are behind `wasteland-town`.

A town can record individual machine actions without changing an old save. Town roads use eight-metre cells. Their weakest metre sets the grade, and the existing haul route uses that grade to set truck speed. A rough patch can lower the grade and another pass can restore it. The yard does not write to a town or a save.

## Review fixes in progress

The dozer can now cut ordinary ground and spread its load with the blade raised. The road rules test passes with a 40-metre stretch made from ordinary ground. The paver now measures steering against its starting line, and paving detects neighbouring height changes. The roller can press a heap level. Driven tests cover both faults and their repair. The town now advances its haulers over saved machine roads during its own hourly ticks; a day-long test shows the paved road moves a truck farther. The fresh-yard test now checks the exact eight practice cells and nothing else. The scenario had an impossible third roller wait above the maximum compaction; it now caps the target and reports the yard state on every timeout. A keyboard-driven yard test reaches the paver and repairs the surface. The ground view still needs work: it draws narrow boxes above the terrain. The earlier full results below precede these fixes and do not cover them.

## Checks

- Road rules, all machine, dig and town suites: passed, including older and new town save round trips, road grades, truck travel and repair.
- `test-replays.mjs`: passed 297 fingerprint checks across 33 cases. `test-combat-replays.mjs`: passed 12 fingerprint checks across four encounters. No fingerprints changed.
- Lane tier: 35 of 37 passed. Town core exceeded its 10 ms timing limit under load at 10.81 ms, then passed alone at 5.09 ms. Review evidence could not start ffmpeg in the sandbox, then passed outside it (9 of 9).
- `npm.cmd run build`: passed. Vite reported its existing chunk-size and dynamic-import warnings.

## For Claude to run

Run `tools/scenarios/machine-roads.mjs` with memory-only saves. Check one picture of each machine working with only its own controls, a finished stretch, and a bad stretch. Browser checks cannot run in this lane. Review the code and the changed assertion before merging.

## Sound cues

Blade work: `dozer-blade`. Rolling: `roller-ground`. Paving: `paver-surface`.

## Changed assertions, for Claude to review

The fresh-yard assertion originally changed from `deepEqual(freshYard.roadWork, createRoadWork())` to `notDeepEqual(freshYard.roadWork, yard.roadWork)` because the yard gained practice ground. The review found that too weak. It now checks exact equality with the eight defined practice cells and an empty blade, so any leftover work fails. Claude should review this change.

## Codex decided (Claude to review)

Town work is in the Scablands. All metres in a town cell must be firm for the middle road speed and smooth for paved speed. The weakest metre sets the grade. A rough patch can be repaired.

## Removed

Nothing. These machines add work and do not replace an existing feature. Moving yard work to a player's town is a later card.
