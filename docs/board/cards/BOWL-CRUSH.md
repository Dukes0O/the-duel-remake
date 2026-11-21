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
2. **The event:** 60 seconds on every level. It does not end when the truck stops or leaves the line. The goal is a
   count: Medium 18 of the 31, Hard 26. **Easy is set by measurement** (Kyle, 20 November 2026: the player is a pre-teen,
   and Easy is won often, not almost always): the highest count that the scripted slow driver reaches on at least 6 of
   ten seeds in the 60 seconds, and never more than 16. Report the ten counts in the change note. All 31 is a Full House
   and each second left pays 20 points.
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
   60 seconds; a scripted child-pace driver reaches the Easy count at least 6 times in 10 and
   does not reach it on all ten; a chain of four pays as the rule
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

## Placement measurements before the lane opens, 20 November

With the show truck on full throttle and no boost, roof-height descent reached (lap metres, cross-floor metres) at (48.53, 0.00) off the Jump Straight kicker, (191.53, 0.13) off the Crush Straight kicker and (230.34, −9.29) off the Table. Ground landings were at (50.46, 0.00), (193.46, 0.13) and (231.70, −8.46). Use those runs to place and prove the three readable pancake pickups.

Keep the first 15 pieces in their existing positions as the design says. The old outer line is 3.7 m from the face at the centers, and the wide shells extend closer. I will measure the whole footprint of the new pieces against the 3 m wall clearance and test that the old line stays identical.

## Claude answers, the outer line (20 November 2026)

**Approved:** the Car Crush dressing moves its five outer pieces 0.95 m inward (18.2 m to 17.25 m), leaving the other ten and
every other event where they are, so a child holding W with no steering still crushes the same five in the same order on the
first pass, as Kyle saw it, and the full bus and heap shells keep more than 3 m from the wall. No wall or truck rule changes.
## The unsteered run and the old outer line

The live wall response guides the straight-throttle truck around the floor. In a memory-only run on the current Bowl from the Car Crush start, the old line gave five pieces by 5 seconds and another five on the next circuit by 25 seconds, even with no steering. The same 60-second run gave exactly the original center five when the outer pieces were 17.25 m out instead of 18.2 m. The new distance also leaves more than 3 m from the face to the full bus and heap shells.

May the Car Crush dressing shift the five outer pieces inward by 0.95 m, leaving the other ten and every other event exactly where they are? The first pass still hits the same five in the same order at the same positions. No wall or truck behavior changes.

## Car Crush result cards, 20 November

The solo result card and the shared-keyboard Turn Show both still say which row the driver reached. May I replace those two lines in `src/bowl/bowl-screens.js` and `src/bowl/bowl-turns-screens.js` with the number of pieces crushed and the Full House bonus? This also needs the one result-copy field in `src/bowl/bowl-turns.js` to pass the count and bonus to its screen. The Turn Show's scores and purse still use their existing rules.

The older HUD, camera and Turn Show tests name the old count, early finish or straight-throttle win. I will keep their exact UI, two-second camera and progression checks with the new count and full clock, then submit the changed assertions for written review. The Easy preflight route has reached ten on the existing floor in 41.8 seconds by taking the same two lanes at 27 mph.

## Builder measurements and assertion review, 20 November

The playable field and rules are in `codex/bowl-crush` at `add973184`. The ten Easy counts are 14, 13, 12, 12, 12, 13, 14, 13, 12, 14. Easy needs 13, the highest count reached by six of ten. Medium and Hard need 18 and 26. With W held and no steer the same original five props crush in order and the full minute runs. Both kickers and the Table produce a real triple-point Pancake. One crosswise pass crushes all five of the Row. The pile stays up at 29 mph, comes down at 30, and also comes down from a roof crossing at 17 mph. A Full House at 12 seconds pays 960.

For rule 18: the exact HUD label is now “Crush 13 pieces.” and the counter reads “CRUSHED 7 OF 13.” The idle HUD test still checks the precise fresh loss and the absent stale captions at the end of the full minute. The old row-share and short-run wins become exact Medium and Hard counts, a six-of-ten measured Easy count and a separate exact five-hit unsteered loss. The two-pass driver still wins the Show Night and Turn Show drives, and they still check wear, the event order, purse and saved scores. The camera still checks the 90-degree swing in two seconds and the final hold, timed after the full race. The App renderer fixture now requires all 31 Car Crush pieces and the same flame jets. Freestyle, Side by Side and Last Truck Rolling are separately checked for the original 15 props.

The focused runs passed: Show Night 305, camera 70, Turn Show 307, plus the HUD and course checks. The playable browser route is in `bowl-night-pay`; it wins by count before it advances. The result screen still needs the two lines and the result-copy field requested above. Please grant those so the browser pictures will show the new result, then run the scenario on the final build.

## Grouped crush sound and the roof check, 20 November

The independent review reproduced a slow side hit being called a Pancake if the truck passed roof height before it actually reached the Bus Pile. The fix at `4b21844a6` requires overlap at the roof crossing. The reviewer confirmed the exact regression, and all 306 Show Night checks pass. The actual browser input adapter also reached 13 pieces in one minute with a memory-only App, then restored the original driver.

One sound hook remains. When all three buses collapse at once, `src/audio.js` only marks the first bus as freshly crushed. The reviewer heard a “flat” crunch on a second bus on the first pass, before the truck touched any old wreck. Please grant one small change in `_bowlCrush` to mark every ID in the grouped burst fresh, with one audible pile impact. Later passes still use the flat sound. Separate chain links will each get a short tick, using the existing Bowl score cue route.
