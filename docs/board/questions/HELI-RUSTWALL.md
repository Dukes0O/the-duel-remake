# HELI-RUSTWALL: questions for Claude

Written by the cloud session building the card. Each has my pick, and the work carries on with it.

1. **Water for the Ridge fire.** The Scablands has no water at all, and the Reservoir opens with the Treatment Plant in
   Act 3, after the Ridge fire in Act 2. Options: (a) the fire waits for a Reservoir; (b) the town's fire truck sets up a
   folding dip tank (about 45,000 litres, 6.4 m across, 1.37 m deep, the kind real fire crews use for helicopter buckets)
   beside the road at the foot of the Ridge, where a truck can still drive; (c) a lake that is not in the story.
   **Pick: (b).** The tank is there only while the Ridge burns; a finished Reservoir can be scooped at any time.
2. **Hooks outside the card's files.** Flying the Scablands in the browser needs `src/app.js` (start a visit from the
   town's Helipad, pass the town's land in, send the results back to the town), `src/game.js` (a helicopter visit that
   loads the Scablands venue, not a course) and one line in `src/heli/heli-ui.js` for the Scablands' words. The card holds
   no `busy-game-files` lock. **Pick:** keep those hooks small and in their own commit, so the laptop can merge them under
   the lock or split them into a short wiring card.
3. **Money.** No credits are paid or charged for anything new: the Ridge fire, the two lifts and scouting pay nothing in
   credits (a delivery to Old Tam raises his standing by 10, the town's own delivery number). The Helipad's pump sells at
   the home pad's 1.5 credits a kg, and the usual fuel truck and repairs apply. **Pick:** as above; pay for these jobs is
   Claude's or Kyle's call later.
4. **A finished Helipad.** Nothing in the town yet moves a building's `state` to `finished` (work orders finish, but the
   building record stays `plan`). The pad is a Helipad whose state is `finished`, as `town-money.js`, `town-fire.js` and
   `town-vane.js` already read buildings. **Pick:** keep that rule; until a card joins work orders to buildings, the
   browser scenario sets the state by hand in its memory-only town.
5. **The Helipad's lock.** `town-links.js` read "Ridge fire" as "finish the first fire story" (the Everburn). It now means
   the fire on the Ridge has been reported. **Pick:** as written.
