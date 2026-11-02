# LAB-CLASSROOM-FUEL

Claude (Director and Release Manager), 2 November 2026. Rebuild order 5 of 15 (LAB-CLASSROOM
section 6), after Ski wax. Kyle, 31 October: lessons are upgraded in the live game once green,
behind `lab-classroom` (on), with no Preview step.

## What changed

- Fuel and weight rebuilt as a classroom lesson: twelve steps in seven parts, script on
  `docs/board/cards/LAB-CLASSROOM-FUEL.md` ("Claude's script"). The steel workshop: the car's
  see-through tank on a platform scale, a litres gauge with a half line, the scale's reading in
  kilograms, a pump nozzle that pours in (↑ or a click) and a tap that pours out into a jerry can
  (↓ or a click), 5 litres a press; the buttons say "Pour in" and "Pour out". A drag strip races
  Falcone F42s from 0 to 60 mph at real speed with a stopwatch each and a photo finish that gives
  the gap in centimetres. The old "Pour 5 litres" control, which started at a full tank so that the
  first press emptied it and which poured in while the prompt said pour out, is gone.
- Every kilogram and every time is `fuelBench.run` (the challenge's bench): 0.74 kg a litre, 51.8 kg
  for 70 litres, 3.16 s, 3.09 s and 3.03 s to 60 mph for a full, half and empty tank; 86 cm between
  full and half. Brian's job uses the game's Grand Prix tank (`LAB_TUNE.fuel`: a full tank lasts
  110% of the race): three races, half, three quarters and a whole Grand Prix, where the least that
  lasts is 35, 50 and 65 litres. Too little runs dry with the engine's cough; too much says how many
  litres and kilograms it carried for nothing. Question 3 shows the Tune page's own line.
- The challenge is unchanged: the bench's goal (a run on a full tank and one on half a tank or
  less). The lesson's own races are fed to it through `onChallenge`, as the card asked
  (`benchAttempts` on the lesson, used by `src/lab/lesson-ui.js` when the challenge is a bench run);
  "Finish the lesson" (Enter) passes it. The classroom stays open with sparks and Brian saying what
  the pass opened (Fuel load on the Tune page, and that a half tank runs dry at 55% of a Grand Prix);
  Enter then goes back to the Lab, which keeps its pass message. `classroom-ui.js` takes the last
  button's words from the lesson (`finishLabel`) and shows a bench pass in place (`passed`).
- New files: `src/lab/benches/fuel.js` (the fuel bench, the drag strip and the Grand Prix tank, read
  through one bench file), `src/lab/lessons/fuel-classroom.js` (steps and model), `fuel-board.js`
  (board), `tools/test-lab-classroom-fuel.mjs`, `tools/scenarios/lab-classroom-fuel.mjs`.
- `src/lab/classroom/classroom-lessons.js` lists Fuel and weight.
- The notebook keeps the three words under the ids the old lesson saved (`fuel-word-0` Fuel load,
  `fuel-word-1` Litre, `fuel-word-2` Kilogram).
- The intro voice line (`lab.brian.fuel.intro`) no longer fits a step and is not played; it stays in
  the line list. The recap plays `lab.brian.fuel.explain`.

## Removed

- The old Fuel lesson: `src/lab/lessons/fuel-lesson.js` and `fuel-animation.js`.
- The jerry can's drawing in `tunnel-packet.js` (`partPicture('can')`) and its 3D part and fuel level
  in `tunnel-model.js`; nothing else used them. The can mesh stays inside
  `public/assets/models/lab/tunnel-parts.glb` until the last wind-tunnel lesson is rebuilt
  (Suspension, order 15), when the whole file and its recipe go.
- From `tools/test-lab-lessons-tunnel.mjs`: the Fuel packet and its expected outcome. The fuel
  bench's own check there (no laps control) stays.
- From `tools/scenarios/lab-lessons-tunnel.mjs`: Fuel from the default list; the lesson by keyboard
  and mouse, the notebook words with no progress awarded, the pass and the Tune page row are carried
  in `lab-classroom-fuel.mjs`.

## Changed assertions (Claude's review, rule 18)

- `tools/test-lab-lessons-tunnel.mjs`: only the removed lesson's packet left the list; the other four
  packets are tested as before. Nothing that tests remaining code was loosened.

## Review

The board was looked at as a player in three browser runs before the review. Look fixes: the cars
parked under the stopwatches and drove off the strip during the settle, a start line through the
lane names, the photo finish clipping the furthest car, the cloth leaving the gauge's numbers
showing, an empty half of the board in the weighing try (now a job card with the weight wanted, the
scale now and what one press weighs), a pump nozzle that read as a green box, and a recap bubble
that scrolled.

One independent code review (rule 17): nothing serious; four smaller faults, all fixed, with tests:
- "By weight" could not be failed: the step finished the moment the tank reached 50 litres, so
  holding ↓ passed it without reading the scale. Now nothing stops the pour; Space (or a click on
  the scale) weighs it, and a wrong weight says how far off and which way ("33.3 kg: 3.7 kg too
  light"). Under the cloth Brian no longer says the litres.
- The jerry can showed petrol nobody poured (it was drawn from the tank's level). It now holds only
  what went out of the tap.
- The jugs' click areas sat above the drawn jugs; they now match the drawing.
- A click on Brian's job card raced the car; only the race track (and the strip's lanes) race now.
From its minor notes: Watch again restarts the wonder and the watch at any time; the strip clears
when the player pours after a race; Show me's "Like that." now names what Brian did ("I pour it to
35 litres, the least that lasts, then race") instead of repeating a failure; the pass is said in
the classroom as "Fuel passed!" with what it opened.

## Checks

- `tools/test-lab-classroom-fuel.mjs`: 13 tests.
- Every `tools/test-lab-*.mjs` (27 files) passes.
- Lane tier: 38 passed on the first commit and 38 again with current integration merged in (9155e74a).
- Every Lab browser scenario (18): 17 passed together; `lab-walk` timed out walking to the weighing pad while the lane tier ran beside it and passed when rerun alone (gates rule). After the last fixes `lab-classroom-fuel`, `lab-classroom` and `lab-classroom-wax` passed again.
- `npm run build` passes.
