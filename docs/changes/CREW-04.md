# CREW-04: Computer crews

status: waiting_on claude

## Rules

Claude's 4 October answer is in CREW.md section 3. Repairs use only the
wrench, with Odessa's two-second perk. Reachable signature gear is used
once in an ambush, then RPG attacks, at most three attacks total. Dune
uses bolts; Jax and Wren use RPG only; Rook keeps his handling perk.
Claude's 5 October answer changes only stop pacing: at most 2.5 s overhead
beyond actual repair or weapon work. Native lock/reload is weapon work;
the player's forced 3 s recovery stays unchanged and is not overhead.
Idle range waiting is overhead. Ordinary Hard catch-up follows each stop.
Hard remained above 40%, so Claude's permitted fallback limits Hard repair
to once per race. Medium retains once per lap; no other trigger changes.

Claude's 9 October answer changes only stop admission and repair interruption.
The car must be on road with the same stop conditions for one continuous second.
That second remains ordinary native driving, outside stop overhead. Losing a
condition resets the timer; crossing road center does not. Braking finishes
its pull-over without the former 1.9-second abort. An enemy car within 80 m
during repair sends the fighter back in immediately, before another repair tick.
The existing 2.5-second overhead, repair and attack limits remain.

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

Pacing and fallback source reviews are clear. All 51 Crew cases / 266 checks,
native contacts, Convoy and Ambush controls pass; twelve replay fingerprints
stay unchanged. The fallback first fails its new Hard next-lap control while
Medium passes. Its report finishes 138 main races: Easy 28/30, Medium 19/30,
Hard 18/30. Private browser and lane/build stay closed; no merge pass claimed.

## 9 October verdict

Matching prior settings: Arsenal and cpu-crews on, none policy, unchanged
club driver/Falcone F42, Hard seeds 1989-2018. Ten wins (33.33%); all thirty
finish. Six repairs/returns, no ambushes, aborts or unfinished stops.
Maximum braking: 0.7583333333339368 s; maximum braking, idle and one-car
pull-away overhead: 1.0500000000009815 s, observed without state/driver edits.
Two earlier cpu-only reports are supplemental, not the matching acceptance.
Source SHA-256: 92d454589e3bee80dec2c330c74bb916e9055988ffeaf9d1c45d6dc6d7f6fb90.

57 crew cases / 293 checks pass; ordinary replays pass 162 checks and twelve
released combat fingerprints stay unchanged. Director review approves the
source and admission-timing changes; no existing assertion or cap is weakened.
The added full-native, seeded-traffic seed-3004 case fails: cross-road braking
is 2.4416666666666584 s; actual overhead is 2.7166666666666575 s, above 2.5 s.

The separate positive browser witness passes High/Performance: seed 3008's
existing left-side zone, real Tusk scrap-cannon attack, re-entry, one-car
pull-away in 0.2666666666666657 s and full two-lap finish. Four screenshots,
zero warnings/errors, private memory-only port 7237. Initial lead changes
200 to 160 m to allow ordinary admission motion, inside the unchanged
150-400 m trigger. The unmodified same-side zone leaves seed 3004's fault
covered by the retained failing cap case.

Claude question raised immediately: may admission choose the nearest existing
safe shoulder, or reject a pull-over that cannot meet the cap? Which remedy
keeps 2.5-second overhead with no braking aborts? No planner, speed, driver or
rule remedy invented. Waiting_on: claude; lane/build and merge stay closed
while the cap acceptance fails.

## Diagnosis (5 October)

Unchanged b1b7a419, Hard seeds 1989-2018, native none policy and released
settings: off 6/30, in-car members 6/30, full 18/30; all 90 finish. In-car
matches every off race result exactly. Full has 21 pull-over attempts: six
repairs, five ambushes, ten aborts at 1.9 s. All twelve added wins have a
stop attempt; five have only an aborted attempt. Stop handling, including
aborts, explains the difference; member assignment alone does not.
Medium pursuit 1989: off finishes in 134.72 s; full stalls. Reentry has no
collision or ejection. Before the later turn, at s 6000 off/full speeds are
143.21/173.37 mph, lines +0.851/-3.366; at s 6100, 180.59/196.75 mph,
lines +0.862/-1.538. Both brake inputs are zero, player shove is zero, and
the full fighter is gone. Full hits turn-chevron-10 at 122.13 s. Likely a
shifted no-braking pursuit line, not departure contact. No driver, combat
or catch-up edit made. Ask Claude about abort handling and a separate
all-seed pursuit braking card with before/after evidence, then stop.

## Removed

The old player-only car-fighter selection and duplicate body/damage/splash
helpers were replaced by the shared native path. Obsolete held-hook notes
were removed. The pull-over overhead abort was removed. No asset, licensed file or save format was changed.
