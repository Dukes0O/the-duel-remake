# QA-NIGHT-19-NOV: `wildlife-view` (item 1)

**Cause: not a fault in the game.** The check had two inputs that were not its own. (1) `src/wildlife-view.js` plans herds from the calendar day, so the herd stood somewhere new each day. On 19 November (play day 20776) the herd of two deer at s 4242, lateral -26 stood 22 m from a station of the check's sweep (every 150 m at lateral 0). The sweep startled it, the deer ran to lateral -37 and -43 (beyond the 35 m a car on the middle of the road reaches), and the later drive moved nothing: `Nothing ran: [0,0]`. Run without graphics, the real view reproduces this exactly (moved [0,0] after the sweep stations; fresh, the same herd runs 13 and 17 m; in the browser 11 and 17 m). (2) The race stayed live while the check drove, so traffic and the rival, which move by the clock, could startle the herd as a car does (the run before the cure showed the herd already moved at 44 m with no car of the check near it).
The startle itself is sound: over 40 days on each of Tremblant Woods and Tremblant Snow, 205 of 210 animals within 34 m of the road's middle ran when a car passed. Of the other five, two are lake-shore beavers with no standable spot within 10 to 20 m (the existing "turns away and stays" rule); three are deer in herds of three whose count could not tell them from a neighbour's old place, and the one such herd checked by hand ran, all three.

**Cure** (checks only; the one `src` line is a QA hook that changes nothing for players):
- `src/wildlife-view.js`: `viewPlayDay`, the default `playDay`; it reads `globalThis.__qaWildlifeDay` (a whole number) and otherwise the calendar day.
- `tools/scenarios/wildlife-view.mjs`: fixes play day 20776 after every navigation; plans the herd from the rules (`placeWildlife`) instead of finding it by driving up to it; stops the app's own loop at START; drives a fixed 1.9 m a frame (no `performance.now`); waits until the animals stand still rather than for 90 frames; checks the herd stands where the plan put it. Every other read of the clock in the wildlife modules was searched (`Date`, `performance.now`, `Math.random`): only `calendarPlayDay` reads it.
- `tools/test-wildlife-view.mjs`: new section runs the real view headless on that day's herd: fresh, a pass at 26 to 34 m sends every animal running beyond 35 m; a second pass leaves them (the cause); a test of the hook. Fails when the 35 m reach is broken.

## Checks
- `node tools/test-wildlife-view.mjs`: 3838 checks pass. `node tools/test-wildlife.mjs`: 33,644 pass.
- Browser `wildlife-view`: before the cure fails on the same herd (`Nothing ran: [0,0]`, 19 November, `00382d70b`). After the cure passes twice (runs A and B, identical moves of 10.975 m and 16.596 m, planned-versus-drawn distance 0), on the merged tree (scenario files identical to `99c8b063a`, bundle built from the same `src`).
- Lane tier on `99c8b063a` (integration merged in): 29 passed, 0 failed, 0 not run; replay fingerprints 297 checks across 33 cases unchanged. `npm run build` passes. The three long suites it left to the night (`test-arena-shove`, `test-convoy-tanker-art`, `test-first-person-polish`) do not name the changed wildlife or scenario code beyond the import graph.

## Changed assertions
None weakened. The scenario's "a herd within sight" sweep became "the herd stands where the plan put it" (stricter: every planned animal must be drawn within 1.5 m).

## Removed
The scenario's sweep along the lap that found the herd by driving up to it, and its clock-driven drive. Nothing else.
