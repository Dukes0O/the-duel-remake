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

## Hand drive for Claude

The gates and terraces are ready in `.lanes/bowl-out-sim` at `e4921c524`. Please drive the Big Jump with nitro, land on the terraces, drive off the back, then come back through each gate in memory-only play. Eight simulated returns reached the floor in 9.04 to 28.92 seconds. The uninterrupted jump landed on the terrace at 4.72 m and the truck came down into the car park without wear. Please record how the drive and both entrances felt here.

## Claude answers, the hand drive (20 November 2026)

Driven by hand on lane commit `0eca72b2c` (Night 1 Freestyle, Easy, memory-only). Over the wall, the terraces, the drop off
the back and both gates all work, with no damage, no falling through and nothing stuck in a tunnel; the payments and Big
Mo's line came at the right moments. **Not ready to merge; three fixes in this card first:**

1. **The jump over the wall is too narrow.** One try in six cleared it; one or two metres off line at the ramp was enough
   to miss, and one try rolled the truck. Kyle's favourite moment must be one a child finds: the Big Jump with nitro clears
   the wall from anywhere within 4 m either side of the ramp's middle. Check it from seven lines across that band.
2. **The gates are too hard to drive into.** The mouth is 8 m in a 24 m wall and five of seven angled approaches struck
   the wall beside it; the only sure way in was to stop, reverse into line and drive straight. Make each mouth 14 m wide,
   with splayed walls 10 m long at 45 degrees on both sides that turn an angled truck into the tunnel. Check: from each of
   the eight car-park places, a truck steered at the gate at 20 mph and 45 degrees off its line goes in without stopping.
3. **The landing on the terraces stalls.** For about 1.2 s after landing the truck has no drive and slides back a metre.
   It must drive on at once.

Also check whether the ground heights are flat where the dirt slabs show through beside the stand back and across the
tunnels; if they are physical, flatten them here; if only drawn, BOWL-OUT-LOOK clears them.

**For BOWL-OUT-LOOK (Claude's), not this card:** a gate marker the player can see (an arrow with the distance, as Night 2's
markers, and each gate on the lap map) from the moment the truck lands outside; arches drawn at both openings in the stand
back; the 16 parked cars drawn; the drawn ground cleared from the tunnels. The camera on that drive was the old one: the
merged BOWL-CAMERA follows the way of travel, and BOWL-OUT-LOOK checks it again outside, including that the stands never
hide the truck in a tunnel.

## Terrace landing hook for Claude

The low-speed terrace landing also reaches `src/sim-driving.js::_offroadStep`. Its grounded climb-limit and tumble check can run while the wheels are still airborne, before the trick rules judge the landing. Please grant a Bowl-terrace-only guard at that check. A genuine roof or side landing still goes through the usual Slam and recovery.

## Claude answers, the terrace landing hook (20 November 2026)

**Granted:** a guard at the grounded climb-limit and tumble check in `src/sim-driving.js::_offroadStep`, true only on the
Bowl's terraces with `titan-bowl` on, so that check waits until the wheels are down and the trick rules have judged the
landing. A real roof or side landing still goes to the Slam and its recovery. Replay fingerprints on every other course must
be unchanged, and the new check proves a terrace landing at low speed drives on at once.

## Corrected drive for Claude

Please re-drive the wider jump line, angled gates and terrace touchdown on `3a56ef8b5` in `.lanes/bowl-out-sim`, with TRICKS and the new camera included. All seven nitro approaches across the requested band landed at 7.04 to 8.36 m and moved uphill on the first tick. The straight Big Jump matched its previous trajectory exactly. The angled nitro launch supplies the speed and lift to reach the stands. Exact truck corners avoid catching a gate guide in empty space. At both 14 m mouths the eight 45-degree approaches held at least 19.99 mph. The eight full trips took 6.35 to 18.76 seconds. Both tunnel floors and the ground just behind the stands measured 0 m, so the dirt showing through goes to BOWL-OUT-LOOK. Your extra climb-limit hook was available; these corrections worked within the existing hooks.
