# CREW-04: Computer crews

status: building

## Rules

Claude's 4 October answer is in CREW.md section 3. Repairs use only the
wrench, with Odessa's two-second perk. Reachable signature gear is used
once in an ambush, then RPG attacks, at most three attacks total. Dune
uses bolts; Jax and Wren use RPG only; Rook keeps his handling perk.
Claude's 5 October answer changes only stop pacing: at most 2.5 s overhead
beyond actual repair or weapon work. Native lock/reload is weapon work;
the player's forced 3 s recovery stays unchanged and is not overhead.
Idle range waiting is overhead. Ordinary Hard catch-up follows each stop.

## Source

The cpu-crews dev switch admits discovered Wasteland races only. Released
crew gear remains unchanged. Every computer gets a seeded crew. Native
drivers pull over, repair or ambush and return; their car cannot drive or
fire while they are out. Native contacts, pushes, laps and recovery remain.
Shoulder planning rejects blocked positions with the existing collision
geometry. A knocked fighter holds its car until its three-second respawn.
The pacing delta speeds only the local maneuver and brief pull-away, with
an idle-time budget. Native contacts and ordinary route/Hard targets remain.
Whole Ambush synchronization retains fort RPGs and moving crew raiders
alongside Crew's reviewed fighter contacts, ownership and guidance.

The existing car-fighter body, damage and splash helpers now live in
contacts.js and include real computer fighters. Rocket Pods hit the earliest
body and reuse 60-health splash, linear falloff and half-radius knockdown.
Car armor, team and participant protection and car-hit attribution remain.
Enemy RPG guidance uses its actual computer owner; native player RPG and
signature gear can fight computer crews. Player car sweeps knock them down.
Review fixes exclude friendly roadside raiders from enemy RPG contact and
splash, and record the actual projectile owner on player raider hits.
CPU crew aim and guidance follow the live on-foot player, not its parked car.

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
Six additive review controls reproduce enemy direct/splash credit and live
fighter aim faults before the fix, then pass with unchanged player positives.

The first report forced released Arsenal off; all 138 races finished, but
its win-band and ambush verdicts are not the intended released baseline.
The correct command requests arsenal,cpu-crews. Its natural Hard seed-1989
probe finishes in 104.70 s with five CPU hits; no eligible crew stop occurs.
The source review clears both fixes. Current balance, private
High/Performance browser, lane tier and build remain open.
The corrected report finishes 138 races: Easy 28/30, Medium 19/30,
Hard 21/30. Only Hard fails. Seven additive pacing controls then show six
expected cap failures; the ordinary Hard driving control passes.
Pacing source passes all seven new cases / 27 checks. Current balance,
earlier controls, private browser, lane/build and delta review remain open.
No merge pass is claimed yet.

## Removed

The old player-only car-fighter selection and duplicate body/damage/splash
helpers were replaced by the shared native path. Obsolete held-hook notes
were removed. No asset, licensed file or save format was changed.
