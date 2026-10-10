# POLISH-SEEKERS

Status: authorized 8 implemented and source-reviewed, but the final paired
actual-damage ratio is 1.3286624204, above the unchanged 1.3 cap. Waiting for
Kyle's decision; no further tuning. Focused tests and build pass. Broad lane
gate is deferred until acceptance is settled; this is not merge-ready.

## Design and implementation

Nearest eligible enemy car inside 20 degrees / 120 m, with clear smoke and
scenery line. Each rocket acquires at launch, travels at 80 m/s and turns at
most 35 degrees/s in 3D. Lock loss is permanent. A real Decoy Drone within
25 m can pull it once; Mirage clones cannot. Gunn keeps his committed point.
The dev switch is seeker-rockets and Preview requests it. Scene-only brackets
track live locks. weapon.rockets.lock is a short two-tone synth. Shield
remains the counter.

Kyle initially authorized 10. After its failed report, he authorized 8 only
if the post-Height 10 run still failed. Director approved the design before
code: capture damage at launch, 8 for seeker-enabled Pods, 10 for flag-off
Pods and aimed Gunn shots. The post-Height run confirmed failure, so the
conditional 8 was applied. No other tuning or metric change was made.

## Matched actual-damage decision, 10 October

A firing is one native Pods volley activation, not each of its four rockets.
Every firing counts, including misses, shields and interrupted volleys. Sum
actual armor removed, including clipping to remaining armor. Native blast
strength is removed/60 and shares the exact hit-position object with the
rocket-hit cue; the observer matches those events without changing rules.
Aimed boss shots are excluded from Pods activations.

The same thirty Medium rank-13 wave-two seeds run off/on, changing only the
seeker flag. The report publishes every pair, pooled armor/firing, roles,
and explicit nominal off/on damage. No samples are excluded and the pooled
unrounded on average must be <=1.3 times off.

- Height is included through lane merge 57eb57b6 (integration 1f5da9c8).
- Pre-Height 10 and final post-Height 10 have the same result: off 80 armor /
  447 firings = .1789709172259508; on 140 / 471 = .29723991507431;
  ratio 1.6608280254777068. Final run 287.8 s.
- Authorized 8: off 80 / 447 = .1789709172259508; on 112 / 471 =
  .237791932059448; ratio 1.3286624203821655. Limit remains 1.3; allowed
  on average is .23266219239373603. Final run 271.61 s; it fails.
- At 8, player totals are off 70/415 and on 80/416; CPU off 10/32 and
  on 32/55. Each variant completes 30/30 races with zero unattributed damage.
- Director received each failure immediately. No reduction below 8,
  threshold change, sample exclusion or rounding into a pass is authorized.

## Checks and review

- Native metric tests 12/12, seeker behavior 17/17, existing balance tests
  34/34 pass. Added launch-time 8/10 capture, in-flight flag change, Gunn10
  and explicit report-setting assertions first failed, then passed. Existing
  armor/clipping/miss/shield/interruption/splash/role assertions stay intact.
- Seeker tests cover nearest/cone, walls/scrap/smoke, permanent loss,
  30/60/144 Hz turn cap, 3D speed, moving launcher, shield, CPU, Gunn,
  Mirage rejection and native drone contact burst.
- Prior native browser: High/Performance pass, four captures, zero warnings
  or errors. Lock tone peak .03949/RMS .005009, shield armor stays100 and
  brackets disappear when the volley ends. Damage-only tuning does not
  change these presentation paths.
- Current build: 295 modules, 846 ms, existing large-chunk warning only.
  Director reviewed the metric source and authorized8 diff; both are clear.
- Earlier broad lane gate: 353 passed, one failed, ten unrun in 892.29 s.
  Its exact beta-manifest pin lacked seeker-rockets:dev. Director approved
  that addition; the focused eight tests passed. Two historic audio-bank
  slices now exclude only weapon.rockets.lock, preserving original hashes;
  core audio14/14 and wave-one audio36/36 passed. Flag count16 to17 adds the
  new dev switch while preserving isolation assertions. No assertion was
  weakened. All 162 replay fingerprints were unchanged before Height.
- Those earlier gate results are not a current-source pass. Fresh lane
  gate and build are required after the remaining acceptance decision.

## Removed

No runtime assets replaced. The switch-off rocket path stays until release;
remove it when the feature switch becomes permanent. The old report-only
hit-rate gap is replaced by the explicit actual-armor-per-firing metric.
