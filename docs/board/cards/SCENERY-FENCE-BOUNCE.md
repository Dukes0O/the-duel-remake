# SCENERY-FENCE-BOUNCE

The short board entry controls current state, ownership, dependencies and locks.

Claude's card, small, found by WASTE-TRUCKS-FIT on 27 November 2026. A computer-driven car shoved into Tin Town's
20 cm gate fence jumps 1.2 to 2.1 m back off it in a single tick. Released cars do it too, so the cause is the general
scenery contact rule (`_staticContacts`), not the Workshop trucks. A player sees a car leap off a thin fence instead
of stopping against it. Find why a thin solid pushes a car out by more than the overlap, fix the rule so the car ends
just clear of the fence, and keep every released car's replay fingerprints and arena pins. Checks: a check that rams
the gate fence with several cars at 20 and 40 mph and measures the step back in one tick; the four guards;
`test-arena-shove`; `npm run build`. Home Ground's fences will lean on this rule, so it matters before raids arrive.

## Claude answers
