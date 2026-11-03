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

- `tools/test-lab-lesson-frame.mjs`: the QA example lesson borrowed the fire pit as id `fire`; with Fire a
  classroom now, it borrows the nail jars as id `rust` (a machine still on the five-step frame), and the
  registry check names `d.id` instead of `'fire'`. The same check, on another machine.
  `tools/scenarios/lab-lesson-frame.mjs` follows it to the nail jars; its key-idea-over-a-flight check goes,
  since no five-step lesson has a helicopter challenge any more (every classroom scenario checks that card).
- `tools/test-lab-lessons-flying.mjs` is removed with the lesson it tested. Its fire checks have
  their counterparts in the new suite, on the same rules: each tool takes its own side away
  (`TAKES_AWAY`, the bench), the open forest reaches the far side and a cleared or treated strip
  stops it (now on the challenge's own forest). Its sheet-name placement test goes with the sheets;
  `tools/test-repo-hygiene.mjs` allows one fewer sheet name, which is stricter, not looser. Its
  empty-drawing test covered `flying-display.js`, which is gone. Nothing is loosened.

## Review

One independent review (a separate agent: 300 random games of 400 actions through the session, every
number checked with node, a click where the pointer is on every step and every trip of the job) found no
dead end, no early pass and every number true. Its findings, all fixed:
- Real: the `lab-lesson-frame` browser scenario still opened its example at the fire pit, which now opens
  the classroom (it timed out in the full Lab run, as predicted). Moved to the nail jars.
- Brian praised "the flames nearest the road first, each time" whenever the fire went out; now only when
  every drop was where his pointer would have gone, and otherwise he says to start at the front next time.
- Question 3 said a full bucket puts out "up to 3" while the job's first drop put out six: it now says
  three cells at full strength, more smaller ones, and the splash line says leftover water runs on to the
  flames next to it.
- A test branch that never ran (water on green trees) now runs on a fresh job; the strip try's small
  triangle said OUT with the forest still burning (now a flame and "No fuel in the strip"); the Space
  keys drawn on the board take clicks; the card's keys match the build (1, 2, 3); plainer words ("out"
  for a cell put out, "full strength", "patch of forest", "after the flames spread 4 more times").

## Checks

- `tools/test-lab-classroom-fire.mjs`: 10 of 10 (numbers from the game's rules, including the forest
  spreading cell for cell as the challenge's does; a child following the prompts passes; the words; the
  tries set up, ask, then test, and each wrong guess says why; Brian's job: the pointer's way puts it out
  in three trips, the back first loses the road in two and starts again, wasted drops say why; every
  wrong answer says why; help climbs to Show me; the board draws every step and a click where the
  pointer is does what it shows; Previous step and Watch again).
- Every `tools/test-lab-*.mjs`: 30 suites, 335 tests, all pass (after the review fixes).
- Lane tier: 46 of 46 before the review fixes, 47 of 47 after; build passes both times.
- Lab browser scenarios, 21: 20 passed, `lab-lesson-frame` failed as the review predicted; after the fix,
  `lab-lesson-frame` and `lab-classroom-fire` pass (the Fire walkthrough: keyboard, two mouse clicks,
  Show me tipping the sand bucket, a wrong guess and why, the job by click and arrow keys, the helicopter
  challenge with its card).
- Looks, from the walkthrough pictures (deleted after review): first round had triangle labels under the
  crosses, bucket names inside their handles, the tipped bucket vanishing, an overflowing recap card and a
  caption running off the board; all fixed and checked again.
