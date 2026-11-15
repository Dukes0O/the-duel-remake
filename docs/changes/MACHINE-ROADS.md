# MACHINE-ROADS

The dozer cuts and carries material into low ground. The roller firms the fill, and the paver lays a surface at a steady pace. Soft and rough work can be repaired. The yard starts with material and a ditch. Its machines now work the same ground. Each machine has its own controls, visible work, guidance and sound. These machines are behind `wasteland-town`.

A town can record individual machine actions without changing an old save. Town roads use eight-metre cells. Their weakest metre sets the grade, and the existing haul route uses that grade to set truck speed. A rough patch can lower the grade and another pass can restore it. The yard does not write to a town or a save.

## Review fixes

The dozer can now cut ordinary ground and spread its load with the blade raised. The road rules test passes with a 40-metre stretch made from ordinary ground. The paver now measures steering against its starting line, and paving detects neighbouring height changes. The roller can press a heap level. Driven tests cover both faults and their repair. The town now advances its haulers over saved machine roads during its own hourly ticks; a day-long test shows the paved road moves a truck farther. The fresh-yard test now checks the exact eight practice cells and nothing else. The scenario had an impossible third roller wait above the maximum compaction; it now caps the target and reports the yard state on every timeout. A keyboard-driven yard test reaches the paver and repairs the surface. The worked strip now reshapes and colours the yard floor across the width of the drum and screed, with no raised tiles. The checks below cover these fixes.

Fifth review: a new paving pass starts its own line. The trencher and road machines now work the same yard ground, and a driven test fills and paves a trench. Rolling moves material into neighbouring metres and packs one tenth of the displaced depth. The material check counts that packed share. Paving compares bumps with firm neighbouring ground.

## Checks

- Fifth review on 89d40a217: road rules, all machine, dig and town suites passed. Both replay suites passed with 297 and 12 fingerprint checks; no fingerprints changed. The lane tier passed 54 of 56. Town people took 42.40 ms against 30 ms under load, and passed alone on the same commit at 21.58 ms. Review evidence could not start ffmpeg in the sandbox, then passed outside it, 9 of 9. The build passed with Vite chunk and dynamic-import warnings.
- Fourth round: road rules passed, including the machine-text encoding check and separate loose, firm and paved colours. The build passed with the existing Vite warnings. The yard screen is UTF-8 without a byte-order mark and uses LF line endings. All files changed on this branch were checked for the same broken character.
- Road rules, all machine, dig and town suites: passed, including older and new town save round trips, road grades, truck travel, repair and the yard ground view.
- `test-replays.mjs`: passed 297 fingerprint checks across 33 cases. `test-combat-replays.mjs`: passed 12 fingerprint checks across four encounters. No fingerprints changed.
- Lane tier: 54 of 56 passed. Town people exceeded its 30 ms timing limit under load at 34.07 ms, then passed alone at 19.90 ms. Review evidence could not start ffmpeg in the sandbox, then passed outside it (9 of 9).
- `npm.cmd run build`: passed. Vite reported its existing chunk-size and dynamic-import warnings.

Road changes are excluded from the digging machines' page-lifetime ground memory. A test cuts ground with the dozer, digs elsewhere, and confirms that the next visit keeps the digging but starts without the road work.

## For Claude to run

Run `tools/scenarios/machine-roads.mjs` with memory-only saves. Check one picture of each machine working with only its own controls, a finished stretch, and a bad stretch. The scenario passed before the fourth-round visual changes; check the surface colours, screen text, shared ground and the repaired paving line. Browser checks cannot run in this lane. Review the code and the changed assertion before merging.

## Sound cues

Blade work: `dozer-blade`. Rolling: `roller-ground`. Paving: `paver-surface`.

## Changed assertions, for Claude to review

The fresh-yard assertion originally changed from `deepEqual(freshYard.roadWork, createRoadWork())` to `notDeepEqual(freshYard.roadWork, yard.roadWork)` because the yard gained practice ground. The review found that too weak. It now checks exact equality with the eight defined practice cells and an empty blade, so any leftover work fails. The view test replaced the old box-height assertion of 4.05 m with ground-height assertions of 4.5 m while raised and 4 m after repair, because the ground mesh itself now changes. Claude should review these changes.

## Codex decided (Claude to review)

The roller packs one tenth of the material it displaces and pushes the rest to neighbouring ground. Town work is in the Scablands. All metres in a town cell must be firm for the middle road speed and smooth for paved speed. The weakest metre sets the grade. A rough patch can be repaired.

## Removed

Nothing. These machines add work and do not replace an existing feature. Moving yard work to a player's town is a later card.
