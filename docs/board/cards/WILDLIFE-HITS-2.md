# WILDLIFE-HITS-2

The short board entry controls current state, ownership, dependencies and locks.

Animal hits, round 2, from Kyle's try on 20 November 2026 (switch `wildlife-hits`, still `dev`).

1. **More animals to hit.** About twice as many animals stand within reach of the road on each course with wildlife,
   spread along the lap rather than in one place. The frame check's busiest view must stay within budget.
2. **More kinds to hit.** Every ground species in `src/wildlife.js` can be hit, and so can a bird standing on the
   ground; a bird in the air flies off. Each kind falls in a way that suits its size (a moose stops a car, a marmot
   does not).
3. **A much louder splat.** The hit cue plays at least as loud as a car-to-car crash, with a heavier thump for large
   animals. Name the cue in the change note.
4. **Turning round on the road.** Kyle could reverse but could not turn the car round to drive the lap the other way.
   Find out what stops a U-turn on Tremblant Woods (steering lock at low speed, road width, a reset, or a rule) and
   report it on this card before changing anything. The reverse courses (Tremblant Woods Reverse and others) exist
   already and open when their sign is spotted from the helicopter; the test copy's "Create temporary player with
   every course open" opens them for a try.

Checks: the wildlife suites that name the hit (search `tools/` for `wildlife-hits`), one new check that a hit on each
size of animal gives the right fall, and the frame check at the busiest view if the count rises. Claude drives it by
hand before Kyle's next try.

## Turning round on the road: what stops it (Claude cloud, 26 November 2026)

A rule, not the steering, the road or a reset. On a race course an ordinary road car moves in the "lane" branch of
`src/sim-driving.js` (lines 340 to 348), which clamps the car's angle to the lap direction at 1.45 rad (83 degrees):
`s.headingError = Math.max(-1.45, Math.min(1.45, s.headingError))`. Only arenas, practice, the Bowl, the hidden road,
the Deep and an off-road truck off the road turn freely (line 332). Forward travel there is `max(0, cos(heading)) *
speed`, so a car can reverse back down the lap but can never face the other way. A headless run on Tremblant Woods
(Falcone F42) held at 83.1 degrees on full lock, and again after a three-point turn in reverse. The rest is not the
cause: the turning circle at low speed is about 24 m across against 14 m of asphalt, so a three-point turn would fit;
reverse is capped at 22 mph and steers like a real car; the resets come only at 60 m (warning) and 78 m from the
middle; there is no wrong-way rule. Nothing in "Keep these" protects the clamp. Nothing was changed: lifting it is
physics and the lap gates, a card of its own (the question is in `docs/board/questions/WILDLIFE-HITS-2.md`).
