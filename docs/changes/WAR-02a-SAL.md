# WAR-02a-SAL

## Settled contract before tests

Read SPEC 0 and docs/SCRAPDOME.md section 5. Sal's move rules run through
thinkBrain on every fixed step, including between ordinary reaction updates.
The actor owns salSaw: stage is idle, tell, sweep, window, charge-tell or charge;
phase is the existing art vocabulary idle, spin-up, sweeping or sparking;
sinceSec is the current stage's simulation start time. The art phase remains
compatible with WAR-SAL-ART. A tell emits one salSaw event with a world position,
which already maps to arena.sal-saw. Charge tells use the existing arenaTell
event for the flash and engine roar.

A sweep starts only within 12 m sideways and 6 m along, in Sal's body frame.
Tells last 1.2/.8/.5 s on Easy/Medium/Hard; phase two scales these by .8.
Sweep tell starts are at least 9/7/5 s apart. Each sweep requires its own
complete tell. Braking hard or boosting and moving clear during the tell causes
a miss and a two-second window. The window goal requests .6 normal pace,
boost false and steeringScale .5. The pilot applies the scale to yaw authority,
never to the shared car specification or steering curve. Charge appears only
after Sal's first wreck and uses a complete flash/roar tell before boosting.

REWARD reads salSaw.stage. Twice damage applies to a sweep hitting the
target's side; a rear hit on Sal during window gets 1.5 times damage.
Presentation callouts are SAW SWEEP! on a damaging hit and
SHE MISSED. HIT HER NOW! when the miss window opens.

## Acceptance evidence

Tests first. Focused suite: node tools/test-sal-fight.mjs.
The pilot hook required the TITAN-HANDLING merge before implementation. Its
actual yaw check now passes on the merged steering formula. No runtime stubs
are used. REWARD contact and visual hooks are now integrated.
The ordinary replay fingerprint in tools/replays/warlord-format-ordinary.json
is reused unchanged by the new suite; no new replay file is within this slice.
Human fun/fairness and Claude Preview audible-feel/standard-camera review
remain required before merge. Automated browser art, callout visibility and
positional cue-event checks pass as recorded in the final checkpoint below.

## Changed assertions

No existing assertions or headless test code changed. New browser checks verify
phase-two headlight flares, the positional roar and visible move callouts clear
of the nameplate in the labelled review camera. Existing art uses salSaw.phase.

## Removed

Sal's signature stages replace plain rammer control while a move is active.
The base rammer remains available between moves. No ordinary car behavior,
runtime model, sound, save field or existing test was removed or repinned.
The failed draft browser recipe's /src imports, custom brain-dispatch global,
manual simulation clock jumps and forced respawn/protection timers are removed.
Built-game rematches, Duel.step and existing collision methods replace them.

## Tests-first red verdict (30 September 2026)

Focused run: 23 subtests, 4 passed, 19 failed; 28 assertions reached.
Failures are the missing feature, not import or harness errors:
- Six difficulty/phase tell tests, two counter/window tests, three cooldown
  tests, the saw-scream test and hit-callout test: "an alongside Sal announces
  a Saw Sweep before attacking" (stage undefined, expected tell).
- Three in-range boundary tests: "sweep eligibility respects both settled
  distance limits" (false, expected true). All three out-of-range controls pass.
- Phase two: "after her first wreck Sal adds Charge to the rammer moves".
- Runtime dispatch: "normal Duel.step reaches the Sal move dispatcher".
- Actual pilot: "window halves actual pilot yaw authority".

Ordinary replay control passed all three unchanged committed fingerprints.
No full lane gate or build was run: Director assigned the focused tests only
while another runner owns the heavy gate. This is red evidence for the builder,
not passing merge evidence.

Contact handshake settled with the SAL builder: only a positive sweep hit on
the target side sets attacker.salSaw.hit = true and emits SAW SWEEP! immediately.
SAL consumes that result on the next fixed tick; it must not infer a hit from
unrelated armor changes. The contact fixture moves both cars toward one another
so the established NPC safety-yield rule does not replace the intended impact.

## Implementation checkpoint (30 September 2026)

The owned Sal state module and arena dispatch are implemented. Absolute
simulation deadlines enforce complete tells between reaction updates, the
9/7/5-second sweep-start cooldowns, counter escapes and the exact two-second
window. Phase two follows the format's real first-wreck hook. Charge commits
a straight goal only after its full flash/roar tell. The ordinary rammer tell
also shortens by 20% for Sal in phase two; other cars retain their tells.

The window requests 60% normal pace, no boost and steeringScale .5. The pilot
file remains untouched while TITAN-HANDLING owns it. REWARD owns physical
multipliers, contact sparks and the successful-hit callout. Its contact hook
must mark salSaw.hit on a damaging sweep to the player's side; Sal then ends
that sweep on its next fixed step. No generic armor loss is mistaken for a
successful sweep.

The boss receives armorKit='warlord' only as the existing presentation alias.
The format's 1.5-times arena armor and the vehicle's physical mass are preserved.
Actor salSaw keeps the agreed stage/phase/sinceSec fields. Existing positional
salSaw and arenaTell events route to arena.sal-saw and arena.tell respectively;
no new cue or generated asset is needed. REWARD's renderer hook must support
the sweeping phase and the separate kit-sal-tell-sparks effect before visual
acceptance can pass (old kit-sal-sparks stays hidden during spin-up).

Focused unchanged suite: 23 tests, 21 passed and 2 failed, 108 assertions
reached. The failures are actual half-yaw authority and the damaging sweep
callout, each awaiting its exclusive file owner. All six tell timings, range
boundaries, brake/boost counters, cooldowns, saw event, real-wreck phase two,
normal runtime dispatch and the three ordinary replay controls pass.

Unchanged ordinary fingerprints:
- duel/Pacific Canyon: 04548ba7a765a0880d7d93ca73488d4aed40445c1abd75d24ce2c6d6847cf443
- time trial/Red Mesa: b080b14b5862cea7f8528c04f1a846b7d4712257521de52e1b36a56150db7889
- duel/Timberline Rush: 108d30f0ed9f84e9e959f03559568007cd0a46fba7edff6e222efd4ee8fcf254

The private sal-fight browser recipe is prepared for High and Performance.
It labels discovery/hold/position/camera fixtures, verifies memory-only storage
and uses the real move dispatcher and real wreck transition. It has not been
run; visual, audible, fun and Claude Preview verdicts remain pending. No lane
gate or build was run while the Rustwall runner owns the heavy gate.

No assertions or test code changed. This is an incomplete implementation
checkpoint, not passing evidence or a merge-ready card.

Unchanged controls: test-combat-brain passed 5/5; test-arena-feel passed 5/5
on the final source checkpoint. Syntax checks and git diff --check passed.

Browser recipe checks are prepared for tell sparks, spinning sweep, actual
side-contact damage and hit callout, miss window, real-wreck phase two and
Charge in both quality modes. Recipe remains unrun while dependencies wait.

## Titan and built-browser checkpoint (30 September 2026)

Synced the Director-confirmed TITAN-HANDLING integration commit
7c9ff20ac0334ead4edd90849a72dc3c2734e264. The owned pilot hook multiplies
actual steering yaw authority by the move's steeringScale, bounded from zero
to one. Ordinary goals default to one. The merged Titan formula still receives
the original car specification; no steering angle approximation or grip change
substitutes for the required half-yaw window.

Focused unchanged suite: 23 subtests, 22 passed, 1 failed; 109 assertions
reached. The actual half-yaw test now passes. The remaining damaging sweep
subtest fails on SAW SWEEP!, before reaching its hit=true assertion. Both
contact assertions depend on REWARD's exclusive contact hook. The three
ordinary fingerprints above remain unchanged. Titan handling checks pass
40/40 against the new hook. No test code or assertions changed in this update.

Independent review found that source imports cannot run against built
.qa-dist. The browser recipe now uses existing App fight-entry and rematch
methods, real Duel.step timing, the existing vehicle-contact method, natural
wreck respawn and natural protection expiry. Only discovery, hold, armor,
position and camera are labelled memory-only fixtures. Bounded waits fail
explicitly if production countdown, move stages, respawn or protection fail.
No shared runtime QA hook was added.

Headless controls of those same Duel calls reached the full tell, brake-clear
window, uncountered sweep, real-contact first wreck, timed respawn,
phase-two charge tell and boosted Charge. These controls verify the recipe's
method and timing choices; they are not browser, art or audible evidence.
Recipe syntax and git diff checks pass. The recipe is still unrun.

This remains a source checkpoint. REWARD integration is required for contact
multipliers, the hit handshake/callout, rotating sweep blades and separate tell
sparks. The coordinated lane tier and build, private High/Performance browser
review, sound review and Claude Preview fun/fairness review remain pending.
No heavy gate, browser build, integration merge or push was run by this lane.

## Final source and browser checkpoint (30 September 2026)

Synced the confirmed REWARD merge de3eb0fa133c1ed3923638dcd6a2edbb05deb1c5
and integration metadata tip d2d28f90b2f4b51be8287f8555570c88c11ed99d into
this lane. No Reward, renderer, HUD, menu or save implementation was edited by
this continuation. The only new source edits are the owned browser recipe.

Unchanged focused checks all pass:
- test-sal-fight: 23/23 subtests, 110 acceptance checks, including the actual
  damaging sweep callout/hit handshake and actual half-yaw pilot check.
- test-combat-brain: 5/5; test-arena-event: 12/12; test-arena-feel: 5/5.
- test-warlord-format: 24/24.
- test-titan-handling: 40 checks, zero failures; test-titan-climb: 10 checks,
  zero failures.

All three ordinary fingerprints listed above remain unchanged. No assertion
was weakened, no headless test was edited and no replay was repinned.

Final command: node tools/browser-harness.mjs scenario sal-fight
--output-dir .evidence/2026-09-30/WAR-02a-SAL/browser-final-clear.
The harness built the lane's .qa-dist, used private port 18805, a throwaway
Chrome profile and memory-only careers. High and Performance both pass:
12 captures, zero browser issues and zero warnings. All 12 final captures
were inspected. The full car and saw kit remain visible. Both actual move
callouts are readable. Tell sparks, miss sparks, real contact sparks and the
phase-two headlight tell are present in both quality modes.

The fixed-step production calls give a 1.2-second Easy sweep tell, a real
brake-clear miss, an uncountered sweep and an actual side contact. That contact
removes 28.8 player armor (50 to 21.2), versus 14.4 reciprocal damage, and
marks salSaw.hit while displaying SAW SWEEP! in the production HUD. The real
contact first wreck changes phase two; natural respawn/protection expiry then
leads to a .96-second Charge tell with two visible headlight flares and no
boost, followed by actual pilot boost. Tell/sweep blade rotations are
+/-2.32 and +/-2.4 radians in the sampled frames.

Actual positional salSaw and arenaTell events are observed. The unchanged
Audio implementation routes them to arena.sal-saw and arena.tell. This checks
cue-event routing; the headless browser is muted, so audible sound quality,
scream/roar balance and play feel remain unreviewed.

The recipe labels temporary discovery, hold, low armor, car poses, input and
camera as fixtures. It first waits for real renderer readiness, advances the
production yard approach through App.advance, then waits for the real hub.
Low throttle .15 keeps the Easy player alongside for the complete tell; full
throttle had correctly escaped it. Move timing, contact, phase, respawn and
protection still use real Duel methods without FSM or timer assignments.
The private QA panel is collapsed; production HUD and nameplates are retained.

### Failed and partial browser attempts

All raw reports and logs are under the same card evidence folder. These
attempts are recorded as failures or limitations, not passing evidence:
- The initial root report refused premature Sal entry while the yard approach
  was still active. browser-final timed out waiting for the hub because App's
  visual readiness gate had correctly prevented an early advance.
- browser-ready reached the actual tell/window but failed to reach sweep:
  full-throttle acceleration cleared the Easy full tell and caused a real miss.
- browser-review passed both modes with 12 captures and no issues/warnings,
  but its close inspection camera put the nameplate over the timer or partly
  over the hit callout. This was a visual fixture limitation despite assertions
  passing; it is not the final clear-callout verdict.
- browser-framed, browser-hud-diagnostic, browser-final-framed and
  browser-clear each failed the retained new nameplate/callout visibility guard
  during the High window. The last attempted target +2.5 still projected the
  plate at y237.9-279.2 against callout y227-273. No runtime errors were found.

The final labelled camera uses actor ground/air height, position offset
[10,4.5,7] and target offset [0,4,0], then waits for the shipped camera easing
and repaints the HUD projection. The real miss nameplate is at y384.3-425.6
and the hit nameplate at y501.1-542.4, clear of callout y227-273. The guard
passes; no HUD element, nameplate or runtime rule was hidden or changed.

### Remaining review and gates

Claude must play the fight through Preview before merge and assess fun,
fairness, audible scream/roar balance, counter timing and normal chase-camera
nameplate/callout overlap. These stopped, labelled camera fixtures do not
provide that human verdict. The Director owns status/review routing.

Mandatory lane tier and production build are not run by this continuation;
the Director will schedule them on the frozen reviewed source. No Preview,
live folder, port 5174 or real player save was accessed. No merge into
integration, push or release was performed by this lane. Final syntax and
owned-file diff checks pass. Raw evidence is copied to integration's ignored
.evidence/2026-09-30/WAR-02a-SAL folder for independent review.
