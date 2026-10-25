# DEEP-PLAYTEST-1

The short board entry controls current state, ownership, dependencies and locks.

From Kyle's first play of the live Deep (25 October 2026).

1. **Tame the jumps.** Some seabed bumps in the kelp forest send the car
   absolutely flying: underwater the car falls slowly, so a bump becomes a
   huge float. Kyle's call: cap how hard the seabed can launch the car so it
   hops and settles, still a little floaty, never sent flying. Find the
   launch in the dive's driving step (`src/deep/`, the underwater physics:
   speed cap, slow fall) and limit the upward speed a bump can give (and the
   height above the seabed), without changing the ramp descent, the landing
   or the slow fall itself. A test drives the worst bump from the kelp forest
   at full speed and checks the peak height stays small.
2. **A way back out.** There is no map underwater. Add the dive's own small
   map in the HUD, drawn from the zone data (the loop, the places found so
   far, the ramp, the car's position and heading), the same place the race
   minimap sits, and an arrow or bearing to the ramp when the player has
   been down a while or asks (key M toggles the map, as in races if free).
   The map only reads state.

Acceptance: tests for the jump cap and the map's data; `deep-sirena`,
`deep-life` and `deep-frames` scenarios pass, with deep-frames still at most
18.5 ms p95; one picture of the map for Claude's look check (JPG under
`docs/board/looks/deep-playtest-1/`); lane tier and build. Switch
`the-deep` is on in the live game, so every change ships in the next release.

## Test inventory for Claude's written review

The Deep import guard retains its empty-unapproved-import assertion. Add only
`tools/test-deep-map.mjs|../src/deep/deep-map.js`,
`tools/test-deep-map.mjs|../src/deep/zones/kelp-coast.js`, and
`src/screen-results.js|./deep/deep-hints.js`. The first two exercise this card;
the last is the existing released dive-kit notice from 2d0e281e. No blanket
exception, numeric limit or fingerprint changes. Independent code review is
clear; Claude's written assertion/inventory approval and map look remain for
the integration handoff. No merge or push in this lane.

## Lane handoff

Jump caps, read-only map, required lane suites, build and deep-sirena/deep-life
are verified; details in `docs/changes/DEEP-PLAYTEST-1.md`. Frame measurement
waits for the existing live Duel Chrome window to stop using most of the GPU,
as AGENTS rule 8 requires. No p95 or completed acceptance claimed. Run the
card's deep-frames command alone when quiet. Picture:
`docs/board/looks/deep-playtest-1/round-1.jpg`.
