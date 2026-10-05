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

Tests-first c5c3c72, 02064cab, 16a014a3: before callers, 23/158, 14 pass/9 red.
Native plate admission, mounting and wrong-surface rejection pass. Both legal
deadline plants retain the original hold and full fuse without early reset or
timeout; their finish still needs the held central convoyCharge wreck hook.
Unplanted window reset and native event timeout settlement pass.
Existing ordinary boarding regression: 24 checks pass.

Signature projectile hits now pass their real swept intersection point. Sticky
blasts pass their actual explosion centre and existing radius. The shared gear
damage helper forwards only those geometry fields, with unchanged damage maths.
Native RPG shots carry the established arena player owner id and their existing
splash radius. Its central impact consumer remains held. Flame keeps its
existing cone/body-hit rule; no invented impact point.
Foot weapons 5 cases, crew gear 33 checks, gear modules 16 checks, projectiles
35 cases and replay fingerprints 12 checks across 4 encounters pass unchanged.
A native contact witness hits 1.074 m from the aimed car centre, not its centre.
Turret forwards the actual gearContact.point. Its independently authored native
19-check case now passes: real Odessa exit, slot 3, deployment, nearest-car
4 armor, untouched farther car, both 0.8 s intervals and measured surface hit.
Reviewer P2: hit events wrongly replaced supplied geometry with the body centre.
Events now retain hitPosition or contactPoint; only unmeasured hits fall back.
A native three-case witness checks impact, contact and body fallback. Crew gear
33 checks and replay fingerprints 12 checks across 4 encounters pass again.

Fixture correction: centre height 3.5 m was lamps, not roof. The real plate is
3.02 m high, 2.444 m back, half-width 0.699 m, half-length 1.242 m. Native hold/fuse
stays exact; new checks reject cab, both plate edges, lamps and upward crossings.

The added deadline fixtures open valves through production damageConvoyValves
and advance the clock through production stepConvoyRaid before native game
ticks. They do not assign valve, charge or result state. Existing central
applyArmorDamage tests still require its real hit hook. Each deadline win
checks one native result and one settlement; the unplanted event loss does too.

Nine held failures: projectile valve hit, two blast/charge-entry cases, two
deadline finishes, App unlock, dev flag, rig mass and wrong-venue admission.

Caller tests on 4af67813: nine cases/68 checks, two pass/seven red: entry,
bolt valves, ram body damage, rig fight/fuse weapons, early charge and Retry.
Seeded pickups, guard response/escort weapons and App timeout paying 144 once
pass; failed writes keep bytes/no early pay. The real App initializer bypasses
only the held allow-list. Original 23 cases stay exact; no source/heavy work.

Geometry slice before repair: 38 cases/250 checks, 17 pass/21 red. Rocket
spawn at lateral 29 hit container-boundary-37 at t=0, not the unshielded car.
Only its new fixture moved inward to lateral -11; ten-armor/once checks stay
exact. Rerun: 38 cases/252 checks, 18 pass/20 red. Rocket and Harpoon controls
pass; spec plus three rig cases stay red at native 1450 kg/2.35/1.02/1.35.

The Convoy-only landing search checks open floor beside the real body. Generic
perimeter candidates hit Salt's walls. Both paths keep fixed candidate order
and native obstacle tests. Other cars keep their existing landing recipe.

Focused laptop headless checks only. Latest build, broad and browser checks
await Director clearance. First owned-source db062fd5 build, existing arena
event 13 cases and settlement 9 cases passed. No authored assertion was edited.

Native damage/spec/entry/render hooks and all final reviews/gates remain open.
Held: combat armor/projectiles/AI, sim contacts, Game/App/flags, renderer,
arena screens/HUD and audio. No unfinished peer source was received.
Whole-base full passed 348 suites. No release, real storage work or merge.

## Removed

The stale unanswered rule questions were replaced by the settled build rules.
Superseded check summaries were folded into the current verdict. Measured hit
events no longer use the old body-centre substitution.
The new control's wall-blocked launch fixture was replaced, not bypassed.
