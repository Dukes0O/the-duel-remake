# BOWL-JUMP-EVENTS

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (three events' rules). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

Three new events built from the jumps: Long Jump, High Jump and Home Run. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md),
section 11. Kyle, 20 November 2026: "the nights repeat each other"; more variety, new challenges.

Each event is three goes. After each go the truck is put back on its run-up (a one second fade), so nobody drives back.
Each registers with `registerBowlEventRunner`, scores points so that it works as one go in a Turn Show, and stands its own
pieces on the floor only while it runs (the dressing hook BOWL-CRUSH adds).

## What to build

1. **Long Jump.** A row of buses stands broadside beyond the Big Jump along the line of flight, the first 20 m past the
   crest and one every 3 m. The result is how many buses the truck cleared on its best go. Easy needs 4, Medium 7, Hard
   9. A bus landed on is crushed and not counted. 40 points a bus cleared, with the jump's own points and tricks on top.
2. **High Jump.** A bar of flame between two posts stands across the Big Jump's flight at its highest point, at 6 m on
   Easy, 9 m on Medium and 12 m on Hard. A go that passes over it is clear. After a clear go the bar rises 1 m for the
   next. 100 points for the first clear go and 60 for each metre above it.
3. **Home Run.** A target of three rings, 24 m across, is painted on an empty section of the stands beyond End 1, where
   the Big Jump throws a truck with nitro. Each go: over the wall, land, and come back to the floor through a gate inside
   30 seconds (after that the truck is put back). Easy needs one go over the wall, Medium one landing on the target, Hard
   one in its middle ring. 150 for over the wall (BOWL-OUT-SIM's points), 150, 300 or 600 for the rings.
4. **Events:** `bowlGo {event, go, result}` after each go, and a goal line of eight words or fewer for each.

Design numbers are for Claude's review; the builder measures each with a scripted driver and reports what a child-pace
driver and a full-throttle driver with nitro reach.

## Files and locks

`src/bowl/bowl-jump-events.js` (new), one import in `src/bowl/bowl-night.js` and the event names in
`src/bowl/bowl-show.js` and `src/bowl/bowl-lines.js`, the dressing data beside `src/bowl/bowl-crush-field.js`,
`src/bowl/bowl-view.js` (the buses, the bar, the target), `tools/test-bowl-jump-events.mjs` (new). Locks: `bowl-night`,
`bowl-floor`.

## Checks

1. `tools/test-bowl-jump-events.mjs`: for each event, a scripted child-pace driver wins Easy at least 9 times in 10 and a
   full-throttle driver without nitro does not win Hard; three goes are played and the best counts; the pieces stand on
   the floor in their own event only.
2. `tools/test-bowl-turns.mjs`: each new event runs as one go in a Turn Show and ends in the turn phase with a score.
3. Laptop only, Claude runs: each event by hand, once.

## Sound cues

`bowl.go.ready` (the truck is back on its run-up; stand-in `interface.radar`), `bowl.long.clear` (a tick for each bus
passed over in flight; stand-in `interface.countdown`), `bowl.high.clear` (over the bar: a rush of flame; stand-in
`weapon.flame.start`), `bowl.high.fail` (under it; stand-in `interface.lose`), `bowl.home.ring` (a landing on the target,
higher for the middle; stand-in `interface.bonus`).

Behind `titan-bowl`. Builder's checks, then the lane tier and `npm run build`, recorded in
`docs/changes/BOWL-JUMP-EVENTS.md` with a Removed line. Before CARD DONE, search `tools/` for every id and name this card
changes and bring each older suite and scenario that names it up to date. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key. Clean up nothing outside this
lane.
