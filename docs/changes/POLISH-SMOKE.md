# POLISH-SMOKE

Status: source frozen for shared-hook handoff. Review, lane gate, frame check
and Claude round 1 are pending; this is not an accepted release candidate.

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
  repeated smoky captures have zero differing pixels. Full eight rows are
  being collected and kept in the ignored browser evidence.
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
- Required lane gate/build, frame pacing, and Claude's art verdict pending.
  Shared source is frozen so the next serial card can proceed.

## Removed

The old single-sphere Smoke Screen rendering and its material are removed.
No runtime assets were added or replaced; experimental inner volume removed.
