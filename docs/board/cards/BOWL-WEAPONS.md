# BOWL-WEAPONS

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (physics: blows, the saw's drag, a truck thrown and landing). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

Weapons for Last Truck Rolling, and health as the one measure of damage. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), sections
7 and 9 (the table there is the specification). Kyle, 20 November 2026: Last Truck Standing has no weapons; "robot-wars
weapons: a saw, a hammer, a launcher".

**Measured before (Claude's hand drive):** two measures run side by side. In one drive the front damage zone reached 0.98
while the armor had lost 4 of 60. The driver's armor is shown nowhere.

## What to build

1. **Health.** In Last Truck Rolling one number from full to nothing decides a knock-out for every truck, and the four
   parts (front, back, left, right) record where it was lost, for the picture. The damage zones and the armor no longer
   disagree: the event keeps one of them and derives the other. Wall hits cost what BOWL-WALLS says.
2. **Three show weapons,** `src/bowl/bowl-weapons.js`, rules from seed and inputs alone, fired with F:
   - **Hammer:** the arm rises for 0.4 seconds, then hits whatever is within 4 m of the nose: three tenths of full health,
     and the truck hit cannot steer for 1 second. A miss holds the swinger still for 0.5 seconds. 2.5 seconds between
     swings.
   - **Saw:** F held spins it. While it touches a truck: an eighth of full health a second, both trucks slowed to half
     speed. After 4 seconds of cutting it must cool for 3.
   - **Launcher:** throws a truck within 2.5 m of the nose 6 m up and 12 m away along the launcher's facing. It lands on
     its side, loses a sixth of full health and rights itself in 2.5 seconds. Fired with nothing in front, it hops the
     firing truck 1.5 m. 4 seconds to fill again.
3. **Out of the Bowl:** a truck that crosses the wall in the air is knocked out at once, credited to whoever launched or
   hit it last. The driver's own truck over the wall has 15 seconds, counted in state for the screen, to come back
   through a gate (BOWL-OUT-SIM).
4. **The rivals' weapons,** fixed: Rust Rhino's horn (a charge takes a tenth of full health for each 10 mph over 20), Big
   Kettle a hammer, Tin Lizard a saw, Old Bess a launcher, Dragon Wagon a breath of fire 6 m long (a tenth a second).
   Their tells last 0.8 seconds on Easy, 0.6 on Medium, 0.4 on Hard. A rival fires only at a truck in its reach.
5. **Choosing:** state for a card before the event with the weapons open that night (a night's data names them: BOWL-NIGHTS
   supplies the table; until then night 3 the hammer, night 4 the hammer or the saw, night 5 all three).
6. **What Kyle heard:** find which sound plays in today's event that could be taken for a launcher (the knock-out cue
   `arena.wreck-credit` is the likely one), say so in the change note, and give the Bowl's knock-out its own cue.
7. **Balance,** measured: on Easy a scripted child-pace driver with the hammer wins 9 times in 10 and knocks out at least
   two trucks; on Hard a scripted driver who never dodges a tell loses.

## Files and locks

`src/bowl/bowl-weapons.js` (new), the Last Truck Rolling runner in `src/bowl/bowl-rivals.js`, `src/bowl/bowl-lines.js`,
one line for F on the Bowl in `src/input-contexts.js`, `src/bowl/bowl-screens.js` (the choosing card),
`tools/test-bowl-weapons.mjs` (new), `tools/test-bowl-rivals.mjs`. Locks: `bowl-rivals`, `bowl-screens`.

## Checks

1. `tools/test-bowl-weapons.mjs`: each weapon's tell, reach, cost and rest as the table says; a launch beside the wall
   puts a truck out; the driver's 15 seconds; health and its four parts agree after any run of hits.
2. `tools/test-bowl-rivals.mjs`: the balance in item 7, with every changed assertion listed for Claude's review.
3. Laptop only, Claude runs: one Last Truck Rolling by hand with each weapon.

## Sound cues

`bowl.hammer.rise` (the tell; stand-in `raider.warning`), `bowl.hammer.hit` (stand-in `combat.explosion`),
`bowl.hammer.miss` (into the dirt; stand-in `heli.setdown.thud`), `bowl.saw.spin` (a held scream; stand-in
`weapon.tesla.charge`), `bowl.saw.cut` (sparks on metal; stand-in `vehicle.crash`), `bowl.saw.hot` (it must cool;
stand-in `weapon.flame.end`), `bowl.launcher.fire` (a blast of air; stand-in `weapon.tesla.pulse`),
`bowl.launcher.fill` (the hiss and the gauge full; stand-in `interface.radar`), `bowl.rhino.horn`, `bowl.dragon.fire`
(stand-in `weapon.flame.start`), `bowl.out.of.the.bowl` (a truck goes over the wall; stand-in `crowd.cheer`),
`bowl.knockout` (the Bowl's own knock-out; stand-in `combat.explosion`), `bowl.weapon.pick` (the choosing card; stand-in
`interface.bonus`).

Behind `titan-bowl`. Builder's checks, then the lane tier and `npm run build`, recorded in `docs/changes/BOWL-WEAPONS.md`
with a Removed line. Before CARD DONE, search `tools/` for `lastTruckRolling`, `last-truck-rolling`, `showArmor` and
`BOWL_RIVAL_HITS` and bring each older suite and scenario that names them up to date. No Chrome under `codex exec`: any
browser scenario is "Claude runs". Memory-only saves. No new dependency, network request or key. Clean up nothing outside
this lane.

## Balance inherited from BOWL-WALLS (Claude, 20 November)

Keep the child driver's ordinary wall contacts when measuring the hammer. On Easy, run the driver into walls as often as in the unarmed wall trials. In seed 1989, three hard wall contacts and two big ones cost 35 of 60 health, and five hard truck contacts cost 25 more. The original unarmed run also lost seeds 2090 and 2191. The armed driver must still win at least nine of ten and knock out at least two trucks. If that cannot be reached, Claude permits a smaller player wall-damage share on Easy only. Medium and Hard keep the full wall table.

## Contact hooks for Claude

Two existing contact paths in `src/sim-contacts.js` meet this card. In `bowlWear`, hard contacts subtract armor and separately increment a damage zone using the nominal hit. Please grant a Last Truck Rolling hook here to record the actual health removed against the hit side once. In `_staticContacts` the exterior treats a computer truck's walls as solid at any height to keep ordinary rivals inside. Please grant an exception for a rival thrown by the event's launcher: it must clear the real wall height, and the event awards the knockout as it crosses in the air. Grounded rivals still meet the gate as a wall. These hooks are for the queued weapons card after HUD, OUT-SIM and RIVALS-2.

## Claude answers, the contact hooks (20 November 2026)

**Granted, both, in `src/sim-contacts.js`:** in `bowlWear`, a Last Truck Rolling hook that records the health actually removed
against the side that was hit, once per hit, so the four-part display shows the real loss; and in `_staticContacts`, an
exception for a rival thrown by the event's launcher, which must clear the real wall height and is knocked out by the event as
it crosses in the air. A rival on the ground still meets the wall and the gates as solid. Both are inert outside Last Truck
Rolling with `titan-bowl` on; replay fingerprints and the contact suites on every other course must be unchanged.

## Hearing one knockout

The old player-credit sound is confirmed in `src/audio.js`: the event listener plays `arena.wreck-credit` for every `arenaWreck` credited to the player, including Last Truck Rolling. Its Bowl knockout event also names that sound. Please grant a condition around that one generic playback call for Last Truck Rolling with `titan-bowl` on, and a weapon-event dispatch alongside the existing Bowl race and Rex cue dispatch in `src/app.js`. The Bowl will play its named knockout once for each eliminated truck; normal arenas keep their current sound and player credit. These two hooks let the three show weapons play their own tells and hits on the ordinary game path.

## Build decision

Use armor as the sole health total and attribute actual loss to its contact side. Run the hammer balance proof through real driving and keep the measured Easy wall-contact pattern. The three toy weapons share the existing F input.

## Applying a show weapon during real movement

Please grant two narrow hooks in `src/arena/arena-event.js`, beside the player’s `_drive` and `_jump` calls and beside a rival’s `pilotStep` and `_jump` calls. They apply an active Last Truck Rolling weapon effect as the vehicle moves. The saw must halve travel for both trucks, the hammer must prevent the victim from steering for one second, and the launcher must move a truck through the 6 m high, 12 m long arc and the 2.5 second recovery. Outside the enabled event the existing movement runs as before. The weapon state and effects stay in `bowl-weapons.js`.

## Starting a fight in the older checks

The real choosing card holds the event until a selection. The outside, walls and rival suites and the `bowl-rivals` browser scenario enter the Night 3 fight directly. Their setup must choose the hammer through the normal action. Keep the existing physical and result assertions. Check that the weapon choice precedes the fight on retries and each Turn Show go as well. Please review the affected setup under rule 18.

The old no-weapon assertions at `1d5bfbca6` now check that the arena arsenal is empty and that the correct named show weapons are fitted. The knockout checks keep the same credited driver and Big Mo line and expect the Bowl cue. The one-second low-speed rival check still applies to every free-moving, sound truck. It excludes trucks in an authored throw, a missed hammer's half-second hold or the 2.5 second side recovery. Armed Easy requires a win with two credited knockouts in at least nine of ten drives, and a non-dodging Hard driver must lose. The two-lap racing checks stay. Before arming the child on the merged rival rules, the three inherited seeds still lose: seed 1989 takes six hard wall hits and five truck hits costing 30 health each in total; 2090 and 2191 each take five hard wall hits. The armed driver keeps those steering inputs.

## Playable weapons for the laptop

Please drive Last Truck Rolling once with each weapon on `codex/bowl-weapons` at `5c837fccb`. The chooser, weapon effects and gates use the real race paths. The focused checks cover the hammer, saw, 6 m high/12 m long throw, real wall clearance, driver’s 15-second return and damage by side. At full wall damage the first three armed Easy seeds still lost, with 1, 0 and 0 credited knockouts. The builder is measuring the authorized Easy player wall share and F timing with the same steering; Medium and Hard keep the full wall table. The earlier request under “Hearing one knockout” still needs a ruling before checking the finished sound.
