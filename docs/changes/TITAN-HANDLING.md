# TITAN-HANDLING

Status: tests first; implementation has not started in this lane.

## Settled rule and implementation decision

Kyle's board rule applies only to Titan. Add lowSpeedSteer: true to its car
entry. Above 3 mph, floor the rolling steering factor at .55 and retain its
existing cap of 1. Below 45 mph, floor steering grip at 1.0. At 45 mph and
above, use the exact old curve. All other cars keep their current behavior.

The Director chose an optional fourth car-spec argument for the shared
steeringYawAuthority function. Three-argument calls keep their exact behavior.
Player, road computer, arena computer and demo callers pass their actual car.
The app.js caller waits for WAR-02a-FORMAT to merge. Pilot speed limits stay as
they are. This decision implements Claude's settled rule; it adds no new rule.

## Acceptance checks

- Public steering rules cover 0, 3, 3.001, 12, 16.5, 25, 30, 44.999, 45,
 70, 110 and 180 mph. Surface traction and upgraded grip are covered.
- Duel.step proves Titan turns at least as fast as Rally on dirt at 12 and
 25 mph, and proves reverse yaw changes sign while the truck moves backward.
- A 70 mph player turn follows the old formula. Every non-Titan car and
 every old three-argument caller retains exact authority at all boundaries.
- The arena pilot uses a Titan actor while the player drives Falcone, and
 retains Falcone's old steering while the player drives Titan. Its pace stays
 unchanged. The road route test also uses a Titan rival and Falcone player.
- The existing demo method runs without constructing App or using storage.
 Its unsaturated steering input must use Titan's actual low-speed authority.
- Eight seeded full-state Pacific Canyon replays cover every non-Titan car.
 They include player input, computer motion and normal race rules.
- Kyle's Preview feel check remains manual. The card must reach review with
 waiting_on: kyle; these headless tests do not claim that check is complete.

## Test-first evidence

Baseline runtime: 58cf295b84029ba5b018d41302760d490c4a21b2.

Commands:

- node tools/test-titan-handling.mjs --record: froze eight new non-Titan
 fingerprints before any runtime change.
- node tools/test-titan-handling.mjs: 40 checks, 15 failures, exit 1.
 Twenty-five checks pass, including all eight seeded fingerprints.

Each baseline failure:

1. Only Titan opts into low-speed steering: Titan must declare
  lowSpeedSteer: true; actual undefined.
2. Titan at 3 mph, traction .55: expected .07425000000000001,
  got .06756750000000002.
3. Titan at 3.001 mph, traction .55: expected .4083750000000001,
  got .0675900225.
4. Titan at 12 mph, traction .55: expected .4083750000000001,
  got .27027000000000007.
5. Titan at 16.5 mph, traction .55: expected .4083750000000001,
  got .3716212500000001.
6. Titan at 25 mph, traction .55: expected .6187500000000001,
  got .5630625000000001.
7. Titan at 30 mph, traction .55: expected .7425000000000002,
  got .6756750000000001.
8. Titan at 44.999 mph, traction .55: expected .7425000000000002,
  got .6756750000000001.
9. Upgraded Titan grip 1 at 12 mph: expected .7128000000000001,
  got .5184. The rolling floor is absent.
10. Actual dirt turn at 12 mph: Titan .08639380618637017 is below
   Rally .0911407186141927 radians per second.
11. Actual dirt turn at 25 mph: Titan .18002610968139415 is below
   Rally .18991765416938283 radians per second.
12. Reverse Titan yaw: expected .13059450614267926,
   got .08639380618637017 radians per second.
13. Arena Titan yaw: expected -.12437572013588499,
   got -.08231411296265843 radians per second.
14. Road computer route yaw: expected .7796250000000002,
   got .4953515706709647 radians per second.
15. Demo steering input: expected .2308802308802308,
   got .34885749171463454.

All failures arise from the missing opt-in or old steering curve. The first
run exposed a test-fixture mistake in the demo lane position; the fixture now
uses the existing cruising lane (-3.36 m for a 7 m half-width). Its final
failure therefore tests the steering change rather than a lane mismatch.

Lane tier, build, browser checks, independent review and Kyle's Preview check
are pending implementation. No heavy gate ran during this tests-only task.

## Assertions and race fingerprints

No existing assertion or fingerprint was edited. The new fixture is
tools/replays/titan-handling.json; it records full state every 120 ticks over
360 ticks, at 120 Hz, seed 1989, with three deliberate steering/input phases.

The existing tools/test-replays.mjs asserts unchanged fingerprints for
titan-arena-duel, titan-stunt-trial and titan-freestyle-practice.
tools/test-titan-climb.mjs also runs that full replay suite. Those Titan
assertions can conflict with the card's permitted Titan behavior change.
The implementation must name and explain every changed Titan replay and get
review before editing its old assertion or expected pin. Non-Titan pins must
stay unchanged. This tests-only task leaves all those existing files intact.

## Removed

Nothing. This adds acceptance coverage and freezes unchanged behavior. Runtime
changes, any reviewed Titan replay updates and their removals belong to the
implementation handoff.
