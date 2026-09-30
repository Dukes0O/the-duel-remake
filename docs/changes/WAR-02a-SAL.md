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

Nothing replaced. No runtime, generated assets or review captures added.

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
