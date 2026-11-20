# BOWL-CRUSH

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (an event's rules and what stands on the floor). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

Car Crush becomes a 60 second event on the whole floor. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 1. Kyle, 20
November 2026: the first event of every night "is over in about three seconds", with nothing to play.

**Measured before (Claude's hand drive):** 4.4 seconds from the lights to the result card with the throttle held; five
pieces crushed and ten never touched.

## What to build

1. **The crush field,** as data beside the course (`src/bowl/bowl-crush-field.js`), stood on the floor only when the
   course is built for Car Crush (the event's course definition names it, as it names its laps today). 31 pieces: today's
   line of 15; the Row (five junk cars side by side on the Jump Straight's stand side); three pancake cars, each where a
   truck at full throttle comes down off a kicker or the Table, placed by flying the course's own truck; the Bus Pile in
   the open middle of End 2 (two buses with a third across their roofs; it gives way only at 30 mph or more, or to a truck
   coming down on it); five single cars in the open middle of End 1. No piece stands on a jump, within 8 m of a jump's
   foot on its run-up, or within 3 m of a wall. Every other event keeps today's line and nothing else.
2. **The event:** 60 seconds (75 on Easy). It does not end when the truck stops or leaves the line. The goal is a count:
   Easy 10 of the 31, Medium 18, Hard 26. All 31 is a Full House and each second left pays 20 points.
3. **Chain:** each piece within 3 seconds of the last adds a link; each link adds a quarter to the points, up to two and a
   half times. **Pancake:** a piece crushed by a truck coming down out of the air pays three times.
4. **Points:** a car 35, a bus or the RV 60, a burning stack 80, the Bus Pile 200.
5. **Events:** `bowlCrush {id, kind, chain, pancake, count, points}` and `bowlFullHouse`. The HUD's count and chain read
   the event's state.

## Files and locks

`src/bowl/bowl-crush-field.js` (new), one import and the dressing hook in `src/bowl/bowl-course.js`, the Car Crush runner
in `src/bowl/bowl-night.js`, `src/bowl/bowl-lines.js`, `src/bowl/bowl-view.js` (draw the new pieces from the existing
junk car, bus and RV models), `tools/test-bowl-night.mjs`, `tools/test-bowl-course.mjs`, `tools/bowl-plan.mjs` (the plan
picture shows the field). Locks: `bowl-night`, `bowl-floor`.

## Checks

1. `tools/test-bowl-night.mjs`: a truck held on W with no steering crushes five pieces and the event runs its full
   60 seconds; a scripted child-pace driver reaches 10 on Easy at least 9 times in 10; a chain of four pays as the rule
   says; a pancake pays three times; 31 crushed ends in a Full House.
2. `tools/test-bowl-course.mjs`: the field's clearances; Freestyle, Side by Side and Last Truck Rolling are built without
   it; the Bowl's world signature re-recorded if it is pinned, with the reason in the change note.
3. The scripted drive (one way, rule "Gates"): `tools/scenarios/bowl-night-pay.mjs` brought up to date to win Night 1's
   Car Crush by count. Claude runs it.

## Sound cues

The crush set is BOWL-SOUND-CRUSH's (`bowl.crush.*`): name the cue on each `bowlCrush` from its kind, pancake and
whether the piece was already flat. New here: `bowl.crush.chain` (a rising tick for each link; stand-in
`interface.countdown`), `bowl.crush.fullhouse` (stand-in `crowd.cheer`).

Behind `titan-bowl`. Builder's checks, then the lane tier and `npm run build`, recorded in `docs/changes/BOWL-CRUSH.md`
with a Removed line. Before CARD DONE, search `tools/` for `carCrush`, `car-crush`, `rows` and `crushRowsToWin` and bring
each older suite and scenario that names them up to date. No Chrome under `codex exec`: any browser scenario is "Claude
runs". Memory-only saves. No new dependency, network request or key. Clean up nothing outside this lane.

## Preflight question for Claude, 20 November

The design gives the Bus Pile 200 base points for all three buses. I propose one collapse: all three count, each contributes to the chain, and the single 200-point award uses the chain at the first contact. A descending contact applies the pancake multiplier to that award once.

May this card add an opt-in hook in the existing `_crushProps` contact path in `src/sim-contacts.js`? The field supplies a group ID and minimum speed only on the three pile props. A real roof contact from above can also trigger the collapse. The same step can report that contact so the score and sound use it. The other crush props, non-Bowl courses and ordinary Bowl events keep their existing contact path. The existing Bowl score cue route can play the chain tick and Full House cheer.

## Claude answers, the Bus Pile (20 November 2026)

**Agreed: one collapse.** All three buses count as crushed and each adds a link to the chain; the one 200-point award uses the
chain at the first contact, and a contact from above applies the pancake multiplier to it once. **The hook is granted:** an
opt-in group in `_crushProps` (`src/sim-contacts.js`), supplied only on the three pile props with their group id and least
speed, which also reports the contact for the score and sound. Every other prop, every other course and the other Bowl events
keep the path they have; replay fingerprints unchanged. The chain tick and the Full House cheer go through the existing Bowl
score cue route.
