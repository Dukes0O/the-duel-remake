# ARENA-04: Bounty Hunt acceptance tests

## State

Tests first on the claimed Bounty lane. No Source implementation is included.
The tests call real Duel entry, clock steps, armor hits, native brains and App
entry/settlement with a fabricated memory-only named-player registry.

The readable mode contract is arena.bountyHunt.markedId and
participant.bountyPoints. This supplies native rules and presentation with one
state view; tests never import a missing mode module or fabricate a working mode.

## Settled coverage

- Three-minute clock, single seeded initial mark, Easy/Medium CPU starts and Hard
  player/CPU starts, integer one-point-per-second scoring and pause/countdown.
- Actual credited marked wreck: twenty points and one transfer; unmarked wreck
  gives no bounty bonus; a recent hit finished by wall damage keeps native credit.
- Self-wreck without a prior hit transfers to a living leader. Its bonus remains
  unspecified until Claude answers.
- Unmarked CPUs hunt a marked CPU; a marked CPU's actual pilot goal leads away
  from a close pursuer; equipped rear Oil uses the existing Arsenal dev gate.
- Shared sudden death: passive points cannot settle it; the next credited wreck
  wins, with damage fallback after thirty seconds. Actual App inputs also pin
  points, transfers, car poses and results at 30, 60 and 144 FPS.
- Rank nine and dev switch through real App/yard entry, locked and undiscovered
  refusal, actual HUD/scoreboard reads, one-time scrap/hold and failed-save safety.
- Existing road, Last Car Rolling and Sal fingerprints extend to Bounty flag
  off/on. Their exact fixture, sampler and values stay unchanged.

## Questions for Claude

1. Does everyone hunting a marked player override the shared Easy/Medium/Hard
   cap of one/two/three hunters, or does that cap still apply?
2. Does a self-wreck fallback recipient earn twenty points? Who receives the
   mark when its last hitter or current leader is also wrecking?

No disputed expected outcome is asserted. Source for those rules waits for the
written decisions; the Director records the questions in the inbox and board.

## Verification

node tools/test-arena-bounty-hunt.mjs --admission-only reached 32 checks: 28
passed and four failed across ten tests (six pass, four RED), in 516.93 ms of
Node-reported test time. This is a bounded admission result, not a frame or
performance verdict. The failures are:
- Bounty Hunt must have its own dev switch under SPEC 0.12.
- startArenaEvent must accept Bounty rather than rejecting an unregistered mode.
- rank nine unlocks actual Bounty App entry.
- rank-nine yard must expose a real Bounty mode choice.
The full mechanics, settlement, FPS and fingerprint run waits for the Director's
heavy slot. Source has not started.
Each downstream rule currently stops at genuine rejected native/public entry,
rather than missing imports or invented runtime hooks.

## Presentation and sound boundaries

The private browser scenario, actual beacon, screen arrow, High/Performance
captures and frame measurements remain unrun. Headless markup tests prove names,
points and pure reads only. The existing projected marker/pointer seam may serve
the arrow; its vehicle-relative offscreen fallback is inherited. This card does
not invent new camera projection machinery or require Salt Flats to merge.

Rear Oil checks exercise real weapon deployment with Arsenal enabled. They
claim no audible mix, added sound-bank cue, recording or audio review. New Bounty
event cues need names and the normal audio boundary before implementation review.

## Removed

Nothing is replaced by this tests-only change. Existing assertions and replay
pins are unchanged. Pending evidence and other lanes remain in place.
