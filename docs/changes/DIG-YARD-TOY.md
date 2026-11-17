# DIG-YARD-TOY slice 2

- The Dig-only yard omits roller and paver from the cycle, models and activity text; town retains both. Open activities come first, with the Dig first.
- Each machine's panel and left guidance share its own control words. The truck confirms a completed tip; a stalled bucket directs the player to fresh dirt.
- Cause: the truck-side cut quickly approaches zero as interpolated ground height converges on the cut grid point.
- Checks on d9534ad1a and lane changes: `test-dig-yard-switches`, `test-the-dig`, `test-gear-find` and `test-machine-input` passed.
- Changed assertion for Claude: machine list depends on the town switch because unfinished road models are hidden in the Dig alone.
- No new game event or sound cue. The switch stays `dev`.
- Removed: duplicated machine availability and panel control text; MACHINE-ROADS removes the temporary restriction.
- Still to build: camera views and browser scenario. Run remaining card checks, lane tier and build at the end.
