# LAB-CLASSROOM-FIRE

Claude (Director and Release Manager), 3 November 2026. Rebuild order 9 of 15 (LAB-CLASSROOM
section 6), after Air and altitude. Kyle, 31 October: lessons are upgraded in the live game once
green, behind `lab-classroom` (on), with no Preview step.

## What changed

- Fire triangle rebuilt as a classroom lesson: fifteen steps in seven parts, script on
  `docs/board/cards/LAB-CLASSROOM-FIRE.md` ("Claude's script"). Two scenes in the steel workshop:
  Brian's fire pit (gas burner, logs, a lid on a hinge) with one switch plate per side of the
  triangle, each saying its state in words (Wood: fuel, IN or OUT, key 1; Gas: heat, ON or OFF, key 2;
  Lid: air, OPEN or SHUT, key 3), the fire triangle beside it (a side lit while the fire has it, dark
  with a cross once it is gone), and the water and sand buckets; and the practice fire's forest seen
  from above, the lake on the left and the road on the right.
- The old lesson's faults are gone (the audit: the coat button turned off with its tick still on, the
  raked strip vanished once coated, the text named Brian while he was hidden). No control toggles
  back, every plate says what it is set to, and every action stays in the picture: a raked strip stays
  bare, a coat stays pink, a drop leaves its splash.
- The words build the fire: wood in (it does not burn alone), gas on (it catches), lid shut (it dies
  with the gas on and the wood there: the wonder's answer), lid open (all three sides, it burns).
  Watch: Brian takes away each side in turn and a table fills in. Tries: guess which side the water,
  the sand and a raked strip take away, then do it; a wrong guess says what was still there.
  Retardant: coat the trees in front and the flames stop at them.
- Every number is the game's own. The pit is `fireBench.run`. The forest is the helicopter challenge's
  practice fire: its 6 by 3 cells, its seed, its start cell at 75%, spread by the game's `spreadStep`
  (the test checks it spreads cell for cell as the challenge's does), watered by `applyWater` with
  the game's 600-litre bucket and coated by `applyRetardant` (150 litres a cell; the Retardant tank's
  600 litres coat four). A cell burning flat out takes 180 litres. With nothing in its way the try's
  fire reaches the road in four spreads; a raked or coated strip stops it at the column before.
- Brian's job is the challenge in small: one bucket a trip on the cell the player picks (arrow keys
  and Space, or a click), the fire spreading once each trip. The flames nearest the road first put it
  out in three trips; water on the back flames first loses the road in two, says why and starts again;
  a drop on burnt ground or green trees says what it did.
- The challenge is unchanged: keep the practice fire off the road for 7 minutes, or put it out. The
  card says so. The Retardant tank reward and the save are unchanged.
- New files: `src/lab/lessons/fire-classroom.js`, `fire-board.js`, `tools/test-lab-classroom-fire.mjs`,
  `tools/scenarios/lab-classroom-fire.mjs`. `src/lab/classroom/classroom-lessons.js` lists Fire
  triangle. `src/lab/benches/fire.js` passes on the game's fire and bucket rules for the lesson (Lab
  files reach the helicopter's rules only through a bench). The notebook keeps the five words under
  the ids the old lesson saved (`fire-fuel`, `fire-heat`, `fire-oxygen`, `fire-fire-triangle`,
  `fire-retardant`). The Watch plays `lab.brian.fire.intro`, the recap `lab.brian.fire.explain`.
  Sounds: the Lab's clunk (wood, lid, sand, rake), burner (gas), splash (water) and fizz (retardant).

## Removed

- The old Fire triangle lesson: `src/lab/lessons/fire-lesson.js` and `fire-animation.js`. The fire
  pit's 3D model stays: the Lab room still shows it.
- It was the last lesson on the old flying display, so that goes too: `src/lab/lessons/flying-display.js`
  and `flying-helicopter.js` (already imported by nothing), `tools/test-lab-lessons-flying.mjs`,
  `tools/scenarios/lab-lessons-flying.mjs`, the flying look sheets (`docs/board/looks/lab-2/lab-lessons-flying-1.jpg`,
  `-2.jpg` and their reviews), the script that built them (`tools/lab-flying-sheet.py`) and their
  name on the hygiene check's list of allowed sheets.

## Changed assertions (Claude's review, rule 18)

- `tools/test-lab-lessons-flying.mjs` is removed with the lesson it tested. Its fire checks have
  their counterparts in the new suite, on the same rules: each tool takes its own side away
  (`TAKES_AWAY`, the bench), the open forest reaches the far side and a cleared or treated strip
  stops it (now on the challenge's own forest). Its sheet-name placement test goes with the sheets;
  `tools/test-repo-hygiene.mjs` allows one fewer sheet name, which is stricter, not looser. Its
  empty-drawing test covered `flying-display.js`, which is gone. Nothing is loosened.
