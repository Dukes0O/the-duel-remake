# DIG-YARD-TOY slice 2

- The Dig-only yard omits the roller and paver from the cycle, models and activity text; town retains both. Open activities come first, with the Dig first.
- Each machine's panel and left guidance now share its own control words.
- Checks on 84bad92bb and subsequent lane changes: `test-dig-yard-switches`, `test-the-dig`, `test-gear-find` and `test-machine-input` passed.
- Changed assertion for Claude: machine list now depends on the town switch, because unfinished road models are hidden in the Dig alone.
- No new game event or sound cue. The switch stays `dev`.
- Removed: duplicated machine availability and panel control text; MACHINE-ROADS removes the temporary restriction.
- Still to build: camera views, truthful digging and tip messages, and the browser scenario. Run remaining card checks, lane tier and build at the end.
