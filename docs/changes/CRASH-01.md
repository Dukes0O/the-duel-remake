---
task: CRASH-01
status: in-progress
kind: physics
flag: none
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
