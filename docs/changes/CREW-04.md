# CREW-04: Computer crews

status: building

## Rules

Claude's 4 October answer is in CREW.md section 3. Repairs use only the
wrench, with Odessa's two-second perk. Reachable signature gear is used
once in an ambush, then RPG attacks, at most three attacks total. Dune
uses bolts; Jax and Wren use RPG only; Rook keeps his handling perk.

## Source

The cpu-crews dev switch admits discovered Wasteland races only. Released
crew gear remains unchanged. Every computer gets a seeded crew. Native
drivers pull over, repair or ambush and return; their car cannot drive or
fire while they are out. Native contacts, pushes, laps and recovery remain.
Shoulder planning rejects blocked positions with the existing collision
geometry. A knocked fighter holds its car until its three-second respawn.

The existing car-fighter body, damage and splash helpers now live in
contacts.js and include real computer fighters. Rocket Pods hit the earliest
body and reuse 60-health splash, linear falloff and half-radius knockdown.
Car armor, team and participant protection and car-hit attribution remain.
Enemy RPG guidance uses its actual computer owner; native player RPG and
signature gear can fight computer crews. Player car sweeps knock them down.

The bounded scene pool shows real fighters, repair, exit, return and get-up
poses. Computer turrets and flamers share the existing geometry and materials.
Rendering never writes race state. Enemy exit, return and respawn reuse a
quiet vehicle.landing cue; repairs use spatial repair.start/complete/interrupted.
Attacks reuse the existing RPG and crew gear cues. No sound file is added.

The isolated switch prerequisite also registers ambush-alley as dev, without
its mode code. Neither new switch admits the other; released states stay exact.

## Checks

Native crew checks pass, including real parked motion, car-fire suppression,
repair timing, all eight members' reachable gear, the three-attack cap,
enemy RPG guidance, car sweeps, recovery, presentation purity and spatial cues.
Rocket fighter contacts pass 9 cases / 94 checks. Existing Fuel/car fighter
contacts pass 57 cases / 397 checks unchanged. Flag, release and launcher
checks pass. The balance-tool unit suite passes 34 checks.

Changed fixtures: the positive ambush starts 200 m behind and approaches
within reach after the real exit; a 250 m control arms but cannot fire until
the player approaches. No range or trigger boundary changed. The exact
Rocket splash health expectation uses the independently measured native
distance, not an ideal fraction; its equality and all other controls remain.
The exact registry tests add only the two new dev entries.

Complete balance, private High/Performance browser, lane tier, build and
the whole-source review remain in progress. No merge pass is claimed yet.

## Removed

The old player-only car-fighter selection and duplicate body/damage/splash
helpers were replaced by the shared native path. Obsolete held-hook notes
were removed. No asset, licensed file or save format was changed.
