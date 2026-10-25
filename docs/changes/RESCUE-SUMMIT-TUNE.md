# RESCUE-SUMMIT-TUNE: fair Summit clocks, an autopilot that climbs, paid fuel at the truck

Card: RESCUE-SUMMIT-TUNE (Claude, SIM lane). Design: `docs/HELI_RESCUE.md` sections
5.4 and 5.5; settled points in `docs/board/cards/RESCUE-SUMMIT-TUNE.md`. Everything is
behind the `rescue` and `summit-run` switches. Files: `src/heli/heli-missions.js`,
`src/heli/heli-autopilot.js`, `src/heli/heli-session.js`; new test
`tools/test-heli-summit-tune.mjs` (105 checks, about 6 minutes).

## What changed

1. **Clocks.** `SUMMIT_CLOCKS` (`heli-missions.js`) gives Summit Run its own rows:
   avalanche 2,250 s, supply 2,670 s. `rescueLimit(kind, gear, courseId)` and
   `clockLeft` pick the row by the rescue record's course; `RESCUE_CLOCKS` is
   untouched (hiker 900, avalanche 720, hoist 720, supply 1500 everywhere else) and
   hiker and hoist have no Summit row. The casualty's cold point follows the
   course's row. The rows come from measured steady-pilot times (below).
2. **The autopilot climbs a mountain** (`heli-autopilot.js`). When the straight line
   to the goal passes within 60 m of ground that stands 200 m or more above the
   ground under the helicopter and reaches its own height, the floor is at least
   80 m over the highest ground in the next 600 m of the path (never within 120 m of
   the goal, where the usual approach takes over), held 5 m under the flying
   ceiling and under the height the thin air still lets it hold (H1's thrust rule).
   Worked out twice a second. `autopilotStep` takes a new `ceiling(x, z)` option
   and the session passes `ceilingAt`. From the Summit start area the autopilot now
   flies an avalanche slide hover without a crash (before: into the ridge).
3. **Fuel trucks, always paid.** The lodge's fuel truck, which stood only at the supply
   pickup, now stands at two places for any Summit Run rescue (supply run or avalanche,
   decided by Claude on the first pass of this card): inside the Summit start area's
   landing circle and at the pickup. Each sells fuel at the pump's price to a helicopter
   on the ground in its circle, and always for pay: the pad's free first tank is kept for
   the pad (a first purchase at a truck does not count as the first refuel). The view
   shows `sites.zoneTruck` (and, for the avalanche, `pickup`, `truck`, `atTruck`).
4. **A stored Summit call with the Summit switch off** is dropped quietly at session
   start (`dropSummitCall`, `heli-missions.js`): no call, no record, no pay, no
   charge, the count left where it was so the next call rings as usual. With both
   switches on, or rescues off, nothing changes.

## Decisions I made (closest to the card and the design doc)

- **The mountain test is stricter than the card's wording.** The card says the
  straight line "passes within 60 m of the ground" and that today's courses already
  clear it. They do not: a plain approach to a landing zone at the end of a cruise leg
  passes within 60 m of a 100 m hill, and following it would have moved a pinned
  flight. The rule therefore also asks for ground 200 m over the ground under the
  helicopter that reaches the helicopter's own height. Only Summit Run's mountain
  (450 to 600 m over the start) qualifies; the pin below proves the others are exact.
- **The free first tank stays the pad's.** A first purchase at the truck is paid and
  leaves `refuels` at 0, so the pad's free tank is still there.
- **Dropped call leaves the count alone.** "No penalty" read as: not the usual
  other-crew handling (which resets the count and starts a quiet spell).

## Measured times and the rows

Both rescues flown end to end from the home pad by the steady scripted pilot (the test):
answer, fit the line (avalanche), lift off, the autopilot to the edge, the cruise leg (the
clock reads 383 s on arrival), down inside the start area circle, a fill at its truck, then
the rescue. Supply (the proven script: three crates from the pickup to the hut yard) 1,720 s,
paid 1,000. Avalanche 1,450 s, paid 1,200, the casualty unhurt: autopilot from the start
area up to the slide (about 6 km, 400 kg to 85 kg), landed at the pickup truck 460 m on,
refilled, lowered and clipped on beside the beacon, and the autopilot carried the pair
back down to the landing circle (22 kg left); nobody stranded, no crash. Times 1.55,
rounded up to 30 s: 2,670 s and 2,250 s. The test keeps at least 35% of the clock in hand.

## Why two trucks

Without a truck in the start area the pickup truck was out of reach: the cruise leg leaves
about 179 kg and the 6 km to the pickup takes about 250 kg (every pilot style ran dry and
was left to the stranded pilot's 900-credit truck). One truck at the start area is not
enough either: the climb to the slope and the carry back would need more than a tank.
With a truck at each end the avalanche works with a 330 and a 360 kg fill.

## Open for Claude

- **The autopilot cannot cross the cliff from the cruise leg's arrival point.** It flies
  a straight line from 1.5 km out of the start area toward the slide and meets a wall
  (the ground rises about 280 m within metres at about x 2,080, z 1,565) that the 300 m
  over the ground ceiling will not let it clear: it holds at the ceiling and the rotor
  strikes the rock. From the start area the same line clears. The scripted pilot
  therefore lands at the start area truck first (also for fuel) and flies from there.
  A player who engages the autopilot straight after the cruise leg would crash; not
  widened into this card.
- The scripted pilot cannot cross the ridge beside the road with the ceiling rule either; it
  follows the road to the pickup and slope (the supply run goes straight from the start area
  and works).

## Switch-off proof

`AUTOPILOT_PIN` (4100670798, worked out from the autopilot before this card): the
autopilot flying the cruise legs to Tremblant Snow and Panorama Ridge, the approach
after each, and an avalanche hover at Tremblant Snow, with Summit Run not passed, off
and on. Unchanged. `tools/test-heli-summit-rescues.mjs` still pins its two
fingerprints (rescue on with Summit Run off; Summit Run on with rescue off): unchanged.
`RESCUE_CLOCKS` is asserted equal; `test-heli-missions.mjs` and the rescue session test
are unchanged and pass.

## Changed assertions

`tools/test-heli-missions.mjs`, "out of time: the clock stops at its limit and says so":
the limit for each kind was `RESCUE_CLOCKS[kind]`; the test's supply call is at Summit
Run (`rescueConditions({summitRun: true})`), whose row is now its own, so the limit is
`rescueLimit(kind, null, <the call's course>)`. It still checks, for every kind, that
one second short is not expired and that the clock stops at the limit and stays
expired. `RESCUE_CLOCKS` itself is still asserted equal in the clocks check.

`tools/test-heli-summit-rescues.mjs` (SUMMIT-HELI-RESCUES), the supply run flown from Summit
Run's start area: two assertions said the truck is not at the start area ("the truck is not
here yet", `atTruck` false there; "no fuel for sale at the start area", `buyFuel(50).ok`
false). The two-truck decision makes the start area a truck stop, so they now say
`atTruck` is true there and that a full tank is refused with "The tank is full." The rest
of the file, including both switch-off pins, is unchanged.

## Removed

Nothing replaced.

## Gates

Owned suite: `test-heli-summit-tune` (105). 24 October 2026, on the final commit, from
PowerShell in the lane folder: `node tools/run-tests.mjs --tier lane --changed --jobs 4`:
148 passed, 0 failed (1,265 s), including `test-heli-summit-tune`,
`test-heli-summit-rescues` (113), `test-heli-missions` (45 groups) and the rescue session
and autopilot rescue suites; `npm run build`: pass. Two earlier runs stopped on a
`test-circuit-ardennes` timeout under load (it passes alone, 116 s) and on the two
`test-heli-summit-rescues` assertions listed under Changed assertions.
