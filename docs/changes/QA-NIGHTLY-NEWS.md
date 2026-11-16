# QA-NIGHTLY-NEWS

- Nightly reports distinguish passed, standing and new failures; a standing item leaves only on proof of its own pass. Strict runs include all checks.
- Weekday browser selection follows changed scenarios, helpers and areas. Saved-progress scenarios always run; Saturday and strict runs include all.
- Status shows the latest nightly result and missed nights. No new game events or sound cues; race fingerprints unchanged.
- Areas: lab, deep, heli, ski, world and story, arena, arsenal, crew, warlords, lessons, circuits, combat, audio, on foot, machines, town, armor, raiders, Grand Prix, tracks and named cars.
- At `cd57cd925`: browser selection tests 15 passed; full-check tests 51 passed, one failed because sandbox blocks `pwsh` in the temporary Git-copy check. Claude must rerun it on the laptop.
- `--changed-since HEAD --list`: Selected 63; left for Saturday 159. Reasons: 10 guards saved progress; 53 no area.
- Board: 654 checks passed. Repository hygiene: passed.
- Changed assertions: none. Codex decided: none; saved-progress selection follows Claude's 16 November ruling.
- Removed: the former all-scenarios-every-weekday selection and unproven standing-item removal.
