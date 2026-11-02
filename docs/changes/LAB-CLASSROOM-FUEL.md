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
  "Finish the lesson" (Enter) passes it and the board says Fuel load is open on the Tune page.
  `classroom-ui.js` takes the last button's words from the lesson (`finishLabel`).
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

## Checks

- `tools/test-lab-classroom-fuel.mjs`: 11 tests.
- Every `tools/test-lab-*.mjs` (27 files) passes.
