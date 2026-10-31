# LAB-CLASSROOM-LIVE

The short board entry controls current state, ownership, dependencies and locks.

Switch `lab-classroom` on once Kyle and Gratian have tried the pendulum classroom
(Gratian tries screen changes first). Claude decides the go-live after their try.

- Remove the old pendulum lesson in the same change (replace means remove):
  `src/lab/lessons/pendulum-lesson.js` and `pendulum-animation.js`, their parts of
  `tools/test-lab-lessons-flying.mjs` and `tools/scenarios/lab-lessons-flying.mjs`.
  The pendulum's notebook words (`pendulum-pendulum`, `pendulum-swing-time`,
  `pendulum-length`) then need registering from the classroom lesson so the notebook
  and the underlined words keep working.
- Each later LAB-CLASSROOM-<lesson> card removes its own old lesson files when it goes live.
- Checks: Lab, save and hygiene suites; every `tools/test-lab-*.mjs`; the Lab browser
  scenarios with the switch on.
