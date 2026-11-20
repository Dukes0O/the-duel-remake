# BOWL-OUT-SIM

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (physics: ground beyond the wall, the drop, the gates). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

Over the wall, into the crowd, and a way back in: the rules. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 3. Kyle, 20
November 2026: jumping out of the arena into the stands and beyond "is the best moment of the night. Keep it", with a way
back in through an opening in the outer wall, reachable from behind the stands.

**Do not change how a truck leaves the arena.** The jump over the wall is on the "Keep these" list in
`docs/board/decisions.md`. This card adds what is on the other side.

**Measured before (Claude's hand drive):** off the Big Jump with nitro, aimed at the stands, the truck rose 15.6 m and
flew 59 m, drove through the stands at floor level, out through the back and across open desert with nothing to stop it.

## What to build

1. **The stands as ground,** from the stadium's own sizes (`BOWL_STADIUM`): behind the wall and fence the terraces rise
   from 3.2 m to 24 m over 36 m, all the way round, as one smooth slope for the truck's wheels. A truck lands on them and
   drives on them. From the floor side the wall and fence stop a truck on the ground as today. From the stand side the
   fence stops a truck too.
2. **The back:** past the top row the ground drops straight to the car park, 24 m below. A truck may drive off it. A
   landing from any height on the Bowl does no damage.
3. **The car park:** flat ground all round the stadium, with about twenty parked cars that crush (data in
   `src/bowl/bowl-outside.js`), and a dirt bank 80 m out from the outer wall that turns a truck back by the wall rules.
4. **Two gates:** openings 8 m wide through the outer wall, the stands and the stand wall, with a tunnel floor at floor
   level: the Car Park Gate on the Jump Straight's stand side at the Scrapasaurus's gate (`rexPlaces` `gateS`), and the
   Pit Gate half a lap on. A truck drives through either way. Their places are in `course.features.bowl.gates`.
5. **Events and points** (`src/bowl/bowl-show.js`): `bowlOverWall` 150, in full once an event and half after that;
   `bowlInStands` 4 a second for up to 15 seconds an event; the leap off the back scored as a jump; `bowlBackIn` 40.
   While the truck is outside, state carries `bowlOutside {where: 'stands' | 'carpark', gate: {s, lateral, metres}}`
   for the marker and for Big Mo's line.
6. **In each event** the clock keeps running. The rule for Last Truck Rolling (a truck over the wall is out; the driver
   has 15 seconds to come back) is BOWL-WEAPONS's; here, the state it needs.
7. **The computer trucks** stay on the floor and treat the gates as wall.

## Files and locks

`src/bowl/bowl-outside.js` (new), `src/bowl/bowl-course.js` (relief beyond the wall, `features.bowl.gates`), the Bowl's
wall pieces in `src/course.js` (the two gaps), `src/bowl/bowl-show.js`, `src/bowl/bowl-night.js` (observe the new
events), `src/bowl/bowl-lines.js`, `tools/test-bowl-out.mjs` (new), `tools/test-bowl-course.mjs`, `tools/bowl-plan.mjs`.
Lock: `bowl-floor`.

Granted Bowl-only hooks: sim-driving _jump for the drop; sim-contacts _supportAt, _staticContacts and _crushProps for tunnel height, rival gate closures and parked cars; the Show Night sound listener in app.js and the shared gate lookup in rexPlaces; sim-laps _advanceLaps skips off-floor crossings during Show Night.

## Checks

1. `tools/test-bowl-out.mjs`: a truck thrown over the wall by the Big Jump with nitro lands on the terraces above floor
   level and is paid for it once; driven up and off the back it falls to the car park without damage; from each of eight
   places round the car park a truck steered at the nearer gate's marker is back on the floor inside 30 seconds; the bank
   turns a truck back; a truck on the floor cannot cross the wall on the ground anywhere but the gates.
2. `tools/test-bowl-course.mjs` and `tools/test-bowl-rex.mjs` brought up to date (the gate's place, the wall's gaps).
3. Laptop only, Claude runs: by hand, over the wall, along the stands, off the back, round the car park and in through
   each gate.

## Sound cues

`bowl.out.over` (over the wall: the crowd's scream turning to a cheer; stand-in `crowd.cheer`), `bowl.out.stands` (the
crowd close by while the truck is among them; stand-in: name only), `bowl.out.leap` (off the back; stand-in
`interface.win`), `bowl.out.gate` (through a gate, with the tunnel's echo; stand-in `world.furnace.horn`),
`bowl.out.back` (back on the floor; stand-in `interface.bonus`).

Behind `titan-bowl`. Builder's checks, then the lane tier and `npm run build`, recorded in `docs/changes/BOWL-OUT-SIM.md`
with a Removed line. Before CARD DONE, search `tools/` for every id and name this card changes and bring each older suite
and scenario that names it up to date. No Chrome under `codex exec`: any browser scenario is "Claude runs". Memory-only
saves. No new dependency, network request or key. Clean up nothing outside this lane.
