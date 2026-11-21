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
driver and a full-throttle driver with nitro reach. Kyle, 20 November 2026: the player is a pre-teen, and Easy is won
often, not almost always. So each Easy number above is a starting number: raise it a step (a bus, a metre, a ring) while
the child-pace driver still wins all ten seeds, and lower it a step if that driver wins fewer than six.

## Files and locks

`src/bowl/bowl-jump-events.js` (new), one import in `src/bowl/bowl-night.js` and the event names in
`src/bowl/bowl-show.js` and `src/bowl/bowl-lines.js`, the dressing data beside `src/bowl/bowl-crush-field.js`,
`src/bowl/bowl-view.js` (the buses, the bar, the target), `tools/test-bowl-jump-events.mjs` (new). Locks: `bowl-night`,
`bowl-floor`.

## Checks

1. `tools/test-bowl-jump-events.mjs`: for each event, a scripted child-pace driver wins Easy at least 6 times in 10 and a
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

## Build decisions and shared hooks, 20 November

Measure the bus row and flame plane in world metres along the Big Jump's flight, not around the ring. A bus counts only after the truck clears its whole width in the air. The flame plane checks the front and rear of the truck, so a nose that makes it over alone is a miss. Mark Home Run's rings around a real boosted landing on the terraces and use the actual gate return to close the attempt. The three jumps carry their best result into the event and Turn Show.

Before BOWL-NIGHTS installs the table, may the existing Show Night start take an explicit registered jump event for the memory-only checks and Claude's batch drive, with no new picker entry? May the runner hold the simulation for the one-second reset while the existing Bowl HUD paints a read-only fade and shows the best of the three goes? The common hooks would be limited to `src/bowl/bowl-night.js` for the reset and direct start and `src/bowl/bowl-screens.js` for the fade and result line. BOWL-NIGHTS then selects these same runners through the season table.

## Measured checkpoint, 20 November

The runners and pieces are at `898c630c4`. A stock Titan cleared four buses without nitro and ten with nitro. A boosted Home Run reached the centre and returned through Pit Gate in 23.3 seconds from the wall crossing. A slower boosted pass reached the middle ring and returned in 23.5 seconds. These were real driving steps in memory. The card is paused for the direct start, reset and result hooks above, while Trick School takes bowl-night to finish its save review.

## Claude answers, the start, reset and result hooks (20 November 2026)

**Granted, all three,** limited to `src/bowl/bowl-night.js` and `src/bowl/bowl-screens.js`: the existing Show Night start may
take an explicit registered jump event (no new picker entry; BOWL-NIGHTS selects the same runners through the season table);
the runner may hold the simulation for the one-second reset while the Bowl screen paints a read-only fade; and the screen
shows the best of the three goes. The build decisions are agreed: buses counted in world metres along the flight, a bus only
when its whole width is cleared in the air, the flame plane checked at the truck's front and rear, Home Run's rings round a
real boosted landing and closed by the real gate return. Trick School holds `bowl-night` until its save review is done; take
it after. Merge under AGENTS rule 23; Claude drives the three events on the merged game with the next batch.

## Home Run stands, 20 November

The merged Bowl Outside view now fills the landing site with spectators. May Jump Events add one read-only hook in `src/bowl/bowl-stadium.js`, to leave seats vacant within Home Run's target? The paint in the already owned Bowl view can then follow the stadium's tread heights. The same stands and crowd remain in the other events.

## Reset review, 20 November

A real Hard High Jump with a late backflip landed on its roof. The next go lost its first 1.5 seconds to the last go's recovery after the truck was already back on the run-up. May this card add a small go boundary in `src/bowl/bowl-tricks.js`? On a fresh go it would clear flight, recovery and held inputs while preserving trick variety and secret history for the event. Other events keep the same state. The reviewer also caught the middle-ring goal and the standalone retry. Those are fixed in the jump lane. High Jump will keep the best go's ordinary points and pay the bar bonus by the highest bar cleared.

## Home Run scoring review, 20 November

The same centre landing and valid return scored 1,856 at a steady return pace and 3,975 when the driver jumped and hit parked cars on the way back. I propose that Home Run pays only the card's wall crossing and ring awards, with the gate return required to place the go. The drive back is against the clock. Long Jump keeps its listed ordinary jump and trick points, and High Jump keeps its best go plus the bar bonus as recorded above.
