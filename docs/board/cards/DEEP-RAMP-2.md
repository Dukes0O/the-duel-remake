# DEEP-RAMP-2

The short board entry controls current state, ownership, dependencies and locks.

From Kyle's second report on the live Deep (25 October 2026), with four
screenshots: going down the ramp is really tricky; the car crabs sideways
("dog tracking in the extreme"); the camera is hard; the ramp is too narrow
and easy to miss. The pictures show the ramp as a thin flat grey sheet laid
across a steep grassy hillside, with the hillside poking through it, so the
car ends up on the side slope instead of the ramp.

1. **A real ramp, cut into the hill.** About 12 m wide (was 6 m), concrete
   with a worn surface and a low kerb along each edge. The ground beside it
   is graded into a level cutting (the terrain is lowered and levelled along
   and a few metres either side of the ramp), so no hillside pokes through
   and nothing tilts the car sideways. The ramp runs straight down the fall
   line from the road to the water.
2. **Easy to find.** A clear opening in the roadside guardrail, two short
   posts and a small faded sign ("BOAT RAMP") at the turn-off, visible from
   the road in both directions; the existing bubbles tip stays.
3. **Drives true.** While a car is on the ramp it is guided straight down it:
   sideways slip on the ramp is cancelled (as if on rails, but the player
   still steers), and speed is capped to a steady roll. Back up the ramp
   works the same way.
4. **A better camera on the ramp.** A higher chase view looking down the ramp
   to the water while on it, easing back to the normal camera at the road
   and under the surface.

Keep: the ramp's place on all three routes, the pause at the water's edge,
the Dive or Turn back choice, the dive kit rule, Summit-style fun elsewhere.
Acceptance: the existing ramp tests (`tools/test-deep-ramp.mjs`) updated for
the new width with written reasons, new tests for the cutting (no terrain
above the ramp surface anywhere), the guided descent (a car entering at an
angle reaches the water without leaving the ramp) and the camera; picture
sheet of the turn-off, the ramp from the road and the descent under
`docs/board/looks/deep-ramp-2/`; deep scenarios and the Pacific Canyon race
scenarios pass; world signatures for Pacific Canyon change only where the
cutting is (reviewed difference); lane tier and build.
