# DIG-YARD-TOY slice 2

- The Dig-only yard omits the roller and paver from the cycle, models and activity text; town retains both. Open activities come first, with the Dig first.
- Checks on 84bad92bb plus this change: `test-dig-yard-switches`, `test-the-dig` and `test-gear-find` passed.
- Changed assertion for Claude: machine list now depends on the town switch, because unfinished road models are hidden in the Dig alone.
- No new game event or sound cue. The switch stays `dev`.
- Removed: duplicated machine availability lists; MACHINE-ROADS removes the temporary restriction.
- Still to build: machine help, camera views, truthful digging and tip messages, and the browser scenario. Run remaining card checks, lane tier and build at the end.
