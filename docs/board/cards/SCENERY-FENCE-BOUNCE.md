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

## Implementation decision (27 November 2026)

The measured extra push is the next tick's overlap after the CPU scenery response clamps its heading to the road.
Keep the incoming world heading for contact with Scablands sheet walls (up to 24 cm thick, including gate leaves).
Keep the swept entry face and its existing 4 cm clearance; leave thicker solids, buildings and arena walls unchanged.
Owned hook: `src/sim-contacts.js::_staticContacts`; regression: `tools/test-scenery-fence-bounce.mjs`.
Checks: native 20/40 mph rams at both gate-fence faces and both Home Ground panel axes, player and CPU;
`test-arena-shove`, `test-wasteland-truck-wall`, `test-home-ground`, `test-open-doors`, the four guards, lane tier and build.
No new event or sound cue. Claude runs browser checks and provides the independent code review.
