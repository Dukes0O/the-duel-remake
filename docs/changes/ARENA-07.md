# ARENA-07: Convoy Raid

Status: building. Rules settled by Claude on 4 October 2026.

## Rules and source

One rigid cab and tank weighs 12 tonnes. It loops at 55 km/h with two allied
guard escorts. Three actual red handwheel targets have 150 armor each.
Projectile impacts choose the nearest valve; rams need a contact within 3 m;
blasts reach every valve in their radius. The body cannot die from these hits.

All broken valves slow the truck to 35 km/h and light the approved roof plate.
The existing one-second boarding hold and two-second fuse finish the fight.
An unplanted 60-second window restores all valves at 75 armor and speed at 55.
A charge planted before the window/event deadline keeps its real fuse.

Wins pay 700 times difficulty and add 25 Tollkeeper hold. Losses pay 40 per
distinct valve the player broke, times difficulty. The native owner and result
deduplication remain mandatory. Yard entry needs Salt Flats and Tollkeeper hold.

The kept ART-FIT-TANKER recipe rebuilt privately: 2,287,396 bytes, 6,788 triangles,
34 draws. No new art round. Runtime installation waits for its real renderer
caller. The fixed inner loop uses offset -9 m: 2,048 full-body samples against
168 native obstacles found no contacts and no ramp elevation. No world edits.

Sounds reuse combat.hit/hit-confirm, arena.tell and crew.boarding.*. The window
uses interface.go, reset uses interface.lose, result uses interface.win/lose.
The native audio routing hook remains held for the sequential ARS handoff.

## Checks

Independent tests: c5c3c72, written before source (15 cases, 1 pass, 14 red).
Current owned source: 15 cases, 8 pass, 7 red at held shared hooks. Pay, immutable
settlement, initial loop/state and repeatability pass. Existing arena event
13 cases and settlement 9 cases pass. Build passes. Assertions are unchanged.

Native damage/spec/admission/render hooks, actual plate boarding, laptop browser,
audio, balance, save review, code review and the exact lane gate remain open.
The whole tested base was received; Director's baseline full run is pending.
No release work or real player storage was touched. No merge is claimed.

## Removed

The stale unanswered rule questions were replaced by the settled build rules.
