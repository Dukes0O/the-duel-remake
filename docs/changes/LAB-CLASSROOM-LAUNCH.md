# LAB-CLASSROOM-LAUNCH

Claude (Director and Release Manager), 3 November 2026. Rebuild order 11 of 15 (LAB-CLASSROOM
section 6), after Downforce. Kyle, 31 October: lessons are upgraded in the live game once green,
behind `lab-classroom` (on), with no Preview step.

## What changed

- Launch angles rebuilt as a classroom lesson: twelve steps in seven parts, script on
  `docs/board/cards/LAB-CLASSROOM-LAUNCH.md` ("Claude's script"). One scene in the steel workshop:
  Brian's launcher side on, its ramp tilting about the lip, a skier flying its arc over a landing
  deck level with the lip, a tape marked in metres and a flag when there is a mark to reach. Earlier
  launches stay as faded trails, each named at its top. The ramp panel (↑ steeper, ↓ flatter, 5
  degrees a press) and the speed dial (→ faster, ← slower, 1 m/s a press shown in mph, 29 to 54) sit
  on the right; below, a close-up for the words (a protractor, a speedometer, the tape), the launches
  table, or Brian's mark card. Space launches.
- The old lesson's faults are gone (the audit: the landing distance hidden before the run, the "Past
  the flag" picture printing the guided answer, a speed button that only went up while the challenge
  needed less speed). Both controls go both ways, every try and job mark starts away from its answer,
  and no card shows its answer before the pick.
- Wonder: 60 degrees lands 30.5 m, 30 degrees 31.6 m, both at 45 mph. Words: tilt the ramp from 60 to
  45; turn the dial from 40 to 45 mph; launch and read the tape (35.6 m). Watch: 15, 30, 45, 60 and 75
  degrees land 19.0, 31.6, 35.6, 30.5 and 17.7 m. Tries: a 30 m flag that 45 degrees overshoots, speed
  fixed (guess steeper, flatter or either; either way works: 60 lands 30.5 m, 30 lands 31.6 m); then 45
  degrees at 40 mph (guess 34, 30 or 20 m: 29.5 m).
- Brian's job: three marks. A 42 m flag with the ramp fixed at 45 degrees (49 mph); a 27 m flag with
  the speed fixed at 49 mph (20 or 70 degrees); Brian's own 30 m mark with both free, from 75 degrees
  and 36 mph. Every miss says how far short or past and the one thing to change.
- Questions: the partner of 50 degrees (40); which ramp goes furthest with the landing 10 m lower (40
  degrees, 43.6 m, beats 45 at 42.7 m); and on the Aerials run, whose kicker throws at about 50
  degrees, what makes you fly higher and further (tuck on the inrun for speed).
- Every distance is the launch bench's own (`launchBench.run`, `rangeOf`) with the skier's own air on
  and a level landing (question 2: the bench's 10 m lower landing); the board draws the bench's own
  flight path.
- The challenge is unchanged: the bench's goal (a landing within 2 m of the 30 m mark), passed on the
  lesson's own launches through `onChallenge`, as Downforce's fan runs are; the pass gives the free
  Aerials reward, so the Aerials run opens on the mountain. The save is unchanged.
- New files: `src/lab/lessons/launch-classroom.js`, `launch-board.js`,
  `tools/test-lab-classroom-launch.mjs`, `tools/scenarios/lab-classroom-launch.mjs`.
  `src/lab/classroom/classroom-lessons.js` lists Launch angles. The notebook keeps the three words
  under the ids the old lesson saved (`launch-launch-angle`, `launch-speed`, `launch-distance`). The
  Watch plays `lab.brian.launch.intro`, the recap `lab.brian.launch.explain`. Sounds: the Lab's clunk
  (ramp) and tick (dial).

## Removed

- The old Launch angles lesson: `src/lab/lessons/launch-lesson.js` and `launch-animation.js`.
- `mountSnow` from `src/lab/lessons/snow-display.js` (only the old Launch lesson used it;
  `nameFirstAid` stays for the Lab's hangar), and the props model only it loaded,
  `public/assets/models/lab/snow-lesson-props.glb` (1.3 MB), with its Blender recipe
  `tools/blender/lab-snow-props.py` and that recipe's row in `tools/test-blender-output.mjs`.
- Launch's part of `tools/test-lab-lessons-snow.mjs` (its packet, outcomes, drawings and cameras);
  the wax challenge's daily rules and the hangar's first-aid label stay there.
  `tools/scenarios/lab-lessons-snow.mjs` is removed: it played only the old Launch lesson, and
  `lab-classroom-launch.mjs` now plays Launch to the pass and the Aerials reward.

## Changed assertions (Claude's review, rule 18)

- `tools/test-lab-lessons-snow.mjs`: the Launch packet's flow, outcomes, 3D drawing and camera tests go
  with the lesson they tested (removed behaviour). That every drawn path ends where the bench says
  moves to the new suite, for every angle and speed the lesson offers, both landings. Nothing left is
  loosened.
- `tools/test-blender-output.mjs`: the removed recipe's row goes with the recipe and its model.

## Review

One independent review (read-only agent), on c97adfd4: no real fault. It probed Show me from every
ramp angle and dial setting on the flag try and all three marks (each reached its flag), checked that
no try or mark starts on its answer, that Back and forward keep the launches, that every "tilt toward
45" advice is true on the 5-degree grid, and that nothing removed is still needed. Small points,
fixed: a miss with the dial at 54 mph no longer advises more speed (a new assertion); Show me on "A
little slower" says the guess comes next instead of "then launch"; question 3's distances now say
they are the launcher's ("on the launcher at 50 degrees"), not the Aerials hill's; the comment on
`benchAttempts` says which steps land on the 30 m mark. Left for the cleanup sweep:
`tools/lab-snow-sheet.py` and the look sheet `docs/board/looks/lab-2/lab-lessons-snow-1.jpg` still
describe the old 3D Snow lessons (nothing reads them at run time).

## Checks

(pending)
