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
