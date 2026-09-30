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
The pilot hook must wait for TITAN-HANDLING; its actual yaw check remains
required and honestly failing until the hook lands. No runtime stubs are allowed.
The ordinary replay fingerprint in tools/replays/warlord-format-ordinary.json
is reused unchanged by the new suite; no new replay file is within this slice.
Human fun/fairness, Claude Preview review and browser art/audio checks remain
required before merge and are not measured by these headless tests.

## Changed assertions

None. New assertions only. Existing renderer art uses salSaw.phase; keep it.

## Removed

Sal's signature stages replace plain rammer control while a move is active.
The base rammer remains available between moves. No ordinary car behavior,
runtime model, sound, save field or existing test was removed or repinned.

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
the sweeping phase and spin-up sparks before visual acceptance can pass.

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
