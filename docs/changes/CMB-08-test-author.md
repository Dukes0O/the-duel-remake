---
task: CMB-08
status: red-tests
kind: feature
flag: roadside-destruction-or-wasteland2
player_facing: yes
---

# CMB-08: roadside knock-away and obliteration

## Proposed board card

| Field | Proposed value |
| --- | --- |
| Title | Knock movable traffic and light roadside scenery clear |
| Wave / lane / size | 3 / CMB + VIS / M |
| Needs | CMB-01, CMB-02, VIS-01 |
| Status | Proposed; red acceptance tests committed separately |
| Owns | `src/destructibles.js`, `tools/test-combat-knockaway.mjs`, `tools/scenarios/combat-knockaway.mjs` |
| Named hooks | `src/sim-contacts.js`, `src/sim-rival.js`, `src/game.js`, `src/world.js`, `src/scenery-fall.js`, `src/desert-detail.js`, `src/vegetation.js`, `src/world-props.js`, `src/render3d.js`, `src/combat-scene.js`, `src/wasteland-tuning.js` |
| Helpers | test_author, reviewer, browser_qa, balance_analyst |
| Switch | Existing `roadside-destruction` OR `wasteland2`, in Wasteland only |
| Spec | SPEC.md section 3.2, plus Kyle's 2026-09-23 play-test feedback |

The Director owns `docs/board/board.yaml` on integration. This test branch
does not edit the board or game source.

## Decision and current gap

The striking car's **closing speed** at contact sets the tier. Below half
that car's current upgraded top speed, a movable object is knocked clear;
at or above half top speed it is obliterated. Low-tier traffic stays clear of
the lane for the rest of the stage, and light scenery remains displaced.
High-tier objects show a burst with debris, then leave both the collider and
the rendered scene. Both tiers cost the player a bounded amount of speed,
but no armor, ordinary crash, life or time penalty. Large trees, rocks,
rails and other major fixed scenery remain solid; the existing major
scenery armor rule remains 20. Rival cars follow CMB-02's shove, local
wreck and recovery instead of the traffic path.

At fc6cbc7, `trafficDestruction()` uses about 24% of upgraded top speed
with a mass adjustment and a 22–72 mph clamp. A wrecked traffic car remains
visible. Cacti fall in all modes with an 8% speed loss. Signs, chevrons and
small non-desert trees only tilt over when the separate roadside switch is
on. `game.js` checks the global roadside switch rather than its instance
switch, which prevents isolated flag overrides from controlling it.

The proposed flagged-only event is
`{ roadsideImpact: { kind, outcome: 'knock' | 'obliterate', id,
impactMph, thresholdMph, hitPosition, actor? } }`. `actor` is the traffic
car object for traffic hits. The existing `cactusHit`, `sceneryBroken` and
`trafficWrecked` event contracts stay unchanged when both new switches are
off. A scene record may also carry `outcome`, so sign and cactus systems can
choose their actual mesh movement or removal. The pure traffic helper keeps
its `wreck` and `thresholdMph` outputs for compatibility; `wreck` means the
high tier under this card.

## Acceptance tests

- Exact boundary just below, at and above 50% of the upgraded top speed;
  target mass does not change the boundary. A slower player and oncoming
  car use their combined closing speed, rather than the player's speed.
- Cactus, road sign and small-tree low/high outcomes each emit one indexed
  `roadsideImpact`, remove the former collider, cost at most 25 mph, and do
  not reduce player armor or enter recovery. A repeat crossing has no second
  cost or event. Large fixed scenery still costs 20 armor at major impact.
- Low-tier traffic moves visibly out of its lane and stays there for the
  stage. High-tier traffic leaves the render view after an observable burst.
  Neither path causes armor or crash loss. Rival cars remain in the CMB-02
  path.
- The same scripted sign and traffic sweeps at 30, 60 and 144 FPS produce
  one equal outcome and no per-frame repeat. Ordinary and explicitly
  flag-off Wasteland contacts retain their prior behavior. The release gate
  must also run all pinned replay fingerprints unchanged.
- The real sign group and cactus instance move for a low-tier hit and are
  actually hidden or removed after a high-tier burst. High and Performance
  private browser captures inspect traffic and scenery from matching camera
  poses with memory-only saves, confirm visible debris, and record frame
  pacing against an ordinary race.

The fixed 25 mph maximum is a provisional play-feel bound based on the
existing 20 mph maximum for traffic wrecks. Balance may tighten it without
weakening the requirement that a hit slows the player and keeps control.
Promotion to normal Wasteland should happen after the full balance and
visual gate by changing `roadside-destruction` to `on` in a release card.
Ordinary races remain outside this switch.

## Red test evidence at fc6cbc7

`node --check tools/test-combat-knockaway.mjs` passed. The focused direct
run reports 17 tests, 2 passing controls and 15 expected red checks. The
green controls are the existing 20-armor major scenery hit and ordinary/
flag-off contacts. Expected reds include the switch isolation defect,
24% traffic threshold, no flagged outcome events, low traffic returning to
lane, and unchanged sign/cactus render transforms. No source files, full
suite, build or heavy browser gate were run on this branch.
