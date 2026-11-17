# DIG-YARD-TOY slice 2

- The Dig-only yard omits roller and paver from the cycle, models and activity text; town retains both. Open activities come first, with the Dig first.
- Each machine's panel and left guidance share its own control words. The truck confirms a completed tip; a stalled bucket directs the player to fresh dirt.
- Cause: the truck-side cut quickly approaches zero as interpolated ground height converges on the cut grid point.
- Cab views for ordinary machines clear the posed model; the excavator chase view is 35 degrees to one side. Mabel uses the same clearance rule in her second view.
- Checks on d9534ad1a and lane changes: `test-dig-yard-switches`, `test-the-dig`, `test-gear-find` and `test-machine-input` and `test-machine-view` passed.
- Changed assertion for Claude: machine list depends on the town switch because unfinished road models are hidden in the Dig alone.
- No new game event or sound cue. The switch stays `dev`.
- Removed: duplicated machine availability and panel control text; MACHINE-ROADS removes the temporary restriction.
- The Dig scenario pictures each offered machine in its second view; page expressions parse. Claude must run it in a browser.
- Ground layers now sit below edited chunks in the Dig; heap and cut ray checks pass. `test-ground-view` and `test-the-dig` pass on the current lane changes.
- On b14365aad: real-model camera, Dig, switches, gear, ground, apprentice, borer-freeze, survey, roads and input checks pass; scenario strings parse.
- Ground sample caching keeps the 100-step Mabel check under its existing limit: 4,196 of 6,000 samples.
- Changed assertion for Claude: near-ground vertices now match the lowered underlay rather than ground height plus 0.025 m; the 0.02 m tolerance is unchanged.
