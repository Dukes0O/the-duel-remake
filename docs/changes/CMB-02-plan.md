---
task: CMB-02
status: proposed
kind: feature
flag: wasteland2
player_facing: yes
---

# CMB-02: ramming and front bumper spikes

## Board card for Director review

| Field | Proposed value |
| --- | --- |
| Title | Ramming and front bumper spikes |
| Wave / lane / size | 3 / CMB / S |
| Needs / status | CMB-01 / blocked until CMB-01 is integrated |
| Owns | `src/vehicle-impact.js`, `src/wasteland-tuning.js`, `tools/test-combat-ramming.mjs`, `tools/scenarios/combat-ramming.mjs` |
| Named hooks | `src/sim-contacts.js`, `src/combat-armor.js`, `src/game.js`, `src/combat-scene.js` |
| Helpers | test_author, reviewer, browser_qa, balance_analyst |
| Switch / behavior | `wasteland2` / yes |
| Spec | Section 3.2, ram damage; task CMB-02 |

The Director owns `docs/board/board.yaml` on integration. Automatic approval
review rejected a board edit from this isolated branch, so this note carries
the proposed card for direct board entry after review.

## Starting point and decision

Released collision code already uses closing speed and car mass for the
player's crash threshold. An off-centre rear hit can shove and briefly launch
the first rival. Light traffic can be wrecked. These paths have direct tests
in `tools/test-armored-vehicle-impact.mjs` and a browser scene in
`tools/scenarios/armored-ram.mjs`. Preserve them with the switch off.

CMB-01 adds armor to every combat car and the pure
`armorDamageFor('ram', {relativeKph, spiked})` rule. Its contact hook currently
passes no live `spiked` value. The front bumper on every Wasteland combat rig
already shows five spikes. In flagged Wasteland, treat that visible bumper as
equipped on each player and CPU combat car. Apply the 1.5 multiplier only to
the *other* car when the equipped actor strikes with its front face. A rear
or side hit does not earn the bonus. Two head-on front strikes can each apply
the other car's spike bonus. Traffic has no combat bumper. Do not add a kit
purchase, save field, or Nitro Ram ability in this card; those have later
cards. An explicit false bumper state in tests must give the plain ram value.

## Acceptance

1. Convert the closing speed along the collision normal from mph to km/h.
   At or below 40 km/h, ram armor damage is zero. Above 40 km/h, the level-0
   base is relative km/h × 0.2, with the existing armor hit cap. The front
   bumper multiplier is 1.5 on its victim only. Current and maximum armor
   remain bounded and a star on the victim blocks armor loss, while the cars
   still separate physically.
2. Equal-speed cars at 300 km/h can shovel sideways without taking ram
   damage or entering crash recovery. A larger closing speed transfers
   bounded momentum based on both masses and can briefly launch the struck
   car. A zero-armor outcome uses CMB-01's local wreck and recovery, never a
   permanent `crushed` state or an ordinary crash slot.
3. One continuous contact between the same two cars applies its impulse,
   armor hit and ram-hit event once. The incident latch is keyed by the
   unordered actor pair and rearms only after their final positions clear
   the contact envelope plus a small tuning margin. Time passing while they
   remain overlapped cannot rearm it. Positional separation may still run
   every step. Leaving the envelope and later returning permits another hit,
   including at the same world coordinate. No random or wall-clock input is
   used.
4. Player-to-CPU and CPU-to-CPU impacts work for all three opponents. The
   physical damage path must also handle a CPU striking the player when a
   contact is accepted. Keep the current NPC cut-in yield guard for accidental
   approaches; CMB-05 decides when a CPU deliberately attacks rather than
   yields. A front-spike check uses the actual actor face, not merely the
   pair's relative road position.
5. A flagged ram-hit event identifies attacker and victim, including the
   later-CPU index, actual armor removed after shields and overkill, closing
   speed, spike use, and a finite hit position. Continuous contact emits one
   event. Add fields without changing the flag-off `vehicleRam` contract.
6. Ordinary modes and flag-off Wasteland retain their collision response,
   traffic destruction, crash costs, and pinned replay fingerprints.

## Independent tests and private browser scene

- Pure numeric cases: 40.0 and just over 40.0 km/h, mph conversion, 1.5
  multiplier and hit cap, front versus rear/side/reverse orientation, one
  bumper disabled, and both fronts in a head-on contact.
- Simulation cases: equal-speed 300 km/h shove, high-speed mass-dependent
  launch, player versus CPU 0/1/2, CPU pair, shielded victim, zero-armor
  wreck and 60% recovery, traffic and ordinary-mode controls. Hold a pair
  overlapped for 60 Hz steps to prove one incident; separate beyond the
  hysteresis margin and re-enter at the same point to prove a second.
- Replay the scripted contact sequence at 30, 60 and 144 FPS with the same
  event order and armor state. Run the pinned ordinary and flag-off replay
  suite unchanged. This card must not alter existing assertions merely to
  match new behavior.
- In memory-only High and Performance browser runs, use a seeded three-car
  flagged race. An off-centre front-spike rear hit must visibly throw a later
  CPU car off the route; its bumper, armor HUD, local wreck and recovery must
  agree. Record frame pacing and combat balance. The combat race must remain
  within the spec's 10% frame-cost budget versus an ordinary race on the
  same route and quality setting.

## Small implementation sequence

1. Put the face eligibility, impulse limits and incident clearance margin
   in `src/vehicle-impact.js` and `src/wasteland-tuning.js`; use the existing
   `contactZone` convention to identify each actor's front. Keep the helper
   deterministic and independent of rendering.
2. In `src/sim-contacts.js`, latch each actor pair's physical impact before
   applying armor or emitting a hit. Preserve ordinary-mode and NPC yield
   paths. Keep separation active during a latched overlap. Initialize or
   clear per-stage latch state through the narrow `src/game.js` hook if needed.
3. Pass the struck actor's real bumper eligibility into CMB-01's armor
   helper, and emit one indexed, position-aware event with actual damage.
   Keep the visible spike state in `src/combat-scene.js` aligned with that
   eligibility. Run focused, replay, lane, build and browser gates after
   CMB-01 lands. Coordinate the shared tuning file with CMB-07.
