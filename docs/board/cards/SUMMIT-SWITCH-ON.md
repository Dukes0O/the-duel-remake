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


## Read-only diagnosis before the daylight lane, Codex 15 October 01:27 PT

The current source confirms a wrongly applied closed-lap premise at tools/test-circuits.mjs:29-34. It unconditionally compares worldAt(s,4) with worldAt(s+length,4) and requires nearest to retain a lap offset. Summit explicitly has closed:false; Course.phase clamps an open route to[0,length] instead of wrapping. At s=-25 those calls refer to the start and near the finish, not opposite sides of a start seam. This establishes why that assertion is invalid for the open route; it does not certify the actual start surface, endpoint projection or a repaired suite.

The future fix should preserve that exact loop and its tolerances for closed courses, and add meaningful open-route endpoint/clamping and in-range nearest checks instead. Retain all shared grade, road-clearance, ground-continuity and obstacle checks. Explain the assertion change in the card's change note and independent review. No Course/world geometry change is justified by this source finding. Any actual open-route failure gets its own bounded diagnosis, not a waived assertion.

No lane/claim/code/test or switch-on was started: Claude's daylight preparation scope and Kyle's merged-folder cleanup rule still apply. Before implementation name this card's concrete owned files, release/switch and world-signature hooks; preserve Tremblant Snow's released scene and every other baseline. Final art acceptance permits the specified Summit-only snow signature change, not arbitrary fixture updates. Summit and Yeti remain dev on integration, and no release pass is claimed.

## Daylight lane claim and concrete ownership

Kyle directed continued building. Root opens summit-switch-on/codex/summit-switch-on from a0dd1971 for this approved preparation only, holding release and world-signatures. Owns Summit manifest state and Summit-only snowWorld.always in src/circuits/summit-run.js; only yeti state in src/feature-flags.js; exact state pins in tools/test-feature-flags.mjs and tools/test-circuit-summit.mjs; the closed/open branch in tools/test-circuits.mjs preserving the exact closed loop and every shared assertion; course-owned tools/fixtures/world-signatures/summit-run.json for the reviewed Summit snowy scene and identical-scene Attack child key; own docs/changes/SUMMIT-SWITCH-ON.md. Attack already inherits parent state/descriptor, no child runtime edit is needed. The current world guard counts enabled baseline coverage dynamically; no weakening/count skip. Capture only actual inherited snowy scene signatures; no other baseline or Tremblant Snow edit. Add meaningful open clamping/endpoint/nearest checks and keep all grade/ground/obstacle/clearance assertions. A real open-route failure gets at most30minutes diagnosis, no waiver. Claude retains release checks/install/push. No live release, preview install, or full-tier claim.
