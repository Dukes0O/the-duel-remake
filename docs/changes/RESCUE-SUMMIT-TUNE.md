# RESCUE-SUMMIT-TUNE: fair Summit clocks, an autopilot that climbs, paid fuel at the truck

Card: RESCUE-SUMMIT-TUNE (Claude, SIM lane). Design: `docs/HELI_RESCUE.md` sections
5.4 and 5.5; settled points in `docs/board/cards/RESCUE-SUMMIT-TUNE.md`. Everything is
behind the `rescue` and `summit-run` switches. Files: `src/heli/heli-missions.js`,
`src/heli/heli-autopilot.js`, `src/heli/heli-session.js`; new test
`tools/test-heli-summit-tune.mjs` (92 checks, about 3 minutes).

## What changed

1. **Clocks.** `SUMMIT_CLOCKS` (`heli-missions.js`) gives Summit Run its own rows:
   avalanche 2,670 s, supply 2,520 s. `rescueLimit(kind, gear, courseId)` and
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
3. **The truck always sells fuel** (`heli-session.js`). Away from the home pad a
   pilot with no purchases yet pays for the tank; the pad's free first tank is kept
   for the pad (the purchase does not count as the first refuel).
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

Steady scripted pilot (`tools/test-heli-summit-tune.mjs`): the cruise leg from the home
pad reads 383 s on arrival (lift-off, the autopilot to the edge, the leg); the whole
supply run from Summit Run's start area 1,238 s; the avalanche flight up to the slope
496 s. From the home pad: supply 383 + 1,238 = 1,622 s; avalanche 383 + 496 + 744
(the way down at the line's speed, 1.5 times the way up) + 90 (set-down, dig, clip) =
1,714 s. Times 1.55, rounded up to 30 s: 2,520 s and 2,670 s. The test keeps at least
35% of the clock in hand (36% and 36%).

## Open for Claude: the avalanche at Summit Run cannot be flown from the home pad

The rescue line is fitted only at the home pad, so the avalanche has to start there.
A full tank cannot do it: the lift-off and cruise leg leave 175 to 240 kg; the climb to
a slope 4.3 to 5.6 km out burns about 0.55 kg a second (more than 300 kg for the round
trip) and nothing at Summit Run sells fuel during an avalanche (the truck is only at the
supply pickup, and only for the supply run). So the avalanche part of the rows (the way
down and the set-down) is worked out from the measured way up, not flown end to end, and
the test says so. The only way out today is landing, running dry and the stranded
pilot's fuel truck (900 credits, more than the 1,200 pay's half). Options: a fuel truck
at the Summit zone for any Summit rescue (the same `buyFuel` rule), the avalanche only
flown from the pad with a smaller `legFuelKg`, or no avalanche at Summit. I changed
nothing here; the clock row will not matter until this is settled.

Also seen: the scripted pilot cannot cross the ridge beside the road with the 300 m over
the ground ceiling; it has to follow the road (the autopilot's straight line gets over by
its new rule). The supply pickup is 5.5 km from the zone, and a first fill at the pad
gives about 175 kg on arrival, so the supply run from the pad also wants a refuel on the
way; the test flies it from the start area, as before.

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

## Removed

Nothing replaced.

## Gates

Owned suite: `test-heli-summit-tune` (92). Lane tier and build: see below.
