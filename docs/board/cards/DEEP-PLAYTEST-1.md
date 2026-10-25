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
