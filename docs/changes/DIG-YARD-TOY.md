# DIG-YARD-TOY

- The Dig has its own `dev` switch for yard entry and machine sounds; town keeps its switch. Yard help shares machine keys. Opening controls already appeared without input.
- Kept later switch values: `wasteland-town` is `dev`; `nissan-skyline` is `on`. Preview lists the Dig.
- Existing machine events use their named sound-bank cues; no new game event was added. Ground stays in page memory until reload, with no browser or player save storage.
- Texture audit before and after: machines-1 has 0 of 63,426 UV vertices near white; borer has 0 of 44,876. No model changed. Borer photos contain 44 scattered near-white pixels; Claude must check the picture.
- On 16fdc2d1d: Dig, yard switches, machine haul and view passed; lane 98/114, with 14 failures passing individually outside the sandbox. Build passed.
- On 4362b025d: changed-files lane 24/24, replay 297 checks and build passed. Audio suites passed; P4 fingerprint 797e1c5a53423d2cacf2317b084aa4fffb9785a1dee353d828a1a4624823f038.
- Matching older short suites passed, including gas-run and hygiene on solo reruns. Lab tune exceeded three minutes alone. The updated machine scenario expressions parse; their switch check passes with this note.
- Night-only matching suites: circuit-layouts, field-battle, grand-prix-existing. The lanes also deferred arena-shove, convoy-tanker-art, first-person-polish and old-smoke.
- Changed assertions for Claude: switch count 55 to 56; Dig entry uses `the-dig`. Both audio pin exclusion lists extended for Dig additions; historical hashes unchanged. Added checks for four machine scenario switches.
- Review fixes on df31c7a9a plus this change: Dig keys stop at the overlay except M; a failed renderer removes the host and listeners. Restored dig, truck and trench scenario checks; page expressions parse.
- Review checks on df31c7a9a plus this change: Dig test, changed-files lane 32/32 (297 replay checks) and build passed.
- Removed: earlier duplicate `wasteland-town` and `nissan-skyline` entries.
- For Claude: run the Dig and four machine browser scenarios, including the memory-only save comparison; play with sound, check pictures and run one Dig yard frame check.
