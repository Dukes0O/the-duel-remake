# DIG-YARD-TOY

- The Dig has its own `dev` switch for yard entry and machine sounds; town keeps its switch. Yard help shares machine keys. Opening controls already appeared without input.
- Kept later switch values: `wasteland-town` is `dev`; `nissan-skyline` is `on`. Preview lists the Dig.
- Existing machine events use their named sound-bank cues; no new game event was added.
- Texture audit before and after: machines-1 has 0 of 63,426 UV vertices near white; borer has 0 of 44,876. No model changed. Borer photos contain 44 scattered near-white pixels; Claude must check the picture.
- On 16fdc2d1d: Dig, yard switches, machine haul and view passed; lane 98/114, with 14 failures passing individually outside the sandbox. Build passed.
- On the current changes: both audio suites and both borer scenario syntax checks passed; all four updated machine scenario modules parse.
- Changed assertions for Claude: switch count 55 to 56; Dig entry uses `the-dig`. Both audio pin exclusion lists extended for Dig additions; historical hashes unchanged.
- Removed: earlier duplicate `wasteland-town` and `nissan-skyline` entries.
- For Claude: run the Dig and four machine browser scenarios, including memory-only save comparison; play with sound, check pictures and run one Dig yard frame check. Independent review remains.
- Still needed: finish matching older suites, changed-files lane rerun and build. Lane deferred five long suites to night.
