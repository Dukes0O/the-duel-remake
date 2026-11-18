Part A, finding 7: lamps light after two continuous seconds within 3.5 m, including while walking.
The screen reads the rule timer for its progress bar, names the circle and shows precise nearby distances.
One soft additive amber ring per dark lamp; its shared geometry and material are disposed with the lamps.
Cues: existing `world.brand.catch` on lighting; new quiet rising `world.lamp.lighting` hiss during progress.
Checks on the lamp commit: job2, world-hud, combat-hud, scablands-scene and audio pass. P4 audio passes.
Changed assertions, for Claude to review: listed on the card (radius, walking, distance formatting, historical bank projection).
For Claude to run: browser `everburn-job2`, then the job by hand with sound.
Removed: `standingSpeed`, its speed gate and ?Hold still to light the lamp.?
Finding 1 measured before cure: `audio.js` engine targets (now 1430 onward) were identical at 0 / 30 m; coast main .190739, exhaust .012017.
Engine distance check now covers every idle/load/coast/fallback main, exhaust and intake target, plus silent parked tyres and wind.
