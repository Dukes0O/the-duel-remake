# ARS-02: Arsenal wave 2

Status: building. This lane starts with the owned weapon modules and tests.
Shared combat, save, renderer and audio hooks require a Director re-slice after
Balance and AUD-17 release them. Nothing here is a finished player feature yet.

## Decision before code

The settled behavior is docs/ARSENAL.md sections 3 and 4. These choices fix
the implementation details left open by the short weapon descriptions:

- Rocket Pods use a three-degree total fan, centred on the aim line. Four
  rockets take bearings -1.5, -0.5, +0.5 and +1.5 degrees. They launch in that
  order, 0.12 seconds apart, without random spread or homing. Each travels
  80 m/s up to 120 m and gives 10 armor damage within a 2 m blast. A shield
  blocks the hit. CPU firing still needs a target 20-100 m ahead within three
  degrees. One accepted trigger starts one four-shot volley and one 8 s
  recharge; a rejected trigger spends nothing.
- A continuous flame burst counts as one style hit per target, while its full armor loss still contributes to damage dealt. Leaving and re-entering refreshes burn without granting another style hit.
- Save IDs are `rockets`, `flamethrower` and `magnet`. Gunn's early reward grants `rockets` after his recorded defeat.
- Flamethrower uses a 30-degree full cone, 15 degrees either side of the car,
  for three seconds and nine metres. A car inside takes 8 armor per second.
  Leaving it starts a 1.5 s burn at 4 armor per second. Re-entry refreshes
  that burn; burns do not stack. A star shield blocks cone and burn damage.
  All amounts integrate over fixed simulation time, not graphics frames.
- Scrap Magnet runs for six seconds. Each fixed step moves eligible pickup
  crates and arena salvage up to 12 m/s toward the car while within 40 m.
  Collection uses the existing pickup/settlement path when the item reaches
  the car; the magnet never grants a reward directly. A future Tesla Coil
  calls an explicit end function. CPU use needs two eligible crates within
  40 m. Its 15 s recharge begins on activation.
- Each accepted action emits the sound event named in the design:
  weapon.rockets.fire/flight/hit, weapon.flame.start/loop/end and
  weapon.magnet.hum. Runtime audio wiring waits for the owned hook.

The simulation uses the seeded generator if randomness is later needed.
The modules must not read renderer state or player storage.

## Checks

Tests will be written before implementation for launch spacing, range,
blast/shield, cone and burn timing, magnet motion and native collection,
CPU use and counters, seed replay at 30/60/144 FPS, and cleanup. Section 4
also requires balance, save, browser, audio and frame checks after wiring.
Owned and native module test: 25/30 pass after failing on missing modules. It covers the rocket fan, blast, shield, range and CPU aim; flame cone, burn, shield and cues; magnet motion, stop and native collection; and repeatable 30/60/144 FPS results. New fixtures follow the 40-projectile cap and fixed 120 Hz step. Native Duel checks pass for armor, shield, pickup, CPU targeting and smoke. A native scoring acceptance is red: three seconds of flame gives the correct 24 armor but records 360 style hits. It must record one hit and all 24 damage. Four new save checks are red because the three weapons are absent from the central catalog: each native memory-only purchase fails and Gunn's earned Rocket Pods reward fails. Three rank, gate and switch rejection checks pass. The save checks also cover upgrades, four slots, unknown fields, future IDs and another named player's isolation after the catalog is wired. No released assertion changed. Shared firing, CPU, scoring, save, renderer and audio wiring, browser and balance checks, lane gate and build remain.

## Removed

None yet. These new modules do not replace a released path.
