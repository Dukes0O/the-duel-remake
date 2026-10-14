# FIX-DRIVING-FEEL

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

## Kyle, playing (13 October 2026)

"The steering is a bit too sensitive. One key stroke sends the car too far,
making key strokes hard to control. Harbour Lights is particularly difficult
... so hard that Gratian won't play it." And: "The vehicles accelerate a bit
too quickly ... after a crash, that's normally when you've lost control, then
you end up going too fast too quickly and losing control again."

## Settled design (Claude)

This shapes the player's keyboard input only. The car model, computer racers,
gamepad axis and every physics constant stay as they are, so field pace,
records and combat balance are unchanged.

- **Steering keys** (`src/keyboard-steering.js`):
  - A tap starts at 30% steering, not 78%.
  - Holding the key reaches full steering over 0.45 s, not 0.2 s.
  - The most the keys can steer falls with speed: full up to 40 mph, falling
    in a straight line to 60% at 120 mph and above.
  - Letting go still centres at once.
- **Throttle key:**
  - It rises from 0 to full over 0.6 s instead of jumping. Releasing is
    instant, and braking is unchanged.
- **Arenas keep today's sharp steering** (Kyle, 13 October 2026: "in the
  Scrapdome we do need sensitive steering"). In the Scrapdome and every other
  combat arena (`course.def.venue === true && course.def.arena === true`,
  the test `steeringYawAuthority` already uses), keyboard steering and
  throttle stay exactly as they are today.
- **No after-crash throttle limit and no "STEADY" message** (Kyle, 13
  October 2026: "that's just annoying").
- Applies to road races only (Duel, Grand Prix, Time Trial and the circuits),
  not to arenas or on foot.

## Acceptance

- Unit tests for each curve:
  - tap value, hold time to full, speed limit at 40, 80 and 120 mph;
  - throttle ramp;
  - instant release.
- Gamepad steering and throttle are unchanged, and computer racers are
  unchanged. Arena keyboard steering and throttle are byte-identical to today
  (test on the Scrapdome).
- Replays of recorded inputs reproduce. Fingerprints of recorded CPU-only
  races are unchanged.
- The track review of Harbour Lights with the stock autopilot is unchanged
  (the autopilot does not use keys). One drive-through with keyboard-shaped
  input completes a Harbour lap without a wall stop.
- Lane tier, build, one review. Kyle and Gratian judge the feel in play.
  Live only at a release on Kyle's "go live".

## Director settled hooks and active claim, 13 October

Kyle's c16809d6 update wins: no recovery throttle cap, no STEADY HUD, and arena input remains today's exact .78/.2 steering and instant keyboard throttle. The source repair owns only src/keyboard-steering.js, src/app.js its existing input constructor/adapter/lifecycle/key-release hooks, tools/test-keyboard-steering.mjs, and docs/changes/FIX-DRIVING-FEEL.md. No HUD, flag, simulation, physics, input-contexts, replay fixture, save or asset edits. The actual arena predicate is course.def.venue === true && course.def.arena === true; preserve ordinary off-road driving behavior outside that explicit arena exclusion.

Road steering keeps the current integral-per-fixed-step approach, with onset .30 and rise .45 seconds, multiplied by the speed cap: 1 through absolute 40 mph, linear to .60 at absolute 120 mph, then .60. Reverse speed uses absolute mph. One fresh held direction starts a fresh ramp, opposing/released keys immediately clear it, and key repeats never restart it. Keyboard throttle integrates a 0-to-1 ramp over .6 seconds; W and Up share one held pedal, releasing both clears it immediately, including release/repress between physics steps. Braking, pad input and autopilot remain exact. Existing countdown accumulation is preserved; no new launch-only rule. Clear both keyboard histories at the existing pause/menu/stage/visual-readiness/context/blur/disposal reset hooks. Stage or arena/road changes must not carry held ramp history into another context.

The existing acceptance may replace only the old .78/.2 road-curve and instant road-W expectations with the settled exact new equations; retain and separately prove all old arena values. Retain release, FPS, real App/native physics, raw-input, pad, autopilot and lifecycle guards. The old physical tap ratios .8075/.835 and .74-to-.9 ranges describe the superseded curve: supply the independent new-curve predictions and actual samples for review, without fitting inputs, tolerances or fingerprints. Do not weaken or silently delete those assertions to pass. Any further exact assertion hook is requested before editing it. This card authorizes its requested curve unit cases in the existing suite, not new generic machinery.

Start in this run's new fix-driving-feel lane, branch codex/fix-driving-feel, with busy-game-files. Root owns shared board/card/status edits, merge and this new lane cleanup; preserve other teams. One original unfiltered nearby/jobs4, build and independent review. Harbour stock-autopilot comparison and one real shaped-key lap are deferred native acceptance for the full check, not a daytime source pass. Kyle and Gratian judge feel in play. No release, push, live port or real saves. Observe the announced FULL TIER FOR RELEASE STARTING hold before every gate/build/merge; code editing may continue while held.
## Director exact physical-acceptance replacement, 13 October

The unchanged input-only approach is 74.80 mph. Actual 50 ms tap impulse .014027450795783826 agrees with the independent sum .014027450795783828 (difference 1.7347e-18); the 100 ms impulse .03135567979624786 agrees exactly. No pose, speed, fixture, inputs or physics were fitted. Diagnostic omission of the three known obsolete comparisons is not a pass. The independent prediction excludes the fixture's later released tick.

Grant only the existing physical tap comparisons: replace the superseded .8075/.835 constant input ratios with a per-pressed-tick independent integral of the written .30/.45 curve multiplied by the stated current-speed cap, retaining the exact 1e-12 tolerance. Do not call the production helper to compute expected input. Replace the old .74-to-.9 yaw/lateral intervals, which described the retired .78 curve, with positive movement smaller than the same prior full-key control. Strengthen the unchanged real-physics fixture with per-step travel increasing, speed above40mph, zero crash and healthy race checks through each tap, while preserving every existing release/status/approach guard. This tests the prescribed input exactly and real softer movement without inventing fitted physical numbers; no physics or replay pin changes. Record these explicit assertion replacements and why in the change note. Arena retains its exact original integral and real Scrapdome input proof; pad/autopilot/raw/FPS/lifecycle guards remain. The diagnostic yaw/lateral samples are facts, not new tolerances or listening/drive acceptance. Freeze the final source for independent review before the one original nearby/build.
## Director two existing-test hooks after the original gate, 13 October

Frozen1296a468 original unfiltered nearby finished135/137, zero unrun, exit1, jobs4,868137.0517ms wall. Only tools/test-app-lifecycle.mjs and tools/test-reverse.mjs failed. No build ran; the release hold is active. Real App lifecycle and all443 owned keyboard checks passed. No runtime fault or physics change is inferred from these two stale fixtures/expectations.

Grant tools/test-app-lifecycle.mjs only its existing Object.create(App.prototype) mouse fixture: supply the constructor-owned _arenaKeyboardSteering and _keyboardThrottle reset objects alongside the existing _keyboardSteering fixture. Leave every lifecycle/mouse/blur/pause assertion unchanged. No optional production fallback or unrelated fixture change.

Grant tools/test-reverse.mjs only its final App input-family trajectory comparison: WASD and arrow keys share one exact keyboard reference at both30/144FPS; gamepad uses its own exact reference across30/144FPS. Preserve every controller/difficulty/FPS case, entire hash/count/snapshot equality inside each family, actual acceleration, braking, reverse-cap, zero-crossing, collision, rewards, restart/pause and raw-physics assertions unchanged. The old cross-family equality assumed instant keyboard throttle, which the explicit.6s road ramp replaces. Add an explicit assertion that the prescribed keyboard and instant-pad trajectories differ; do not replace a hash literal, tolerance or replay fixture. Controller mapping and game/simulation source remain byte-exact. Record the actual failed gate and this intentional assertion change in the note.

Freeze this test-only correction for the same independent review confirmation. No gate/build/browser/merge starts during FULL TIER FOR RELEASE STARTING; wait for RELEASE DONE, then one corrected original unfiltered nearby/jobs4 and build. No new generic test machinery or native run.
## Verified source integration, 13 October

Frozen e7c1ed5146a892f6d0fb76bcbedf28ef30264790 passed the corrected original unfiltered nearby137/137, zero failures/unrun, jobs4, exit0; aggregate1455673.2513ms, wall1462516.1499ms. Build exit0, Vite810ms, wall1568.5446ms. Independent production review and the same review's exact two-test correction confirmation are CLEAR. Production bytes are unchanged from reviewed1296a468; all443 keyboard,241 reverse and198 recorded replay checks pass. Arena retains its exact original input; controller, autopilot, raw physics, saves and fingerprints remain unchanged.

The source merged without conflict; no second post-merge gate is run. busy-game-files is released. Harbour stock-autopilot comparison and one actual keyboard-shaped lap remain UNRUN for the full check, and Kyle/Gratian judge feel in play. No Codex release or push. Root recycles only this run's own merged driving lane/branch and consumed source evidence; older retained lanes and pending native/art evidence stay.
## Kyle approved live release, 13 October

Kyle: "Finish the remaining checks, then get Claude to release and push the throttle and race-screen changes. You have my approval to go live once they pass."

This supersedes the earlier no-release/no-push restriction for these two accepted fixes only. Codex finishes actual Harbour keyboard-shaped lap/stock-autopilot comparison and native1080p/1440p screen acceptance using private-port memory-only QA. Claude is the Release Manager: collect the two notes, retain all other dev switches, freeze the final release candidate, run the full exact-commit release evidence alone/jobs4 and complete the normal safe install/push once green. No further Kyle approval is needed. Source gates/builds/reviews are already green and merged eb53917f; native checks are currently pending, not passed. Do not release on those source-only receipts. Real saves are never read or changed; no forced live refresh.