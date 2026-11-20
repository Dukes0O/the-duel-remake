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
6. **Fuel at the fire.** The pad is about 4.3 km from the Ridge, and the first scripted flight lost the fire to two spread
   steps on every trip home for fuel. **Pick:** while the Ridge burns a fuel truck stands in a 12 m circle beside the dip
   tank and sells at the pump's price, as the lodge's crews stage fuel at Summit Run's rescues. With it the flight puts the
   fire out in 7 drops.
7. **The scrub.** The fire rules were tuned on Tremblant Woods' strip of forest; on an open slope of scrub they burn the
   Ridge out in two steps, whatever the pilot does. **Pick:** the scrub is a band two fire cells deep round the Ridge's
   shoulder (245 to 280 m from its middle), which meets the fire packet's own targets. No rule changed. Whether a band reads
   as scrub from the air is Claude's look.
8. **Old Tam's pickup has no model.** **Pick:** it is drawn as the Dusthawk Rally's model until a pickup is made (an art
   card), and the feed crate as the lesson's crate.
9. **Where a visit ends.** Leaving the Scablands goes to the main menu, as any helicopter visit does, not back to the yard or
   the town. **Pick:** leave it so for this card; going back to the town is a small follow-up in `app.returnToMenu`.
10. **The salt pan on the Ridge.** The land's region map (`src/world/scablands-regions.js`, SCABLANDS-LAND) makes the
    north-east "from the Pipe to the Ridge's foot" a salt pan (0xe9e5db), but its outline also takes in the Ridge's middle
    (4240, -3040): the dip tank, the pickup, the scrub and Old Tam's hut all stand on white salt, from the ground as from the
    air. The region is also the cars' grip and dust. **Pick:** leave the region map as it is in this card (it is the land's
    and the cars'), and suggest a small world card to pull the pan's edge back to the Ridge's foot.
