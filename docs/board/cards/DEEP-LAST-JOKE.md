# DEEP-LAST-JOKE

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 5 November: finish the Deep's current storyline, perhaps with one little funny mission to get a car, then stop. The Kelp Coast session designs it, small, and then this goes to Codex.

Read `AGENTS.md`, `docs/THE_DEEP.md` sections 6.2, 6.3 and 6.7, and `docs/UNLOCK_VEHICLES.md` for how a car is added. Run every `tools/test-deep-*.mjs` by hand after any change: the lane tier misses some.

## Claude answers

Claude, 5 November 2026, after playing the Kelp Coast end to end on 3 November (`docs/changes/FINISH-DEEP.md`). Everything below is settled. Build it as written. If something here cannot work, follow AGENTS' stop rule and write why on this card.

### Part 1: what is left of the current story

The story runs from the first dive to the Coast Cup, and every trophy works. Wreck Reef, the Night Harbour, Atlantis, the boats and the helicopter's view of the wreck are paused and are not to be built. Four small promises remain, and this card closes them:

1. **Pearl White can never be earned.** It needs nine pearls, but only the Kelp Coast's three exist, so the garage says "PEARLS 0 / 9" for good. Make it three: `hasAllPearls` reads the Kelp Coast page (`DEEP_LOG_PAGES[0].pearls`), the garage counts only the pearls on coasts the player has found ("PEARLS 0 / 3"), and Ana's list tick becomes "All pearls found: Pearl White is in the garage". `DEEP_PEARLS` and the two other coast pages stay as data. Update THE_DEEP sections 6.5 and 6.6 to match.
2. **The second garage tip points at bubbles nobody drew.** `deepHints().bubbles` is read nowhere. Remove the field and change the tip to: "Look for the BOAT RAMP sign on Pacific Canyon's coast road. A dive kit lets any car explore below."
3. **Surface (U) skips Ana's Norseman story.** A player who always surfaces with U never hears it. Say the line from `surfaceDeep` under the same check as the ramp's ascending branch in `stepDeepStory` (once, first part raised this dive). Share one small function so the two cannot drift. The HUD already lets Ana finish talking after `deepExited`.
4. **The otter fact is too absolute** (`docs/changes/FINISH-DEEP.md`, facts table). The card becomes "Otters eat sea urchins. With too few otters, urchins can eat a kelp forest bare." The line `deep.ana.otter` becomes "See the otters? They eat the sea urchins that eat the kelp." Re-record it with the new lines below. Update THE_DEEP sections 5 and 6.7 to match.

Left alone on purpose: charting 100% stays a long optional sweep, last on Ana's list. The helicopter logbook's last entry about the *Marguerite* ("too deep for anyone to reach") reads fine as an ending.

### Part 2: the mission, "The Squeak"

**Who gets it.** Any player who has raised the Sirena, from the next dive on, never in the same dive (that moment belongs to the Sirena). It sits behind a new switch, `deep-vasca` (`dev` until Claude has played it). With the switch off, or before the Sirena is raised, nothing changes.

**The joke in one line.** Ana's sonar starts squeaking. You follow the squeak to a rubber duck on a chain. It takes four lift bags. Ana builds it up as the Falcone team's lost treasure. It is a bath with wheels, and it is your new car.

**How it plays** (about two minutes from the bottom of the ramp, nothing timed, nothing to fail):

1. **Getting there.** The garage shows a tip while the mission is open and not done: "Ana left a message. Her sonar has started squeaking. She would like you to come and hear it." Show it in the same tip slot as the dive tips (a new `deepSqueakTip(profile, {enabled})` in `deep-hints.js`).
2. **The call.** As the dive starts, `deep.ana.squeak` plays. Ana's list gains a row, and the Next line points to it.
3. **The squeak.** Pressing R plays a rubber squeak in place of the sonar tone on every ping until the bath is raised. The ring and blip work as they always do. The find is about 88 m from the dive's start, so the very first ping finds it. The first ping with a blip plays `deep.ana.whale`.
4. **The duck.** In the sunny Ramp Shallows, a bright yellow rubber duck bobs on a chain, about 1.5 m above the sand. Inside 25 m, `deep.ana.duck` plays. Beside it, the ring from FINISH-DEEP reads "The duck: press F for the lift bags".
5. **The lift.** F starts four bags, 12 seconds, as for the Sirena: the ring counts "The duck: lift bag 2 of 4". `deep.ana.heavy` plays at the start and `deep.ana.maybe` at 6 seconds. Driving off cancels it, as for any lift.
6. **The reveal.** At 12 seconds the bath breaks out of the sand and rises slowly (0.55 m a second, a new `RISE_SPEED.joke`), bags round it, duck on its chain above, past the car's roof and up to the sun. It takes about 14 seconds, so the bath stays in view while Ana talks. The six reveal lines play in order. When the last one ends, the existing title card shows for 5 seconds: small line "FALCONE VASCA, 1966", big line "One careful owner. No doors."
7. **The car.** The car is the player's the moment the bath is raised, with no Lab step and no credits paid. It joins the garage and the car list like the Skyline prize. Surfacing early loses nothing.

**Every line.** All are Ana, on the phone chain, voice Bella, recorded with `tools/audio/elevenlabs.mjs` and `tools/audio/build-deep-phone.mjs`. Kyle does not listen first; never hold for that. Add them to THE_DEEP section 6.7 and to `deep-phone-lines.js` word for word.

| Id | When | Line |
| --- | --- | --- |
| `deep.ana.squeak` | Dive start, while open | Oh good, it's you. Something's wrong with my sonar. It's stopped pinging. Now it squeaks. Press R and tell me I'm not going mad. |
| `deep.ana.whale` | First ping with a blip, each dive | There! You heard that. That's no whale. Whales don't squeak. I asked one. |
| `deep.ana.duck` | First time inside 25 m, each dive | Hold on. Is that a duck? That's a rubber duck. On a chain. Why is it on a chain? Stop right beside it and press F. I have to know what's on the other end. |
| `deep.ana.heavy` | Lift starts, once a dive | Four bags? For a duck? That is one very heavy duck. |
| `deep.ana.maybe` | 6 s into the lift, once a dive | The sand's moving. There's something big under there. Something Falcone lost that night. Could it be another race car? |
| `deep.ana.reveal` | Raised, first | Here it comes. Sixty years in the dark. The lost treasure of the Falcone team is... |
| `deep.ana.bath` | Second | It's a bath. |
| `deep.ana.wheels` | Third | It's a bath with wheels. |
| `deep.ana.nino` | Fourth | Hold on, that's Grandma on the other line. Oh no. She says that's Nino's. Nino was the team's mechanic. He hated getting out of the bath, so one day he just didn't. |
| `deep.ana.towel` | Fifth | He raced it once, down the coast road, in a towel. He came fourth. Grandma says the towel came third. |
| `deep.ana.yours` | Sixth, then the title card | She says it's yours now. The duck comes with it. She was very firm about the duck. |

**Other words on screen:**

- Ana's list row (id `duck`, after `sirena`, before `cup`, only while the switch is on and the Sirena is raised): text "Find out why the sonar squeaks", hint "It's close to the ramp, in the Ramp Shallows. Press R and follow the squeak.", tick "It was a bath".
- `SIRENA_PARTS` entry for the ring: name "The duck".
- Garage page for the car: eyebrow "ONE CAREFUL OWNER", heading "It is a bath with wheels.", text "Built in 1966 by Nino, the Falcone team's mechanic, who hated getting out of the bath. Comes with duck. The duck stays. True fact: in 1992 a cargo ship lost 28,800 bath toys in the Pacific, and beachcombers kept finding them for years."
- `homage` in `src/config.js`: "A bath with wheels".

**The sound.** One new cue, `deep.squeak`, synthesized in `sound-bank.js` with `tone` layers like `deep.sonar` (a two-part rubber squeak, rising then falling, about 0.25 s, no file and no credits). It plays for the mission's pings, and in the car on every jump landing and every crash ("the duck is unhappy"): add it beside the `vehicle.landing` and crash cues in `src/audio.js`, for `falcone_vasca` only. `deep.raised` and `deep.liftbag` are reused. The new card event names no other sound.

**The car, `falcone_vasca`.** Vasca is Italian for a bathtub. A real car that races, and quick off the line because it is light, but not fast:

```js
falcone_vasca: {
  name: 'Falcone Vasca', homage: 'A bath with wheels', gearbox: 'manual',
  unlockRequirement: 'deep-vasca', excludeFromCompletion: true,
  topSpeed: 168, accel: 8.4, grip: 0.84, braking: 0.92, gears: [48, 84, 120, 148, 168],
  color: 0xf1ede2, accent: 0x9c1217, offRoadGrip: .6, offRoadSpeed: 52, offRoadScrub: .62, mass: 900,
  collision: {halfWidth: .9, halfLength: 1.9}, height: .95, kind: 'prototype',
},
```

Mass stays at 810 or more because the arena's junk-shove check needs it (see the Sirena's note in `src/config.js`). Top speed may move between 165 and 185 only if the Easy check below needs it; record why. Engine sound: small and cross (`sound-bank.js` car table, pitch about 1.2, gain about .9). Give it an `engine-curve.js` entry.

**The art: one builder, original shapes only.** No download and no Blender file. New `src/vasca-vehicle.js` uses the same helpers as `src/sirena-vehicle.js` (`originalVehicleParts`, `prepareVehicleDamage`), with `createVascaVehicle({tethered = false})`:

- A cast-iron roll-top bath in chipped white enamel, about 1.8 m wide with its wheels and 3.6 m long, on four small wire wheels from the Sirena's parts, with the bath's own claw feet still on, doing nothing.
- A red racing stripe down the middle, and a white roundel on each side with "7½". Nino's number.
- Filled to the rim with white soap foam (a cluster of low spheres), a steering wheel poking out. No driver.
- From behind, which is what the chase camera sees: brass taps, a tall shower head on a bent pipe, and two exhausts through the overflow holes. A little rust at the plug and the taps.
- The duck, plain yellow with an orange bill, sits on the front rim. With `tethered: true` (the dive only) it floats on a plug chain about 3 m above the bath's origin instead, in a child node named `duck`. The view bobs that node gently, drawing only.

It must read as a bath from the chase camera in one second at 1280 x 720, and as real materials, not a toy. Sheet: `docs/board/looks/vasca/round-1.jpg` with `round-1-review.md`: chase view, side view, the duck on its chain in the Shallows, the bath rising. At most three rounds. **Claude gives the art and sound verdict: stop and hand back the sheet, and do not call the card finished before that.**

### Part 3: how to build it

**Rules: no new system.** The find is a seventh find used only here, kept outside `SIRENA_FINDS` so the six-find story and its tests do not change.

- `src/deep/zones/kelp-coast.js`: a new optional zone field, `joke: {id: 'falcone-vasca', trailIndex: 11, offset: -4, below: 1.6}`. `src/deep/deep-zone.js` checks it like a find. Check no rock covers it, and add it to `deepGoalPoints` in `deep-rocks.js` so no rock is pushed over it. Rock positions must not move.
- `src/deep/deep-sirena.js`: `createSirena(zone, save, {enabled, joke})` appends the joke to `finds` only when `joke` is true and the save has `sirena-car` raised. Export `JOKE_FIND = 'falcone-vasca'`. `available`, `pingSonar` and `stepLift` then work unchanged, except that a lift of the joke takes `carLiftSeconds`, and `deepSonar` gains `squeak: true` only while the joke is unraised. Add `raiseJoke(profile, {enabled})`: refused without `sirena-car` raised, adds the id to `deep.raised` and the car to `unlockedCars`, once, paying nothing.
- `src/deep/deep-story.js`: pass the switch through, and add the lines in the table above. Keep saying them from `stepDeepStory` and `pingDeepStory` as the other lines are. `parts()` and `PARTS` do not change, so the joke never counts as a part.
- `src/app.js` `_settleDeepStory`: `event.deepRaised.find === JOKE_FIND` goes to `raiseJoke`.
- `src/deep/deep-audio.js`: `deepSonar.squeak` plays `deep.squeak` in place of `deep.sonar`.
- `src/deep/sirena-view.js`: `SIRENA_MODEL` gains the bath, and `load` resolves it from `createVascaVehicle({tethered: true})` as `{scene}`, so no GLB. Treat it as four bags wherever the code says `sirena-car`, with `RISE_SPEED.joke`. The title card shows when `deep.ana.yours` has finished and the phone is free. Pass `{duck: true}` to `deepObjectives` as a fourth argument; existing callers without it see no new row.
- `src/deep/deep-objectives.js`: the row above, and `deepNextStep` order `badge, parts, sirena, duck, cup, life, pearls, chart`.
- **The car in the usual places**, following the Skyline prize and the Sirena: `src/config.js` (behind the switch, like the Skyline), `src/vehicle-assets.js`, `src/vehicle-sockets.js`, `src/engine-curve.js`, `src/earned-cars-ui.js` (`isShownCar`), `src/screen-garage.js` and `src/screen-menu.js` (listed once owned, no locked row), `src/race-field.js` (never an opponent), `src/heli/heli-jobs.js` (`AIR_ONLY_CARS`) and `src/heli/heli-save.js` (`FIRST_PLACE`, Pacific Canyon). Run `tools/audit-armor-kit-fit.mjs`. No paints beyond the ordinary ones.
- **Saves:** no new field. `deep.raised` and `unlockedCars` already exist. Add fixture `tools/fixtures/saves/25-deep-vasca.json`. Nothing wipes or hides anything for a save that has played the Deep.

**Removed:** `deepHints().bubbles`, the old second tip, and the nine-pearl rule. Nothing else is replaced.

**Checks:**

1. New `tools/test-deep-vasca.mjs`, no graphics, real Kelp Coast on every route:
   - Closed before the Sirena is raised, closed in the same dive, closed with the switch off.
   - Squeak flag, four bags, the car granted once, no credits paid.
   - The six-find story byte for byte as before.
   - The lines fire in the table's order.
   - The Next line, the tip and the row.
   - The Part 1 fixes.
2. **The Easy proof, in the same suite:** from a save with the Sirena raised, a real `Duel` dive driven only through the player's controls at child pace (never over 15 mph, steering only from the sonar's own blip, as `tools/water-easy-driver.mjs` keeps to Easy pace) reaches `falcone_vasca` owned inside 3 minutes of simulated time, on every route, 10 seeds. Nothing in the mission can fail, so this must pass 10 in 10. Then, in the Vasca with no upgrades on Pacific Canyon Easy, the assisted player of `tools/test-water-easy.mjs` (or the App's autopilot line) wins 10 in 10, and the child-pace player finishes every race.
3. New browser scenario `tools/scenarios/deep-vasca.mjs`: memory-only save, real keyboard, port above 5190: squeak ping, duck in view, ring, bath rising, title card, car in the garage, one race start in it. Use its pictures for the sheet.

Also: every `test-deep-*`, `test-sirena-car`, `test-progression`, the lane tier from PowerShell and `npm run build`. No frame check on art; timing comes at Claude's go-live pass, at the Shallows with the bath rising. This touches saves and the car list, so it gets one independent review, including the save checker.

**Changed assertions, reviewed by Claude here (rule 18).** Each changes because the game deliberately changed, and none is loosened:

- `test-deep-phone`: "sixteen lines" becomes twenty-seven, with the same word-for-word check against section 6.7.
- `test-deep-log` line 137: "not before nine" becomes not before the Kelp Coast's three. Its `DEEP_PEARLS` list check stays.
- `test-progression`: the car count gains the Vasca when the switch is on. Name it in that check's title.
- `test-deep-save`: any assertion on the removed `bubbles` field or the old tip's text goes with them.

Any other changed assertion stops and comes back to this card for Claude's review.

**After the merge.** Claude plays it end to end on a fresh memory-only save, gives the art and sound verdict and the frame check, turns `deep-vasca` on and releases under rule 18. Then Kyle hears the Deep is closed in the release note. No Preview step.
