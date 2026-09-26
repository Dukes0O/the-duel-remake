---
task: CRASH-01
status: in-progress
kind: physics
flag: crash-physics
player_facing: yes
---

# Crash physics: handoff from Claude (26 September 2026)

Design: `docs/CRASH_PHYSICS.md` (settled; do not redesign). Kyle asked for it
explicitly in Rival Duel and Mad Max, so changes to ordinary-race contact
behaviour are intended; record every re-pinned fingerprint here with a reason.

## Built on this branch (`lane/arch/crash-physics`)

- `src/vehicle-collision.js`: rigid-body solver (oriented-box contact, normal
  and friction impulses, yaw inertia), severity by change in velocity,
  `CRASH_TUNING`. `tools/test-vehicle-collision.mjs`: 7/7 (momentum, energy,
  rear, side, corner spin, heavy on light, contact normal, severity).
- `src/vehicle-knock.js`: knocked free-body motion (`KNOCK`), `actorBody`,
  `resolveCarCrash` (applies the solver to both cars: nudge keeps driving,
  larger hits knock loose, smashed or launched traffic becomes a roadside wreck
  with a roll limit).
- `src/sim-contacts.js`: armored (Mad Max) contacts, Mad Max roadside shoves,
  armored traffic wrecks and the ordinary contact path all take motion from
  the solver. Rival Duel crashes on the player's own Δv
  (`CRASH_TUNING.playerCrashDvMph`, 22 mph); legacy Mad Max keeps its
  threshold. New `vehicleSmash` event (severity, dvMph, point) for CRASH-02.
- Knocked motion is stepped for traffic and rivals (`sim-rival.js`), arena
  cars (`arena-event.js`) and the player (`sim-driving.js`, no control while
  knocked). A full crash (`_crash`) and an armor wreck clear the knock.
- `src/destructibles.js`: traffic wrecks honour `rollLimit`.

## State of the tests

Replay fingerprints 162/162 unchanged (no car contact in them). Arena,
yielding, roadside destruction, combat armor and hidden road tests pass.
Four files fail, each with a settled decision:

1. `tools/test-combat-knockaway.mjs` tests 11 and 12. **Keep the tests;
   change the code.** Kyle approved "shoved clear" in play: a Mad Max
   roadside knock must leave the lane and stay out of it. In the roadside
   knock branch of `_vehicleContact`, after the solver: guarantee lateral
   velocity toward the nearest shoulder of at least
   `sqrt(2 * KNOCK.slideDecel * distanceToClear) + 1` (distance to road half
   width plus car half width plus 0.5), set `alive = false` at knock start
   (not collidable while sliding, as before), and when the knock settles park
   it as a still wreck (zero velocities, `rollLimit` 0). The player keeps the
   roadside speed rule.
2. `tools/test-armored-vehicle-impact.mjs`: **update the assertions to the new
   model** and record them: make `startKnock` set `speedMph` to the forward
   speed at once; then assert the rival is knocked, forward speed rose by 20+
   mph, an off-centre hit gives sideways velocity and spin, a fast hit gives
   `knock.vy > 0`, and after stepping it left the route and landed.
3. `tools/test-combat-ramming.mjs` 6, 12, 13: 6 (shield still shoves) passes
   once `startKnock` sets `speedMph`; 12 re-pin the ordinary and flag-off
   contact replay after checking the new motion is sensible (Kyle's request);
   13 in Rival Duel smashed traffic may now be wrecked (design), the head-on
   must still crash the player.
4. `tools/test-combat-replays.mjs`: Mad Max combat fingerprints changed.
   Review, re-pin with the test's own procedure, then run
   `node tools/combat-balance.mjs --check` with and without `--flags wasteland2`.
   If the player is knocked loose too often by computer rams in Mad Max,
   raise the knock threshold for the armored player rather than weakening
   the solver, and log it in `docs/board/decisions.md`.

Then: full tier, build, private browser review (a Rival Duel rear-end and a
T-bone on traffic, a Mad Max ram, a Titan hitting a sedan), this note to
ready-to-merge, merge.

## Scope correction after independent review

- `crash-physics` starts in `dev`. When it is off, armored rams, roadside
  traffic, traffic wrecks and ordinary contacts use the exact
  `integration/wasteland` behavior. When it is on, the settled solver applies
  in every race mode.
- A knock consumes the simulation tick on which it settles. Normal player,
  rival, traffic or arena driving resumes on the next tick.
- Low-tier roadside traffic remains visible while it is non-collidable, then
  becomes a still wreck beyond the nearest shoulder.
- CRASH-02's placeholder sound cue is `vehicle.crash-impact`.

## Changed assertions

- `tools/test-armored-vehicle-impact.mjs` now checks the solver state directly:
  immediate forward speed, sideways velocity, spin, upward velocity, route
  departure and landing. Its extreme Mad Max ram checks armor loss and no
  ordinary 30-second Rival Duel penalty. This follows
  `docs/CRASH_PHYSICS.md` section 2: Mad Max keeps its armor rules while motion
  comes from the solver.
- `tools/test-combat-ramming.mjs` permits smashed Rival Duel traffic to become
  a wreck but still requires the player to crash in the head-on. It keeps the
  switch-off ordinary-contact digest unchanged.

## Fingerprint review

- Enabled ordinary contact: `90ae44392f1e118f66f38b57677448c16d9f5db7e444585277c66cafc9e38ff5`.
  The player and opponent snapshots now expose the solver's immediate forward
  speeds and knock state; both ordinary flag combinations agree.
- Enabled Wasteland contact with `wasteland2` off:
  `58dd02e2b3d9ad70478588334efec092d40f61d6f38573a8d278315cf94a58f8`.
  The Wasteland mode keeps its old damage rule while motion comes from the new
  solver. The `crash-physics`-off ordinary digest remains
  `81b4193349b1b5aa06d0180d02ddf6879156b9bc23c762eac8a1ca6a3222caaa`,
  and the switch-off Wasteland digest remains
  `d414293c318c4ddb90b1aecd7a0ffd60ed59455434febc825518b23665066fdc`.
- The built-in combat replay recorder changed two enabled traces at all three
  frame rates. `three-opponent-bolt-order` is now
  `4d571677f171d4c19de2db72ad30af26a9d3be12e94ec33b496e06d3944663a8`;
  `rear-ram-wreck-recovery` is now
  `4d32b095ce051a52633238049ec134802329d6aa24e354e955da26db7fc8bc44`.
  The recorded hit, wreck, recovery, score and shooter-order assertions still
  pass, and each trace is equal at 30, 60 and 144 FPS. The hashes changed
  because sampled actors now expose solver speed and knock motion. The armor
  crate and staggered CPU attack traces did not change.

## Focused evidence

- `node tools/test-combat-replays.mjs --record` — recorded four enabled combat
  replays at 30, 60 and 144 FPS.
- `node --test tools/test-feature-flags.mjs tools/test-vehicle-knock-integration.mjs tools/test-combat-knockaway.mjs tools/test-armored-vehicle-impact.mjs tools/test-combat-ramming.mjs tools/test-combat-replays.mjs`
  — 40/40 passed. This includes the unchanged switch-off contact digests, the
  one-tick settlement guard, roadside visibility and parking, new armored
  motion assertions, and 12 combat replay checks.

Balance, browser review, lane tier and build remain for the Director's gate.

## Removed

- No files or runtime assets removed. The switch-off branches retain the
  integration behavior as the explicit reversal path.
