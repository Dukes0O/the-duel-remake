# POLISH-SMOKE

Status: source frozen and Director reviewed. Waiting for Claude round 1.
Native checks and build pass. Scoped draw-replacement pacing is recorded;
full-change CPU cost is not proven. Lane gate is deferred
until art approval; this is not an accepted release candidate.

## Design and implementation

Replace the translucent sphere with 25 scene-lit, soft layered puffs using
the existing smoke atlas. Their dense body prevents atlas transparency gaps;
the atlas supplies muted shading. Screen uses its native 6 m radius; Wren
uses its native 2.5 m radius (5 m diameter). Both are roughly 4 m tall and
sit on terrain. Only the final second fades visually. Hazard opacity,
lifetime, drift, targeting and damage are unchanged. Camera-inside haze is
96% grey. Existing weapon.smoke.deploy remains the sound cue.

## Checks and review

- Focused fade/haze/bounds/state-purity checks passed. They started with
  missing exports before implementation.
- Memory-only native Screen and Wren activation, High and Performance, at
  10/25 m. Fixed pose/time/camera; paired clear and smoky frames with and
  without the car; a white car-only mask supplies the denominator. Pixels
  differ visibly at >=12 RGB levels; limit remains <=10% of the silhouette.
- Chosen source so far: Screen High 6.974% at 10 m / .917% at 25 m;
  Performance 0% / .104%. All eight repeated smoky captures have zero
  differing pixels. Twelve native screenshots; zero browser warnings/errors.
  All paired rendering checks preserve race and hazard state.
- F42 rendered radius is 3.432 m, so it is fully inside Screen. Its 3.435 m
  radius at the Wren site exceeds Wren's 2.5 m: Wren rows verify native
  activation/shared appearance/haze only, not fully-inside concealment.
  Director approved this correction; the earlier 5 m-radius fixture
  expectation was wrong. No gameplay radius was changed. The unit bounds
  assertion was tightened from 5.1 m to 2.6 m accordingly.
- A stronger atlas contrast variant leaked ~21% at Screen 25 m; a dense
  inner cylinder did not improve that result. Both were removed. The final
  selected variant restores the earlier soft shading; no metric threshold
  or pixel criterion was relaxed.
- Build passed: 294 modules, 2.60 s, existing large-chunk warning only.
- Quiet frozen-pose frame comparison: native Screen and Wren, High and
  Performance, two old/candidate/old trials, 120 RAF frames per phase.
  Candidate p95 18.1-18.2 ms; maximum paired increase .275%, below 10%;
  zero >33 ms intervals across 2,880 measured frames. One active cloud.
  Legacy draw replacement shares current preparation; render-work timing
  is advisory and cannot measure the added matrix-update preparation work.
  This is not a full-change CPU-cost pass. First High Screen work p95 6.8 ms versus old 4.7/4.9;
  repeat 4.5 versus 4.4/4.4. This does not prove moving multi-cloud CPU cost.
- Director found no race-state/lifecycle blocker and accepted native Wren
  exclusion. Art concern: body reads flat brown with little puff texture.
  One 390,518-byte sheet goes to Claude; no self-directed second round.
- Director deferred broad lane gate while waiting for art approval. Fresh
  lane gate, build and actual old-source/candidate frame comparison remain
  required before merge. Source stays frozen.

## Removed

The old single-sphere Smoke Screen rendering and its material are removed.
No runtime assets were added or replaced; experimental inner volume removed.
