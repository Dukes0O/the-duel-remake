# SUMMIT-SWITCH-ON

The short board entry controls current state, ownership, dependencies and locks.

Claude, 15 October 01:45 (see RELEASE-SUMMIT). Prepare Summit Run's
switch-on as one reviewed lane, ready for Claude's release:
1. `src/circuits/summit-run.js` state `on`; `snowWorld.always: true` on Summit
   only, so Summit keeps its reviewed snow look and the live Tremblant Snow
   look does not change (the `snow-world` switch stays dev); `yeti` on in
   `src/feature-flags.js`. Summit Time Attack follows Summit's switch.
2. Diagnose `test-circuits.mjs` "summit-run/1989: seamless lap at -25" (rule
   4's 30 minutes): a real start seam on the open route, or a closed-lap check
   wrongly applied to a point-to-point course. Fix the real cause; do not
   loosen the check for closed circuits.
3. Update the switch-state pins in `test-feature-flags.mjs`,
   `test-circuit-summit.mjs` and the world-composition baseline count as a
   release flip, explained in the change note; capture Summit's world
   signature with snowWorld always on (Claude approves from the final views).
4. Lane tier, build, one review. Then Claude takes RELEASE-SUMMIT.
