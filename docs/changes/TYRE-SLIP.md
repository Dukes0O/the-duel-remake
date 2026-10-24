# TYRE-SLIP

Status: building in thin source slices, behind no runtime caller yet. This is not a completed playable feature or merge candidate.

## Pure grip foundation

Config now contains the independently reviewed constants and pure grip/scrub, braking peak/demand, exponential slip, drawn-angle, tyre-loop input and steerForYaw helpers. DRIVE and the complete released steeringYawAuthority function remain byte-identical. The helper's switch-off and all arena inputs reproduce existing steering; switch-on automatic steering asks for at most the braking-adjusted peak. No simulation, keyboard, audio, save, flag or driver call site changes yet.

The new tests were written first and failed for the missing exports. They check literal reviewed Casual/Pro values, the shared low-speed steering grip, fixed demand sensitivity under braking, full-lock/snow examples, exact exponential partition independence, drawn-angle/sound bounds, legacy steering over a speed/grip/traction/car grid and the on-rule peak ceiling. The exponential formula gives1.24690156 at0.5s from0 toward1.25; this follows the settled12/s rate and satisfies the reviewed1percent requirement. It does not substitute a different rate for the card's approximate illustration.

## Still required

Per-race dev flag and state/reset wiring; keyboard mapping against the current STEER-055 table; simulation/scrub and independent audio input; every named driver-helper copy; actual drift retune and versioned rows; arena/CPU/off parity, replay pins and all existing macro acceptance. Final nearby/jobs4, build and independent code/save review precede any merge. No live/preview install, old pin regeneration or new sound cue.

## Removed

Nothing. The feature remains uninstalled; the future approved switch-on release owns removal of legacy branches as the card states.

## Keyboard adapter slice

The existing adapter accepts an optional per-update latched-rule object. The approved STEER-055 ramp is still averaged before its speed ceiling; enabled road inputs then scale by old authority/new demand gain. All fixed-speed taps and held yaw match the current curve within1e-9 and the recomputed raw caps match the card. Below40mph and every arena identity retain exact old output. Throttle is untouched. The App does not pass the option yet: actual per-race wiring and changing-speed simulation acceptance remain pending.

## Player simulation slice

The dev switch now snapshots once per campaign start and installs its latched boolean only on road stages; every venue/arena is excluded. Actual player driving applies reviewed demand, braking peak, grip falloff, slip drawing and grounded road/gravel scrub. Reverse/airborne tyres shed slip and retain the old yaw path; parked on-foot cars retain old yaw. Existing player stage/crash/actor/journey/on-foot reset sites clear slip without adding fields to CPUs. An actual pre-edit2400step named-state fingerprint protects released driving. Driver/UI/audio wiring and full integration acceptance remain pending; this lane is not merged or release-ready.

## App and tyre-loop wiring slice

Actual App keyboard input passes the latched rules only for a grounded forward-moving car. Stock automatic steering and the one-time shoulder swerve now use steerForYaw with their original authority arguments; brake is computed first. New rules cap the stock driver at the braking-adjusted peak. Drift-specific intentional sliding/retune and remaining named tool/test driver copies are still pending. The audio loop reads a new independent tyreSlipSmoothed input with unchanged gain/pitch/filter/response mappings; legacy smoothedSlip continues to feed road and gravel. Actual existing audio-graph cases were added first and reproduced unwanted squeal at zero real slip before the fix. No new audio harness, cue, recording or mix limit.

The new audio case initially expected legacy smoothedSlip near1 while its chosen old cosmetic input only produces roughly0.77. Its input is now a valid hard-braking legacy angle0.31 (below the old0.336 maximum), which saturates that old channel as intended. The >0.99 independent-channel assertion and every gain tolerance remain unchanged; this strengthens the fixture contrast instead of relaxing a failing assertion.

## Independent early review correction

Reviewer found that the new squeal input reused the shared slip local, so road scrub, its filter and gravel also changed despite the independent legacy state. Added actual paired graph-gain/filter comparisons first; they failed on road gain. Kept legacy slip local for these layers and introduced a separate tyreLoopSlip only for squeal. Every old assertion and new gain tolerance remains unchanged. Full driver/drift/save/macro acceptance is still pending.

## Driver copies and intentional drift slice

All named stock steering copies now call the production steerForYaw helper after computing their actual brake. Each retains its original grip/traction/car argument list (including callers that omitted car), and disabled/airborne/reverse paths use old authority. The two existing GP browser recipes receive the actual helper dependencies, including exported clamp, without copied math. The line/field/reference tools accept the named tyre switch, combat flag validation includes it, and CLI switch-on references require probe so existing published laps cannot be overwritten. Actual line/balance wrapper peak checks and native flag pass-through tests failed first and now pass. Existing reference343checks and combat-tool34checks passed.

The native drift App now requests the settled ask1.12 above45mph in actual corners and uses amended corner factor1.058; a real Neon driver-input case failed first and now passes. This is the specified candidate, not a successful retune: actual five-seed/two-frame-rate/Casual-Pro/three-level measurement, recovery, saved result versions and all final macros remain pending. No targets, deadlines or old records have changed.

## Bounded drift stop — source050b76fe

Initial actual Hard/Pro30fps probe ran both rules for seeds1989..1993 through native App/Duel, memory-only, existing deadlines/scoring unchanged. Off: five clean two-lap wins, each6417points/98.61s. On: scores240/318/85/104/247, one lap each,2–3crashes, all timeout; median240/6417=0.03740065, below the card0.6 stop rule. Measurement took8.33s; other dimensions and retune are unrun. No new targets/deadlines adopted, no record-version changes, no final gate/merge. Retained evidence drift-initial.json. Recipe: withReferenceApp; actual startCampaign Neon/Banshee/Hard/Pro/seed; featureFlags tyre-slip false/true before start; autopilot true/scripted shoulder disabled; advance1/30 until native result or250s.

Reviewer also identified the design boundary: requested ask1.12 above45mph is unreachable under the approved steering ceiling below about55.7mph; at50mph maximum is1.00584. Added actual46/50/65mph saturation cases without increasing authority or relaxing a target. Need Claude to settle drift line/speed control and this low-speed boundary within the unchanged grip/scoring contract before continuing. Lane is held clean and unmerged; other cards continue.


## Approved slip-hold follow-up

Claude16:00 replaces the failed corner-factor plan with the native clean racing path/speed at0.95, holds ask1.12 near the line above56mph, lifts throttle beyond1.20 actual slip and recovers cleanly beyond2m lateral error. Neon lacks an authored line, so existing production racingLineFor/buildSpeedProfile supply it; no CPU/profile source changes. Off-state and non-drift App paths retain their former calculations. New native controller tests were appended without removing any original byte: both failed on the old controller (17pass/2fail). The one earlier low-speed forced-drift assertion is explicitly superseded by Claude's clean-line-below56 decision: keep actual46/50/65 authority capacity checks, assert held ask at65, and add exact clean-line control at46/50 plus error recovery. No numeric authority, scoring, deadline or target weakened. Removed: the superseded driftCornerFactor1.058 branch. Initial five-seed stop rule still precedes any retune or full macro acceptance.


## Kyle: Casual keeps released tyres

After the explicit15October decision, the native start latch resolves the actual difficulty first and enables the new model only outside Casual. The new exact Casual-off case failed first. All later keyboard/player/autopilot/audio readers already use the latched state; no grip/scoring/controller number changes. Original model-on fixtures now explicitly select Pro with the same numeric assertions. The default balance tool still runs Casual: its unchanged requested flag is separately asserted true while active rules are now correctly false. New full-state transcript comparisons cover actual Casual road and Neon input streams on/off. No repeated120race matrix, retuned target/deadline or live switch. Current integration merged cleanly first; all other source preserved. Remaining recovery/version/macro acceptance and final gate/build/review pending.

Off-state historical fingerprint fixture retains its exact original default difficulty and hash. A broad fixture edit briefly selected Pro there; caught by diff inspection and restored before running that pin, with no hash regeneration. Only the intended model-on fixtures select Pro.


## Optional Pro drift record version

Two new cases failed first: new Pro results shared old personal-best/leaderboard identity, and native objectives emitted no version. Only actual latched Pro drift now emits optional tyreSlipRules:true; App derives that field from the real current state. New drift best/row keys discriminate the model, while all ordinary and Casual keys stay exact. Existing rows are retained and labelled STANDARD TYRES versus SLIDING TYRES; menu score/time comparisons select current rules. Old targets, deadlines, score validation and layout/driver/finish guards stay unchanged. No ghost key/store/budget or save schema version changes, no historical row deleted. New true-tag Casual/ordinary finish records are rejected. Independent save/code review and native acceptance pending.


## Approved one-crash recovery acceptance

Claude d807c0e2 accepts completed Medium/Hard misses under the new Pro tyres, retaining two laps, exactly one crash, the 8-second cost, no reset and no catastrophic state. The single actual native packet on61e7de00 is retained in integration: all three levels score4828, Easy wins, Medium/Hard complete below their unchanged5000/6000 targets. Its original outcome verdict remains failed; no manual rerun or120-race repeat. Added only new Pro cases to the existing drift suite, keeping every old/off assertion byte-for-byte. These cases enforce the actual latched rules, earned pre-crash chain, both laps, physical guards, deterministic score and all original targets/deadlines. Execution and independent confirmation remain pending behind the Ardennes release hold.


## Remaining switch-on replay pins

Added the card-required three-event fixed-step replay assertion in the existing tyre suite, using the unchanged historical recorded inputs and explicit Pro rules. It hashes every actual native step including new slip and rival state across30/60/144FPS, three runs each. The new owned fixture has not been recorded: missing-file RED first, then actual native fingerprint publication awaits heavy admission. No historical pin or input changed, no repeat120-race drift matrix, no claim of completed replay acceptance. The approved recovery append cf1ba22a received independent CLEAR; execution remains queued.


## Arena and CPU parity assertions

Added native full-state requested-on/off comparisons for every real arena definition using explicit Pro, and sixty-second actual Duel-rival/seven-opponent Grand Prix transcripts with a neutral player. These enforce the existing exclusion/CPU acceptance without re-recording any old pin or changing runtime. Source-only until the release hold clears; no pass is claimed.


A bounded177.4907ms actual _drive comparison now checks the reviewed Pro full-slide0.82 yaw share and exact14/120mph step loss against a matched below-peak native car. It passes with real road/gear state, not a mocked physics helper. No game source or number changed; remaining replay/CPU/native macro and final gates remain queued.


Independent test review found the arena loop covered only circuit entries; Scrapdome venues are deliberately outside COURSE. Added a separate real startArenaEvent/Scrapdome Pro transcript after a native road-rule latch, retaining the Titan/circuit tests. It checks loader refusal of the new road rules, actual fight motion/clock and entire state parity. This is a real coverage repair; reviewer confirmation and execution remain pending until the alone release tier drains. No production file or old assertion changed.


## Actual new Pro replay fixture

The prepared native recorder ran once on clean b1edcddb in2332.8488ms and wrote only tools/replays/tyre-slip.json. Historical recorded-inputs.json remains byte-exact SHA256babb20463ec3f2cad21485be313d78d95f44a6e0e026d3ecfe162eee79bfa235; no old pin was overwritten. Actual new cases: Pacific f6c550aadac6bd8817a2f1036ec263b6c5c6925a8f48ebfeac7379d58f55a4f3; Harbour and Tremblant Snow each09c796063df077ca02a6204eaca9141c844594f2c08da2fa82be87f741abbfe0. Those are actual fixed-step player/rival fingerprints; equality of two event hashes is retained honestly. The fixture source field names the recorded source. Its30/60/144FPS stability and new Pro recovery/real arena/CPU parity assertions remain for the one final canonical gate; no extra matrix or passing old test was repeated. Native receipt is lane .evidence/2026-10-15/TYRE-SLIP/pins-b1edcddb/receipt.json.


## Final gate and bounded driver fix

Actual de0371dd lane383/394/jobs4/11failed/0unrun/1567231.7507ms; no build or merge. New28/28tyre replay/FPS/CPU/real-arena cases and all3Pro drift-recovery cases passed in that gate. Other old whole-state hash/dev-registry/preview failures are on the card, awaiting exact Claude scope/assertion answer. No old fixture or expectation changed.

The already owned stunt driver copy called steerForYaw without importing it. Added only that existing config import: actual existing test-stunt-trial now44checks PASS, including both Casual/Pro30/144FPS native runs. No numeric assertion/controller/runtime change. Original failed gate remains failed; do not repeat its passing acceptance as a separate manual batch. Remaining card fix, required delta review and changed-source canonical/build still pending.


## Claude-approved inactive state compatibility

Claude821b829f chose exact historical state shape instead of projecting old hash tests. Only active Pro road races attach tyreSlipRules:true and tyreSlip. Constructor, Casual/off race loads and arena loads omit both; existing owned pit/crash/on-foot/hidden-road/Deep resets clear only a field already present. Existing readers already treat missing telemetry as zero/false. No simulation formula, target, old pin, six historical hash test or serializer changed. New ownership/active-to-Casual/arena regression failed on the old constructor, then passed after the fix (235.2278ms); its arena fixture uses the existing supported opponent entry.

Changed assertions: only this card new tyre tests now require absent inactive fields (stronger exact-shape guard), instead of explicit false, following Claude written state-shape decision. Active true/zero assertions remain. Exact catalog inventories add tyre-slip dev/count+1 and the private preview list adds tyre-slip, as Claude approved. Course-kit copies the actual existing catalog test, no separate duplicated hook edit needed. Original failed canonical remains historical; new changed-source canonical will run the six old suites unchanged and the affected reset/reader coverage. Required independent delta review, gate/build pending; old macro/recovery/pin captures are not repeated manually.

Current integration union resolves actual App import/payload conflicts by keeping racing-line helpers, Intel imports and both exact tyre/Intel result fields. Reference worker/set/CLI conflicts keep both explicit tyre flags/probe-only publication guard and Intel retainPoses/poses-only behavior; no reference is regenerated. Automatically merged Coach/TeamRoom source and all current generated poses retained. Required delta review and gate cover this union.


## Corrected canonical verdict and one missed new assertion

Actual corrected3e2bf73f canonical completed16October17:13:43UTC:395/396,
jobs4, zero notRun, exit1,3562173.9613ms. Source stayed clean/unchanged;
wrapper38356 and runner7204 drained. This FAILED packet remains retained in
.evidence/2026-10-16/TYRE-SLIP/canonical-resume-3e2bf73f. The sole failed
suite was test-tyre-slip,28/29 passing: its new private field-tool case still
expected explicit tyreSlipRules:false, although Claude821b829f required
byte-identical inactive states with neither field. All six old whole-state
suites, the other395 suites and prior physical/native acceptances remain
unchanged/passed; no runtime or pin repair is needed.

Changed only that card's new assertion: the actual Casual field-tool state
must own NEITHER tyreSlip nor tyreSlipRules, rather than merely reading
false. The requested flag must still be true, the actual Pro line-tool
latch must still be true, and every old hash/crash/recording stays exact.
This is the same written byte-identical-state decision as73461d90, correcting
one missed own test, not relaxing a numeric or historical assertion. Both
keys are checked explicitly, so an undefined-valued property is rejected.
No native rerun/build executed for this edit; required delta review and the
changed-file canonical remain pending. Do not repeat395 unchanged passes.

The existing canonical CLI has no --base/--since option: changedFiles uses
the integration merge base. Root will select the actual two-file commit
delta through the existing exported main/getChanges API, retaining the real
lane graph, smoke/replay guards, jobs4 and default native runner; no new
framework or rewritten ref. Preserve the original failed packet separately.


## Reviewed test delta and current integration union

The strict absent-key correction13f09aa4 received independent CLEAR. Its actual
canonical changed-only lane used the existing main/getChanges API with the real
gitdiff3e2..13f paths, default affected graph and smoke/replay/world guards:
17/17PASS, jobs4, zero failed/notRun, exit0,289681.3877ms, source unchanged.
One production build on13f passed in1733.278ms. Original395/396 failure remains
failed; no unchanged396-suite batch was repeated.

Integration075a28c adds reviewed Rescue/skins/wildlife and TeamRoom changes.
The union had only two actual conflicts: start-preview.bat retains rescue,
wildlife,heli-skins and tyre-slip; test-feature-flags retains every foreign
row and exact base32 count including tyre-slip. Feature catalog and Wasteland
inventory merged automatically. No runtime, save, physics, old hash or replay
pin is changed by these conflict resolutions. Required independent union
review and one canonical lane for these two actual conflict hooks, followed
by one build, remain pending before integration merge. Current foreign source
keeps its own existing passing evidence; it is not rerun wholesale.


## Final development merge verdict

Independent union code/save review CLEAR on cb1840e5. Its actual two-conflict-hook
canonical passed19/19/jobs4/zero fail-notRun/exit0 in462405.8415ms, ended18:00:44UTC;
source unchanged. One production build on the same exact clean source passed
2140.9512ms. Integration075a28c merged this green union without conflict, so no
check was repeated after merge. The original3e2 gate remains395/396FAILED; its
strict new-test correction13f separately passed the17-suite canonical delta
and build described above. Every old hash, recording, number and foreign
save behavior is retained. No live enable, push or new full-tier claim.

All own gates/builds are drained. Retain the older Tyre lane and evidence
because its creation/cleanup ownership is unproved. No rollback or archive
copy was created; the one-use replay recorder was already recycled.
