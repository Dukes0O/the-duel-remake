# BOWL-REX-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (physics: a solid beast, and a cable between it and the truck). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

The Scrapasaurus fight remade so that a child can see what to do and do it. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md),
section 10, option A. Kyle, 20 November 2026: "a good idea", but he could not tell how to beat it; the truck drives
through it; "land on its back" and "smash its three battery boxes" could not be done or understood. And on the first
remake (drive up its tail): "a bit too on the nose. there must be a better way." **Nothing here is driven up: the driver
hooks the open box and pulls it out.**

**Measured before (Claude's hand drive):** it took 19 seconds to come round to its first fire; when it rested it was at
the edge of the picture and nothing on the floor showed where to drive; a truck placed by hand exactly on its rails 22 m
short of the junk car and driven flat out was thrown 7 m up, passed through the body, and a box was counted as smashed.

## What to build

The rules in `src/bowl/bowl-rex.js` and `src/bowl/bowl-hook.js`, from seed and inputs alone, with every place from the
course's own data.

1. **It is solid.** Its legs, body and tail turn a truck back by the wall rules (BOWL-WALLS). A truck never passes
   through it, on the ground or in the air.
2. **It comes to the driver.** It starts at the Car Park Gate (`features.bowl.gates`) beside the truck, walks its rails
   by the shorter way round towards the truck, and breathes its first fire within 8 seconds on every level.
3. **Tired.** After each breath of fire on Easy, and after every second one on Medium and Hard, it sags where it stands
   and one box opens: the hip first, then the back, then behind the head. The junk car it dropped, the landing on its
   back, the eating and the limp all go.
4. **The tow hook** (`src/bowl/bowl-hook.js`), fired with F, carried in this event in place of the night's weapon.
   - With an open box within 25 m and within 60 degrees of the truck's nose, the hook flies to that box (0.3 seconds) and
     bites. State says whenever a shot would bite, for the marker.
   - At any other time it flies 15 m, falls and winds back in over 1.5 seconds. A hook that meets the beast anywhere but
     an open box bounces off (`hookClang`).
   - The cable is 15 m. The truck cannot go further from the box than that. F again lets go. If the beast gets up, the
     box shuts and throws the hook off.
5. **The pull.** While the cable is at its full length and the throttle is held with the truck heading away from the box,
   pull time counts, and the truck is held at the cable's end in a nose-up pose (the trick rules' pose). Nitro counts
   double. A truck that reaches the cable's end at 20 mph or more adds 1 second (a jerk), once for each time the cable
   goes tight. The truck may move sideways along the arc at the cable's end and the pull still counts. **Pull time
   already earned on a box is never lost.**
6. **Three boxes:**
   - **Hip:** it stays down while hooked. Pull needed: 2 seconds on Easy, 3 on Medium and Hard.
   - **Back:** after 1 second of pulling it braces and drags the truck towards it at 2 m a second while the truck is
     pulling without nitro; under nitro the truck holds its ground. Pull needed: 3 seconds on Easy, 4 on Medium, 5 on Hard.
     The drag stops the pull counting on every level (Easy's exemption went on 20 November; "Changes for a tween" below).
   - **Behind the head:** when the cable goes tight it begins its tell and then breathes fire along the cable, into the
     cone fixed and drawn at the start of the tell, as its fire always is. Pull needed: 3 seconds on Easy, 4 on Medium, 5
     on Hard.
7. **A box out:** `boxOut`; the truck is let go with a push forward; the box is dragged behind on the cable, bouncing on
   the floor, until F. It does no harm to anything.
8. **Angrier each time:** after the first box its fire sweeps 30 degrees to each side; after the second it also throws
   cars (the ring on the floor first, as today).
9. (Removed on 20 November 2026: Easy's first tired spell of up to 45 seconds. Every tired spell has its level's own
   length.)
10. **Losing:** five scorches on Easy, four on Medium, three on Hard; or it has tired six times (five on Medium and Hard)
    and still has a box, and walks out through the Car Park Gate.
11. **The goal line** is never longer than five words and follows the fight: "GET OUT OF THE ORANGE", "HOOK THE GLOWING
    BOX", "DRIVE AWAY AND PULL", "KEEP PULLING", "TWO BOXES LEFT". State carries a marker for the screen: the open box,
    with its distance and whether a shot would bite.
12. **A card before the fight:** three pictures and three sentences (get out of the orange; when it sags, hook the
    glowing box with F; drive away and pull until the box comes out). **Why a try failed,** once each: the hook was fired
    with no box open; the cable was slack; it pulled the truck in; scorched in the orange.
13. **The ending:** with the third box out it falls along the floor. The result waits 10 seconds (BOWL-HUD shows the
    card), and the last box stays on the cable for that time.

## Files and locks

`src/bowl/bowl-rex.js`, `src/bowl/bowl-hook.js` (new), `src/bowl/bowl-rex-view.js` (follow the new state and draw the
cable as a plain line; the look is BOWL-REX-LOOK's), `src/bowl/bowl-lines.js`, `src/bowl/bowl-screens.js` (the card
before the fight), one line for F on the Bowl in `src/input-contexts.js` if BOWL-WEAPONS has not added it,
`tools/test-bowl-rex.mjs`, `tools/scenarios/bowl-rex-fight.mjs`. Lock: `bowl-screens`.

## Checks

1. `tools/test-bowl-rex.mjs`: a truck cannot pass through it anywhere; its first fire comes within 8 seconds; the hook
   bites only an open box in reach and bounces off otherwise; each box comes out after the pull the table gives, with a
   jerk and nitro counted as the rules say; pull time survives letting go and the beast getting up; the three ways of
   losing; the goal line never over five words.
2. A scripted child-pace driver who waits for it to sag, presses F when the marker says a shot would bite, holds the
   throttle away from it and holds Space from the moment it braces, with no steering during the pull, wins on Easy at
   least 6 times in 10. The same driver without Space and without a run-up wins on none of the ten seeds.
3. The scripted drive (one way): `tools/scenarios/bowl-rex-fight.mjs` brought up to date to win with the hook. Claude runs
   it. Every changed assertion is listed in the change note for Claude's review (rule 18).

## Sound cues

Kept: `bowl.rex.roar`, `bowl.rex.fire`, `bowl.rex.fire.end`, `bowl.rex.scorch`, `bowl.rex.box.open`, `bowl.rex.bump`,
`bowl.rex.lift`, `bowl.rex.throw`, `bowl.rex.throw.land`, `bowl.rex.fall`, `bowl.rex.gate`. New: `bowl.rex.burst` (it
comes out of the gate; stand-in `world.furnace.horn`), `bowl.rex.sag` (it tires: a long hiss of steam and a groan;
stand-in `weapon.flame.end`), `bowl.rex.rise` (it gets up; stand-in `raider.warning`), `bowl.rex.sweep` (the sweeping
fire; stand-in `weapon.flame.start`), `bowl.rex.brace` (it plants its legs and pulls back; stand-in `yeti.roar`),
`bowl.hook.fire` (stand-in `weapon.harpoon.fire`), `bowl.hook.bite` (the hook takes hold of the ring; stand-in
`heli.setdown.thud`), `bowl.hook.clang` (it bounces off; stand-in `vehicle.crash`), `bowl.hook.tight` (the cable
creaking while it is pulled, held; stand-in: name only), `bowl.hook.jerk` (the cable snaps tight at speed; stand-in
`vehicle.crash-impact`), `bowl.hook.letgo` (stand-in `interface.radar`), `bowl.rex.box.out` (the box tears out in
sparks; stand-in `weapon.tesla.pulse`), `bowl.rex.box.drag` (the box bouncing along the floor behind the truck; stand-in:
name only). Removed with their events: `bowl.rex.eat`, `bowl.rex.drop`, `bowl.rex.box.close`, `bowl.rex.box.smash`.

Behind `titan-bowl`. Builder's checks, then the lane tier and `npm run build`, recorded in `docs/changes/BOWL-REX-2.md`
with a Removed line. Before CARD DONE, search `tools/` for `scrapasaurus`, `rex`, `boxPastCar` and `launchCars` and bring
each older suite and scenario that names them up to date. No Chrome under `codex exec`: any browser scenario is "Claude
runs". Memory-only saves. No new dependency, network request or key. Clean up nothing outside this lane.

## Round-five model dimensions

Round five of BOWL-ART-REX uses metres, +Y up and +Z towards the head. The old pose scale assumes a 5.8 m head. The new standing head reaches 11.58 m. In the tired pose the tail runs 13 m from Z -16.10 at the ground to Z -3.10 at Y 5.44. It is 4.8 m wide at 22.7 degrees. The level back ends at Z 3.05. Battery centres lie on X 0 at Z -2.90, -0.22 and +2.56. Their tired tops reach Y 5.95. Use the same transform for the collision surface, markers and visible model. The open variant starts at scale zero. Hold the tired animation on its final frame while it is tired.

**Since Kyle turned the ramp down (20 November 2026):** nothing is driven on, so the tail's length, width and slope above
are the model's shape only and no rule reads them. What the rules do read: the battery centres and their tired height
(where the hook bites and where the marker and beam stand), and the outline of legs, body and tail for the solid shape.
The model's further needs for the hook are on BOWL-ART-REX.

## Tow points measured on the round-six model

In the GLB at `579cf774d`, the three towing eyes are on X 0 at Z -2.90, -0.22 and +2.56 m, measured from tail to head. Each eye is 0.664 m across. Its centre is at Y 10.52 m standing and 6.52 m tired. Use the model's world transform to place the cable and the marker. The cartridge centre is 0.66 m below its eye. Hide the whole mesh and show the open version at scale one, then move the corresponding `battery-box-1`, `battery-box-2` or `battery-box-3` parent with the cable. Its socket stays on the spine. This version has a natural tail.

## Solid-body contact hook for Claude

The wall rebound and swept truck contact live in `src/sim-contacts.js::_staticContacts`. Please grant a Bowl-only hook to include the active beast's leg, body and tail solids in that existing contact pass. The fight supplies the shapes and their heights from its current pose and the model transform. This lets a truck at speed hit the visible animal with the same rebound it gets at a wall and lets a jump pass above a part it actually clears. The existing camera and renderer only read the result.

## Claude answers, the solid-body hook (20 November 2026)

**Granted:** a Bowl-only hook in `src/sim-contacts.js::_staticContacts` that adds the active beast's leg, body and tail solids,
from its current pose, to the existing contact pass, so a truck meets it with the wall rules (BOWL-SHOW-2 section 8) and a
jump passes over a part it truly clears. Nothing outside the Scrapasaurus fight adds solids; replay fingerprints and the
contact suites on every other course must be unchanged.

## Build decision

Use the round-six towing eyes for aim and cable placement. Use the visible beast outline for swept wall contacts, keep pull progress per cartridge, and start the ten-second ending at the third extraction.

## Keeping the F key in a fight

The drive context already passes F to `Duel.setInput`, but `src/game.js` discards it unless a foot transition exists. Please grant the single input condition in `setInput` to keep the held F button in a running, enabled Bowl fight as well. The tow hook needs a fresh press, and the later saw needs a held button. All other input paths retain their current behaviour. Please also grant the Rex fallback in `src/bowl/bowl-hud.js::shortGoal` so the old jump-off-the-junk-car and smash-the-batteries instructions can be removed. The runner supplies the new goal in five words or fewer.

## Assertion changes for the tow fight

For Claude's rule 18 review, the former jump off the junk car, overhead smash, eating, limp and flat body-bump checks must follow the new fight. Their replacements require a timely gate entrance, swept contact with legs, body and tail, clearance over parts the truck clears, a real F press with the aim and reach limits, a miss or clang, and earned pull time across letting go and standing up. The three extractions check jerks, nitro, the braced pull, the dragged cartridge and its socket. The ten playable seconds start with the third extraction. The Easy drive changes from eight wins in ten to at least nine, without nitro or steering during a pull. Keep the fire tell, throw ring, yard trophy, pay, switches, repeatability, teaser and read-only drawing checks. The builder will post the passing revision and measured results for the laptop drive.

The pre-input candidate is `28a323191` on `codex/bowl-rex-2`. The headless rules and view checks pass there, including the fallen body's contact shape and the loss on exhausted wall-hit health. The live F input is stopped at the single condition described above. We will measure the ten Easy seeds and offer the playable SHA for the laptop as soon as that hook is granted.

## Claude answers, the F key, the goal and the assertions (20 November 2026)

- **Granted:** the one input condition in `Duel.setInput` (`src/game.js`) that keeps the held F in a running Bowl fight with
  `titan-bowl` on, so the hook takes a fresh press and the later saw a held one; every other input path as before. `game.js`
  is a shared file: replay fingerprints and combat balance unchanged, and the night after the merge is a full one.
- **Granted:** the Rex fallback in `src/bowl/bowl-hud.js::shortGoal`, removing the old jump-off-the-junk-car and
  smash-the-batteries words; the runner supplies the goal in five words or fewer.
- **Rule 18, approved in principle at `28a323191`:** the old jump-off-the-junk-car, overhead smash, eating, limp and flat
  body-bump checks belonged to a fight that no longer exists. Their replacements check the new fight more closely (the gate
  entrance, swept contact with legs, body and tail, clearance, a real F press within aim and reach, the miss and the clang,
  pull time kept across letting go, the three extractions with jerk, nitro, the braced pull, the dragged box and its socket),
  and the Easy drive rises from eight wins in ten to nine without nitro or steering during a pull. Nothing is loosened.
  Offer the playable commit when the ten Easy seeds are measured; Claude drives it on the laptop before the merge.

## Playable tow fight for Claude

Please drive the revised `bowl-rex-fight` scenario and try the first hook by keyboard on `codex/bowl-rex-2` at `7d2e92a08`. Seeds 101 through 110 all won Easy through the ordinary `Duel.setInput` path. The driver steered to aim, pressed F, then held throttle without steering or nitro during the pull. Each third extraction left its box moving on the cable through the 10.000 seconds before the result, and seed 101 repeated exactly. The browser scenario sends an actual KeyF down and up for the first hook. The lane and combat checks are underway.

## Showing the guide to the next driver

The solo result and retry now show the three pictured instructions before the boss. The shared-keyboard Turn Show enters the same fight from its own handoff card and therefore misses them. Please grant `createTurnScreens` and its `handoff` function in `src/bowl/bowl-turns-screens.js` one optional event guide, supplied by the existing Bowl screen. For a Scrapasaurus turn it draws the same three pictures and sentences before the named driver's ready button. Other handoffs keep their current content.

One further rule 18 line at `98f8f7fcc`: the Night 5 opening expectation in `tools/test-bowl-hud.mjs` changes from “Smash its battery boxes.” to “WATCH THE SCRAPASAURUS”. It still asserts the full goal on screen and matches the new opening walk before the fire tell. The first lane gate passed 83 of 84 suites. The tunnel fixture called the shared contact helper without a Duel state; restoring that supported call fixed it. All 297 race replay checks passed.

## Claude answers, the Turn Show guide and the opening line (20 November 2026)

- **Granted:** one optional event guide passed to `createTurnScreens` and its `handoff` in `src/bowl/bowl-turns-screens.js`,
  supplied by the existing Bowl screen, so a Scrapasaurus turn shows the same three pictures and sentences before the named
  driver's ready button. Other handoffs unchanged.
- **Rule 18, `98f8f7fcc`, approved:** the Night 5 opening expectation in `tools/test-bowl-hud.mjs` becomes "WATCH THE
  SCRAPASAURUS", still checked in full on screen, matching the new opening walk before the fire tell. The tunnel fixture's
  restored call is a fix to the fixture, not to an assertion. Nothing is loosened. Offer the playable commit for Claude's
  drive when the ten Easy seeds are measured.

The complete playable candidate is `31ece8f9c` on `codex/bowl-rex-2`. The solo Next button, retry and each named Turn Show Ready button now show the same three pictures before the fight. The production modal checks passed. All ten Easy seeds won without nitro or steering during the pull at `7d2e92a08`, and the last cartridge moved through all ten seconds. Combat balance passed across 51 policy runs and 90 baselines. Please run the named laptop scenario, including the actual keyboard F press, for the merge verdict.

Builder handoff `488be4d38` is clean. The original 84 selected suites are covered across the correction runs; the 121 follow-up suites, 297 race fingerprint checks, combat balance and final production build passed. The reviewed play code is `31ece8f9c`. The local laptop verdict is the remaining merge gate.

## Changes for a tween (Claude, 20 November 2026)

Kyle, 20 November 2026: "don't worry about children losing too much. assume a pre-teen / tween. this isn't for 5 year
olds." At `7d2e92a08` the scripted driver won Easy on all ten seeds with F and the throttle alone, which is a fight
that nobody can lose. One more small round on this card:

1. **Rule 9 goes.** The first tired spell on Easy is as long as every other one. A driver who misses it meets the next
   after the next fire, and pull time already earned is kept (rule 5).
2. **The back box is a real step on Easy too.** The drag stops the pull counting on Easy as it does on Medium and Hard,
   so the throttle alone no longer brings the box out. Space does, and so does a run-up (a jerk each time the cable goes
   tight at 20 mph or more). The pull needed on Easy stays 3 seconds.
3. **The reason is shown on Easy as well:** "It pulled you in, so press Space as you pull.", the first time the drag
   has held the pull still for 2 seconds.
4. **Kept as built:** it tires after every breath of fire on Easy, the shorter pulls, five scorches, six tired spells
   and the longer tells. Easy is still the kindest level; it is no longer certain.
5. **Checks:** check 2 above as rewritten. Report both drivers' wins on the ten seeds in the change note.
6. **Rule 18, Claude's review, given here:** the Easy drive changes from nine wins in ten with the throttle alone to six
   wins in ten for a driver who uses Space, and a new check proves that the throttle alone does not win. Kyle's decision
   made the fight harder and the gate follows it. No check of the rules themselves is loosened.

The session that reviews this card decides whether this round lands before the merge of the fight as built or straight
after it.

The revised fight will land before this card merges. The passing weapons build is frozen for its lane checks and laptop drive. The Rex builder has the shared screen lock for the shorter Easy window, the brace hint and both ten-seed drives.

## Claude answers, the laptop drive (20 November 2026)

Driven on `488be4d38`, Easy, three fights: one lost because F would not let go, then won in 51.6 s and 48.5 s with F cleared
by hand after each press. The guide card is clear, the beast comes to the driver, the tell and the orange read well, F bites
at 22 to 24 m, the cable and the nose-up pull read well. **One more round, with the Fable session's tween changes:**

1. **F never lets go (found on the laptop, 20 November 2026).** `src/app.js` line 3118 builds
`interact: heldInput(context, 'interact', k) || pad.interact`; with no gamepad, a released F gives `undefined`, and
`Duel.setInput` ignores an undefined interact, so `state.input.interact` stays true for the rest of the event after the
first press. The fix is one line: `interact: !!(heldInput(context, 'interact', k) || pad.interact)`. Granted in `src/app.js`
to whichever of BOWL-WEAPONS and BOWL-REX-2 merges first (the other rebases onto it), with a check that pressing and releasing
F sets the input true and then false, and that a second press fires again. `app.js` is shared: replay fingerprints unchanged,
full night after.
2. **The truck starts inside the orange,** with about 3 s to reverse out. Start the truck clear of the first fire, or put the
   first tell after the beast has walked to the truck.
3. **The tired moment is hard to find.** No beam over the open box could be seen, only a slightly brighter ring, and the truck
   is often 24 to 75 m away facing elsewhere with the beast off screen. Draw the beam as the design says (tall, seen from
   anywhere), and add an edge-of-screen arrow to the open box while it is off screen.
4. **No progress ring** could be seen round the box during the pull, and Big Mo's "The cable is slack" stayed up while the
   cable was tight.
5. **The third box came out in about 2 s,** before or as the fire came down the cable, so the choice to swing aside or let go
   never arose. On every level the third box takes longer to pull than its tell lasts.
6. **The fall is covered** by the night's result card within 0.3 s; the ten seconds after the third box must be seen, with the
   card held until they end.

Points 3 and 6 are drawn by BOWL-REX-LOOK too; here the rules and the hold on the result card are what is needed.

## Revised fight and Easy rest length

After the two fire corrections, matched seeds 101–110 won ten times with Space on the brace and zero times without Space or a run-up. The second, slow driver also won all ten with a 0.75–1.25 second reaction delay, a 22–30 mph approach and a steering wobble. This exceeds the general Show Night target of six to nine wins. Five scorches, six tired spells, the pull values and the long warnings are explicitly kept. Please grant a measured trial of shorter Easy tired spells, starting from 32 seconds in small steps and stopping at the longest length that gives six to nine slow-driver wins. Both the skilled matched drive and the no-run-up control stay in the checks. The physical keyboard F fix at `3dade9592` passed down, up, down, up, down with the real App, Duel and hook.

## Rest length trial and second drive at `fc0bd9682`

The slower driver won 10/10 with a 30, 24, 12, 10, 9, 8, 7 or 6.5-second rest. At six seconds it won 3/10 and at 5.5 seconds it lost all ten. A figure between six and 6.5 seconds would give Easy far less time to reach a battery than either Medium (19 seconds) or Hard (15). We recommend keeping the original 32 seconds. Please decide whether the addressed six laptop issues and the two brace controls meet this card or name a different permitted balance adjustment. For the second local keyboard drive, use `fc0bd9682`: it includes the F release, first fire, beam and arrow, progress ring, final cable fire and ten visible seconds before results.

Builder handoff `079cd945f` is clean. All 73 suites selected for the six corrections passed, as did the production build. Play code is `fc0bd9682`. The production result stayed hidden at 0.3, 5 and 9.999 seconds and appeared at 10.000 seconds. The second drive can use this revision. The new BOWL-REX-3 card now explicitly requires its full fight to land between six and nine slow-driver wins. This card keeps the 32-second Easy tired spell pending the local verdict.

## Claude answers, the Easy rest (20 November 2026)

The trial shows the rest length is not the lever: the slow driver wins every time down to 6.5 s and falls off a cliff below
it, and a shorter Easy rest than Medium's 19 s would turn the levels upside down. **Set the Easy tired spell to 24 s**
(longer than Medium's 19 and Hard's 15, shorter than the 32 meant for a small child; Kyle has said the player is a tween).
Ten wins in ten on Easy is accepted for this card: BOWL-REX-3's beam and bombs come after it, and that card's full fight must
land six to nine. Keep the skilled matched drive and the no-run-up control in the checks. The second drive on `fc0bd9682` is
running on the laptop; the merge verdict follows here.

## Claude answers: merge now under rule 23 (20 November 2026)

Kyle changed how cards behind an off switch are tested (AGENTS rule 23, `docs/board/decisions.md`). **Do not wait for the
second laptop drive.** Merge this card as soon as its own checks, the core suite, the three guards and the build are green on
the current commit; the suites already run on this lane count, and no further lane tier is needed. Claude drives the merged
game afterwards, and anything found becomes a small fix card.
