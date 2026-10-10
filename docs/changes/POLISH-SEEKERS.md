# POLISH-SEEKERS

Status: Kyle explicitly accepted the measured 1.3286624204 ratio at 8 damage
on 10 October and authorized merge as an exception to the original 1.3 target.
Source f0989887 is unchanged. Fresh lane gate and build pass; ready for the
authorized integration merge. The metric still honestly reports that the
original target is exceeded. No release or live-folder change was performed.

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
- Director received each failure immediately. Kyle then replied: "it's fine.
  just accept that amount and it can merge. update whatever documentation
  to note to Claude the change and that I accepted it."
- Decision for Claude: keep 8 and accept the measured 1.3286624203821655
  ratio as Kyle's explicit exception to 1.3. No reduction to 7.8 was made.
  No metric threshold, sample, assertion or rounding rule changed; the
  original-target check remains failed, with this separate accepted exception.

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
- Current build: 295 modules, 516 ms, existing large-chunk warning only.
  Director reviewed the metric source and authorized8 diff; both are clear.
- Fresh accepted-source lane: 366 passed, zero failed/unrun in 599.22 s.
  All 162 replay fingerprint checks pass across 18 cases, 16 events,
  eight categories, three FPS values and three runs.
- Reviewed assertion changes remain narrow: exact beta manifest adds only
  seeker-rockets:dev; flag count16 to17 adds that dev switch and preserves
  isolation assertions. Two historic audio-bank slices exclude only the
  new weapon.rockets.lock cue, preserving their original hash assertions.
  These checks now pass in the full lane run; no assertion was weakened.
- No full tier was run in this lane. Director folds this approval/evidence
  note into the actual integration merge; no results-only commit is needed.

## Removed

No runtime assets replaced. The switch-off rocket path stays until release;
remove it when the feature switch becomes permanent. The old report-only
hit-rate gap is replaced by the explicit actual-armor-per-firing metric.
