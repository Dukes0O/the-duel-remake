# LAB-CLASSROOM-PROJECTILE

Claude (Director and Release Manager), 1 November 2026. Rebuild order 2 of 15 (LAB-CLASSROOM
section 6), after Lift. Kyle, 31 October: lessons are upgraded in the live game once green, behind
`lab-classroom` (on), with no Preview step.

## What changed

- Projectile motion rebuilt as a classroom lesson: thirteen steps in seven parts, script on
  `docs/board/cards/LAB-CLASSROOM-PROJECTILE.md` ("Claude's script"). Kestrel One side on over the
  lake with a stone or the water bucket on her hook; every drop leaves its path and a landing mark
  with its distance, on a ruler in metres. The old drop tower (a flag that took 66 presses, a
  landing mark that was never drawn) is gone.
- Every water path and landing comes from `waterTrace` in `benches/projectile.js`, which steps the
  bucket's own parcels, the ones the challenge's buoys are hit by; the stone is the same fall with
  no air. Speeds are in m/s, as on the helicopter's airspeed readout.
- The tries: put the flag where the water will land (← and →, A and D, or drag it on the water,
  then Space), and low or high (a guess card, then Space). Brian's job: hit the buoy at 10 m/s,
  Space to fly and Space again to let go; each miss gives the metres before the buoy, the metres
  the water carried on and the miss, which always add up, and the same number is on the water.
  Show me flies the run and lets go 10 m before the buoy.
- Let go is Space, because H is Help in the Lab; Brian and the key idea card say H pours in the
  helicopter. The key idea card: "Let go before the buoy. The water keeps your forward speed: hold
  H to pour before you reach it."
- New files: `src/lab/lessons/projectile-classroom.js` (steps and model), `projectile-board.js`
  (board), `tools/test-lab-classroom-projectile.mjs`, `tools/scenarios/lab-classroom-projectile.mjs`.
- `src/lab/classroom/classroom-ui.js`: ←, →, A and D keys; a lesson can name its own action
  buttons (`buttons` in its view), here "Fly", "Let go" and "Go round again".
- `src/lab/classroom/classroom-lessons.js` lists Projectile motion.
- The notebook keeps the three words under the ids the old lesson saved (`projectile-gravity`,
  `projectile-forward-speed`, `projectile-arc`).
- The intro voice line (`lab.brian.projectile.intro`, "pick a height and a forward speed") no
  longer fits a step and is not played; it stays in the line list.
- Board: LAB-CLASSROOM-PROJECTILE claimed by Claude (Codex paused until about 4 November) and done.

## Removed

- The old Projectile lesson: `src/lab/lessons/projectile-lesson.js` and `projectile-animation.js`.
- From `tools/test-lab-lessons-flying.mjs`: the projectile packet and its 3D drawing tests. The
  physics checks in them that still mean something moved to `test-lab-classroom-projectile.mjs`:
  the parcel trace ends where the aim ring lands (same time, height 0), a stone falls g t²/2, and
  forward speed does not change a stone's fall time. The old flag verdict grid (a 0.5 m flag
  window over every height, speed and flag) went with the flag it tested.
- From `tools/scenarios/lab-lessons-flying.mjs`: the projectile run. Its checks are carried in
  `lab-classroom-projectile.mjs`: walking up to the drop tower with the keys and E, a mouse drag of
  the flag, a missed try with Brian's reason, the notebook words with no progress awarded by
  teaching, and the key idea card clear of every button in the helicopter challenge. The "model
  scale explained once" check stays with Fire and Air, which still show it.

## Changed assertions (Claude's review, rule 18)

- `tools/test-lab-lessons-flying.mjs`: only tests of the removed lesson went ("all three packets"
  is now "both packets", Fire and Air); the kept physics checks moved, unchanged, to the new suite.
  Nothing that tests remaining code was loosened.

## Review

## Checks
