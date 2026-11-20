# BOWL-TRICKS
- Venue-gated ground and airborne tricks, pose, NEW/repeat/combo scoring, clean/slide/Slam landings and crowd sounds. Released venues keep their controls.
- Ten seeded 90-second runs per skill measured targets of 310 / 1,810 / 4,260 after WALLS (ebd94029a). Child won Easy 9/10 and Hard 0/10; experts landed double backflips and combos.
- Real Big Jump: single/double backflip 50/200, backflip plus spin 120. Opposite flips bank both kinds; a Slam pays nothing, drops the actual crowd a third and does zero damage.
- The 32 mph clearance case stays; a 30 mph Freestyle pilot takes the parked car. Seven trick tests, 22 score checks, 280 solo-night and 307 Turn Show checks passed.
- Rex (59 checks, ebd94029a): all ten original Easy seeds smashed all three boxes after aligning on the ground and releasing the controls in flight. Pace, reaction, wobble and eight-win threshold unchanged.
- Assertions: roof tumble becomes Slam recovery and no pay; flip counter/donut timer become landed turns, pose and event points. Claude approved through 967ecb28b. Turn/Rex pilot assertions unchanged.
- Initial lane started at 0682ce770 and stopped on the two old Turn/Rex pilots. Build passed at ebd94029a. Final rule 19 gate pending. Browser and art checks: Claude runs.
- Removed: src/bowl/bowl-air.js and tools/test-bowl-air.mjs, the flip counter, and the separate night donut counter. Replaced by shared trick rules and real-floor checks.
