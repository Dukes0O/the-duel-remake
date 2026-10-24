# LAB-HELI-CHALLENGES: questions for Claude

I carried on with the recommended pick in each case. Say if any should change.

**1. Where the challenge places go.** Every spot is picked from the home course's own flying area and the seed, so the same save gives the same challenge: three buoys on the home lake at least 80 m apart and 80 m from the scoop spot; the Pendulum target about 500 m from the pad; the Headings smoke marker at exactly 70 degrees and 550 m from the pad; the Fire practice grid (9 by 5 cells of the fire's own 20 m cells) beside the pad, away from the road. Recommended: keep. The numbers are in `CHALLENGE_RULES` at the top of `src/lab/lab-challenges.js`.

**2. How fast the practice fire spreads.** The card says "if it hasn't reached the road after 3 minutes". The game's fire spreads too quickly for that on its own pace (an unattended practice fire reached the road in 64 s at the real mission rate of one spread step every 8 s). I set the practice fire to spread one step every 20 s: left alone it reaches the road in about 160 s (fails), a water drop every 20 s or a retardant line across its path holds it past 180 s (passes). The mission fire's own timing is untouched. Recommended: keep 20 s.

**3. The 30% fuel rule for Air and altitude.** Carrying the 300 kg crate to Summit Run efficiently (high cruise, long glide, set down) ends with about 37% of the tank; dawdling 110 s at the pad ends below 30% and sends the pilot back. So 30% is fair but not generous. Recommended: keep 30% as the card says.

**4. Lift measures the load's height, not the helicopter's.** "Hover 10 s at 2 to 5 m over the pad" is checked as the Dusthawk's height above the ground (2 to 5 m) with the helicopter within 6 m of the pad's centre, held for 10 s in a row; any break starts the count again. Needs a full tank first, and the board says "Fill the tank first." Recommended: keep.

**5. Headings hides the arrow.** During the Headings try the view reports no destination (so the arrow does not draw) and the autopilot refuses, as the card asks. The pilot map and compass still work.

**6. Sound cue.** `heli.buoy-hit` is emitted as a `cue` event when a buoy is hit. I did not register or make the sound; that is for LAB-RADIO.

**7. Screens.** The board's "Try the challenge" button and the pad menu are not drawn here (LAB-VIEW). The session offers `challengeBoard()`, `startChallenge(id)` and `stopChallenge()`, and `view().challenge` (`{id, elapsed, briefing, props}`) while one is active; `props` lists the buoys, the marker, the crate and the fire grid for the scene to draw.

**8. Files outside the card's five.** `src/lab/lab-heli.js` re-exports the challenge API and gained `passLabChallenge`, `labChallengesDone` and `labChallengeOpen`, because `src/heli/` may import the Lab only through that file. `tools/test-heli-mode.mjs` gained one entry in its approved-importer list for `src/lab/lab-challenges.js`, which deliberately reads the helicopter's rule files (the same kind of entry LAB-BENCHES added). No assertion was changed.
