# HELI-ARRIVAL-CLEAR

Claude (flying line), from HELI-CHART-MIRROR's arrival check, 2 November 2026. SIM lane, file
`src/heli/heli-session.js` (`enter` and the arrival point); no switch (a fix to how every cruise leg ends).

A cruise leg ends 1.5 km out from the landing zone, 150 m above the pad, flying in at 20 m/s
(`HELI_SESSION.arrivalDistance/Height/Speed`). Some straight lines in from there cross ground higher than
that. Measured on 2 November with the pilot's map, Summit Run, the Table and Kogane Pass on (21 places,
420 arrivals; the ground, trees and rocks on the line every 5 m):

- Nine lines in rise above the arrival height: Panorama Ridge from Summit Run (61 m over it, met after
  265 m, about 13 s), Alpine Serpent from Titan Arena (17 m), and Ridge Rally from Neon Docks, Neon Drift
  Trial, Harbour Lights, Midnight Chase, Titan Arena, Harbor & Highlands and Tremblant Woods (1 to 14 m).
- 38 more pass within 40 m of the ground or a treetop, several from the first second (Timberline Rush
  from Midnight Chase starts 10 m over the ground, Alpine Serpent from Panorama Ridge 4 m).
- No arrival point is under the ground. Every course's flying ceiling is about 299 m over its pad.

## Claude decides (before code, 2 November 2026)

**Each arrival starts high enough to clear its own line in.** The arrival point stays where it is (1.5 km
out, on the map's bearing, the same speed and heading). Its height is the usual 150 m over the pad, or,
where the line in from there to the landing circle has higher ground, trees or rocks, 40 m over the
highest of them, whichever is higher, and never above 20 m under the flying ceiling.

- The margin is 40 m, the same height the rescue autopilot keeps over the highest thing at a search
  spot. The line is checked every 10 m with `ground.highest` over a 6 m circle (the rotor), the same
  reading the autopilot climbs by.
- The highest need measured is 251 m over the pad (Panorama Ridge from Summit Run), 48 m under the
  ceiling, so the cap never binds today; it is there so a future course can never start a leg above its
  own ceiling. The check below fails if any line in ever needs more than the cap gives.
- Summit Run with rescues on keeps its own arrival over the start area (RESCUE-SUMMIT-ARRIVAL).
- Rejected: ending every leg over the zone as Summit does (it removes the flight in, which is most of the
  arrival, and the player's approach); shortening only the bad legs (a closer start still meets the same
  ridge where the high ground is near the pad); turning the arrival point off the bearing (the map and
  the HEADING gauge would disagree again, which HELI-CHART-MIRROR just fixed).

Lines in that already clear by 40 m start at 150 m as before, so most arrivals and the pinned flights
from the home pad to Tremblant Snow and Summit Run do not move. Pins that hash an arrival on a raised
line move only in its height; each is compared field by field and re-recorded with its reason.

## Checks

1. New `tools/test-heli-arrival-clear.mjs`: every arrival with all four map options on (and the old
   three-destination table): the point is over the ground, the level line in at the arrival height clears
   the ground, trees and rocks by at least 40 m all the way to the landing circle, the height is 150 m
   where the line was already clear, and under the ceiling. Fails on the old code at Panorama Ridge from
   Summit Run.
2. The same file, in a session: the cruise leg from Summit Run to Panorama Ridge, then a pilot who flies
   straight at the pad at the arrival height reaches the landing circle without a crash; on the old code
   that flight hits the ridge.
3. The suites that pin arrivals (`test-heli-summit-arrival`, `test-heli-autopilot-rescue`,
   `test-heli-summit-tune`, `test-map-destinations`) pass, with any moved pin re-recorded.
