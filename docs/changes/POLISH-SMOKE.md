# POLISH-SMOKE

Status: Claude approved round 2 on 10 October, as relayed by Kyle.
Native and actual-source frame verdicts are accepted. Approved art is unchanged.
Integration ac01cbe6 is synced; fresh lane and build pass. Ready for merge.

## Design and implementation

Round 1 replaced the translucent sphere with dense scene-lit atlas puffs.
Claude requested grey smoke, overlapping varied puffs, soft broken edges,
light tops/dark undersides, and drift/churn for round 2 on 10 October.

The settled round 2 design keeps the dense interior, adds seven small wisps
and varied upper sizes (32 bounded instances), neutral grey lighting, soft
irregular edges, and slow deterministic visual churn from native cloud age.
The lower ring keeps its proven coverage. Director requested stronger
contrast within this round; the final grey response preserves lighter tops
and darker undersides under the strong scene light. Puffs sort back-to-front for each
camera before GPU upload through the scene pre-render hook.
Unsorted transparent instances exposed a bright car-shaped ghost
because the hidden car rejected rear puffs through depth testing.
The per-camera hook also updates the inside-haze world matrix for main
and rear views. Focused tests cover opposite camera directions.

Screen uses its native 6 m radius; Wren uses its native 2.5 m radius (5 m
diameter). Both are about 4 m tall and sit on terrain. Only the final second
fades visually. Camera-inside haze is 96% neutral grey. Hazard opacity,
lifetime, drift, targeting, damage and weapon.smoke.deploy stay unchanged.

## Checks and review

- Focused fade/haze/bounds/state-purity checks pass, including age-driven
  matrix changes with no hazard mutation. Original checks started red.
- Native Screen and Wren activation in memory-only High and Performance,
  at 10/25 m: twelve screenshots, zero browser warnings/errors. Rendering
  preserves race/hazard state; all eight repeated frames match exactly.
- Screen visible pixels: High 7.779% / 2.460%, Performance .886% / 2.127%
  at 10/25 m. The unchanged limit is <=10%; round 1 worst was 6.974%.
- Controls keep pose/time/camera fixed. Car-present/absent clear/smoky
  frames use a white car-only silhouette denominator. A >=12 RGB-level
  change counts as visible. No threshold or denominator was relaxed.
- F42 rendered radius is 3.432 m at Screen / 3.435 m at Wren. It fits Screen,
  but not Wren's native 2.5 m. Director approved Wren as same-look/native
  activation/haze evidence only; its 74-80% visible rows are not a claim
  of fully-inside concealment. The earlier 5 m-radius fixture was wrong;
  its bounds assertion was tightened to 2.6 m. Gameplay radius is unchanged.
- Initial round 2 sizing/edge attempts leaked up to 35.51% at 25 m. Restoring
  coverage alone was insufficient. Correct transparent-instance sorting
  resolved the ghost without hiding the car or changing the test.
- Build passed: 294 modules, 517 ms, existing large-chunk warning only.
- One round 2 comparison sheet is 393,910 bytes. Claude approved round 2.
- Actual pre-Smoke source (3af7f15c) versus candidate, run alone in the
  Director's quiet window. Native simulation, moving camera, one active
  cloud, 60 warm-up / 180 measured RAF frames per kind/quality. No draw or
  material substitution; all state-purity checks and both browsers pass.
- Old/candidate p95 ms: High Screen 33.4/33.4, High Wren 33.3/33.4,
  Performance Screen 16.8/16.9, Performance Wren 16.8/16.8. Maximum increase
  .595%, below 10%. Whole preparation/render work p95: 11.9/11.6, 10.9/11.1,
  7.0/7.4, 6.9/7.2 ms; maximum +5.714%, also below 10%. Inspection draws
  run alongside native RAF, so High is a stressed paired sample; old/new
  >33 ms counts are 42/39 and 31/38, with zero in Performance.
- Fresh lane after the fixture fix: 367 passed, zero failed or unrun, 827.33 s.
  All 162 replay fingerprints pass across 18 cases, 16 events, eight categories,
  three FPS values and three runs. Fresh build passed in 538 ms; existing
  large-chunk warning only. Evidence: POLISH-SMOKE/lane-approved-sync-fixed.log
  and build-approved-sync.log under integration's dated .evidence folder.
  No simulation files or assets changed by Smoke.

- Integration ac01cbe6 synced without conflicts; independent source review
  confirms Seeker locks and Smoke camera preparation remain intact.
- The first fresh lane found one genuine fixture failure in
  test-arsenal-runtime: its presentation check stopped after view.update,
  before the production scene's camera preparation initialized the puff
  instances. Director approved the narrow test hook. The fixture now uses
  a real THREE camera and prepareSmokeCamera after each update. Both Oil
  and Smoke pass all 22 original checks; all 209 arsenal-runtime tests pass.
  Director independently reviewed and approved this fixture correction.
  No assertion, tolerance, runtime code or approved art changed.
## Removed

The old single-sphere Smoke Screen rendering and material are removed.
The obsolete draw-replacement pacing path is removed. A focused red/pass
lifecycle regression verifies removal of the instance-buffer leak: teardown
now disposes the InstancedMesh as well as its geometry and material. No runtime assets
were added or replaced. Failed sizing variants and the experimental inner
volume are removed. Round 1 review is retained only as the first art round.
