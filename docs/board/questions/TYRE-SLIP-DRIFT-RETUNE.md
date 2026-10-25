# TYRE-SLIP-DRIFT-RETUNE: questions (cloud session; carried on with the recommended pick)

1. **The cause.** Not the drift thresholds. The gentle launch (`DRIVE.accelScale` 5.2 to 2.5) leaves the scripted
   drifter 10 to 15 mph slower coming out of the first corner, and the sliding-tyre line only holds above about 100 mph
   there: slower, the same drift steering turns the car tighter than the road needs, it runs wide off the narrowing
   road (half-width 10.5 m to 7 m), and every chain is lost off-road (`offroad`) before it banks. Putting `accelScale`
   back to 5.2 alone restores the old score (4,828) exactly, so the launch is the whole difference. I also swept
   `driftLineSkill`, `driftMinMph`, `scrubMphPerSec`, `driftLiftSlip` and the driver's brake law: nothing got above about
   2,600 points, none held all three levels' time limits (Hard's 110 s), and the landscape is chaotic (one change
   scored 4,684 and a nearby one 3,041).
2. **The fix taken: the Neon Drift Trial keeps the old quick launch under the sliding-tyre rules**, the way arenas
   already do (`TYRE_SLIP.driftTrialAccelScale` 5.2, used by `launchScale` only when the rules are latched on the
   `drift` course, and by the scripted driver's speed profile). With the switch off, on any other course, on arenas and in
   crash recovery nothing changes: `DRIVE` stays byte for byte (its pin in `test-tyre-slip` holds) and the trial's
   released results are untouched. The fixture in `test-drift-trial` then passes with **no assertion changed**: 4,828
   points, 97.6 s, all three levels, exactly as recorded. Recommended: keep.
3. **Kyle's question ("does Pro tyre grip ship with the launch change?").** This answers it without touching Pro tyre
   grip: the rules stay a dev switch (`tyre-slip`), and when they are on the trial launches as it was tuned. If Kyle would
   rather the trial feel the gentle launch under the new tyres too, that is a retune of the driver and thresholds
   (not found in the 30-minute budget) and the trial's score and time targets would need rebalancing on the gentle launch.
