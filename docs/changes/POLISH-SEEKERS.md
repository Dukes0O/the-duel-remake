# POLISH-SEEKERS

Status: paired damage metric implemented and reviewed; final post-Height
report and fresh gates pending.

## 10 October balance decision

A firing is one native Rocket Pods volley activation, not each of its four
rockets. Count every firing, including misses, shields and interrupted volleys.
Sum actual armor removed, including clipping to remaining armor, only from
that volley's native blast events. The native blast emits removed/60 as its
hit strength and shares the exact hit-position object with its rocket-hit
cue; the report matches those events without changing simulation state.

Run the same thirty Medium rank-13 wave-two seeds off/on, changing only
seeker-rockets. Publish every pair, pooled armor/firing and role totals. The
pooled on value must be <=1.3 times off. The initial authorized damage is 10.
The first pre-Height matched run failed: off 80 armor / 447 firings,
on 140 / 471; ratio 1.6608280255. Both variants completed 30/30 races,
with zero unattributed damage. Player totals were 70/415 off and 100/416
on; CPU totals were 10/32 off and 40/55 on. This is provisional until
Height is included.

Kyle then authorized 8 if the final post-Height run at 10 also fails.
Director approved the conditional design before code: store damage on each
shot at launch, 8 for seeker-enabled Rocket Pods and legacy 10 off. Gunn's
aimed shots stay 10. Publish both nominal settings with actual damage and
add focused on/off/Gunn assertions. No other tuning, sample exclusions,
metric clipping or threshold change is authorized. Current source remains
at 10 pending that final run.


## Design and implementation

Nearest eligible enemy car inside 20 degrees / 120 m, with clear smoke and
scenery line. Each rocket acquires at launch, travels at 80 m/s and turns at
most 35 degrees/s in 3D. Lock loss is permanent. A real Decoy Drone within
25 m can pull it once; Mirage clones cannot. Gunn keeps his committed point.
The dev switch is seeker-rockets and Preview requests it. Damage stays 10;
Shield remains the counter. Scene-only brackets track live locks. The new
weapon.rockets.lock cue is a short two-tone synth.

## Checks

- New actual-damage counter native tests pass 10/10: four-shot denominator,
  clipped armor, misses/shields/interruption, splash, unrelated damage,
  player/CPU separation, Gunn exclusion, exact ratio and matched metadata.
  Existing balance tests pass 34/34. Director reviewed the metric source.

- Acceptance tests started red; final focused tests 17/17. Cover nearest/cone,
  walls/scrap/smoke, permanent loss, 30/60/144 Hz turn cap, 3D speed, moving
  launcher, shield, CPU, Gunn, Mirage rejection and actual drone contact burst.
- Existing focused checks: wave two 39, feature flags 74, core 598 checks,
  runtime 209 subtests, wave-two audio 21; all pass.
- Private memory-only browser: High and Performance passed, four captures,
  zero console warnings/errors. Lock tone peak .03949, RMS .005009. Shield
  armor remains 100; brackets disappear when the volley ends.
- Arsenal balance, arsenal + seeker-rockets, wave-two-only: 30/30 checks,
  20 wins, 416 player / 55 CPU rockets, no unattributed damage. Its calibrated
  hit-rate band covers Crossbow only, so no Rocket Pods target was invented.
- Latest build passed: 294 modules, 555 ms; existing large-chunk warning only.
- Initial broad lane runs exposed two historic sound-bank pins. Director
  approved excluding only weapon.rockets.lock from each legacy bank slice;
  the original hash assertions remain unchanged. Core audio 14/14 and
  wave-one audio 36/36 pass. Feature-flag count changes 16 to 17 for the new
  flag; its dev isolation assertions remain intact.
- Last lane gate: 353 passed, one failed, ten not run in 892.29 s. Failure
  was the Wasteland beta exact manifest missing the new dev flag. Director
  approved adding only seeker-rockets: dev; all existing assertions stay.
  Its focused eight tests now pass. Manifest scan found only that pin, the
  corrected feature count, and the already-passing dynamic Preview check.
- Gate replay fingerprints: all 162 unchanged. The switch-off rules path is
  retained. Director deferred another broad run while Claude's balance
  decision is pending; a fresh lane gate and build are required before merge.

## Removed

No runtime assets replaced. The switch-off rocket path stays until release;
remove it when the feature switch becomes permanent.
