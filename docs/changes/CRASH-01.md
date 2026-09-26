---
task: CRASH-01
status: ready-to-merge
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

## Original handoff state at f03c192

Replay fingerprints 162/162 unchanged (no car contact in them). Arena,
yielding, roadside destruction, combat armor and hidden road tests pass.
Four files failed at the handoff commit, each with a settled decision. The
focused evidence below records their resolved state.

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
  becomes a still wreck beyond the nearest shoulder. Settlement clamps the
  whole car at least 0.5 m beyond the road edge using the nearest deterministic
  parking path that does not sweep through a solid. If every candidate is
  blocked, the car stays visible, non-collidable and still while normal solid
  resolution runs; it retries next tick instead of claiming an in-lane wreck.
- An armored Wasteland player keeps driving when the solver gives it less than
  70 mph own delta-v. The other car still takes the full physical result, and
  a 70 mph or larger player delta-v still starts knock motion. Rival Duel is
  unchanged. The balance evidence and reason are in `docs/board/decisions.md`.
- CRASH-02's placeholder sound cue is `vehicle.crash-impact`.

## Changed assertions

- `tools/test-armored-vehicle-impact.mjs` now checks the solver state directly:
  immediate forward speed, sideways velocity, spin, upward velocity, route
  departure and landing. Its extreme Mad Max ram checks armor loss and no
  ordinary 30-second Rival Duel penalty. This follows
  `docs/CRASH_PHYSICS.md` section 2: Mad Max keeps its armor rules while motion
  comes from the solver.
- The same test now checks both sides of the Wasteland player threshold. A
  protected 58.86 mph own delta-v keeps driving; a 131.68 mph hit still knocks
  the player. The original behavior failed the first assertion. This guard was
  added before the threshold code.
- `tools/test-combat-ramming.mjs` permits smashed Rival Duel traffic to become
  a wreck but still requires the player to crash in the head-on. It keeps the
  switch-off ordinary-contact digest unchanged.
- `tools/test-wasteland-beta.mjs` now requires `crash-physics: dev` in the
  complete feature-switch inventory. The lane gate exposed its exact old-map
  assertion after the new switch was added; the updated assertion strengthens
  the inventory check and does not change released switch expectations.

## Fingerprint review

- Enabled ordinary contact: `90ae44392f1e118f66f38b57677448c16d9f5db7e444585277c66cafc9e38ff5`.
  The player and opponent snapshots now expose the solver's immediate forward
  speeds and knock state; both ordinary flag combinations agree.
- Enabled Wasteland contact with `wasteland2` off:
  `77e512edd147264c2da17858eca6ed4fb74f031500dba8ce95e891ea3676bb38`.
  The Wasteland mode keeps its old damage rule and the opponent's solver
  motion, while the reviewed armored-player threshold leaves a moderate hit in
  driving motion. The `crash-physics`-off ordinary digest remains
  `81b4193349b1b5aa06d0180d02ddf6879156b9bc23c762eac8a1ca6a3222caaa`,
  and the switch-off Wasteland digest remains
  `d414293c318c4ddb90b1aecd7a0ffd60ed59455434febc825518b23665066fdc`.
- The built-in combat replay recorder changed two enabled traces at all three
  frame rates. `three-opponent-bolt-order` is now
  `4d571677f171d4c19de2db72ad30af26a9d3be12e94ec33b496e06d3944663a8`;
  `rear-ram-wreck-recovery` is now
  `48d30867f637754a65e5f5aa96452d190ecb68df6d84c31da08fbba5902151bb`.
  The recorded hit, wreck, recovery, score and shooter-order assertions still
  pass, and each trace is equal at 30, 60 and 144 FPS. The hashes changed
  because sampled actors now expose solver speed and knock motion. The armor
  crate and staggered CPU attack traces did not change.

## Focused evidence

- `node tools/test-combat-replays.mjs --record`: recorded four enabled combat
  replays at 30, 60 and 144 FPS.
- `node --test tools/test-feature-flags.mjs tools/test-vehicle-knock-integration.mjs tools/test-combat-knockaway.mjs tools/test-armored-vehicle-impact.mjs tools/test-combat-ramming.mjs tools/test-combat-replays.mjs`
  Result: 49/49 passed after adding the pure solver and solid-safe parking
  cases. This includes the unchanged switch-off contact digests, the one-tick
  settlement guard, roadside visibility and parking, new armored motion
  assertions, solid-safe roadside parking and retry cases, and 12 combat
  replay checks.

## Balance and browser evidence

- Full combat balance passed with crash physics off and on, each with
  `wasteland2` off and on. Wins by Easy/Medium/Hard were 9/6/2, 8/5/3,
  9/5/2 and 8/5/3 respectively. No race was unfinished and every UFO,
  combat, wreck and pacing target passed. The enabled runs used an in-memory
  module loader because the balance tool has no `crash-physics` command-line
  flag; no file was changed by the loader.
- Private browser QA used memory-only storage and ports 49713, 53911 and
  52839. Rival rear-end, traffic T-bone, Mad Max ram, Titan into sedan and the
  switch-off armored ram all passed. There were no console errors, warnings or
  failed requests. The first run found the roadside sedan at 6.775 m on a road
  with 7.0 m half-width. The test-first fix rerun settled it at 8.528 m, giving
  0.508 m of whole-body clearance. The temporary browser scenario was removed;
  raw evidence remains under `.evidence/2026-09-26/CRASH-01/` until merge.
- Final independent review found that the first clearance clamp erased its
  swept path and could cross a roadside wall. A red integration fixture proved
  the crossing. The replacement searches collision-safe clear poses. Two more
  red-first fixtures prove that a fully blocked search and an initial overlap
  stay visible and pending instead of becoming an in-lane wreck. The reviewer
  rechecked the fix and reported no remaining issue.

## Final gate

- Final independent review: clean after the collision-safe parking and retry
  fixes.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 151 passed,
  0 failed, 0 not run in 257.34 seconds.
- `npm run build`: passed; Vite transformed 233 modules. The existing large
  chunk advisory remains non-blocking.

## Removed

- No files or runtime assets removed. The switch-off branches retain the
  integration behavior as the explicit reversal path.
