# QA-WIDE-FILES

Left by QA-CHECKS-BY-CARD (merged 16 November 2026). Claude's design card; the code that follows is small and Codex's.

With the long suites sent to the night, a lane's cost is now set by how many short suites one changed file picks. Codex
counted, for every game file, the suites a change to that file alone picks (the nine standing guards included). Most
pick under forty. These pick far more:

| File | Suites | File | Suites |
| --- | --- | --- | --- |
| `src/circuits/index.js` | 299 | `src/course.js` | 177 |
| `src/freestyle-course.js` | 283 | `src/rng.js` | 166 |
| `src/bowl/bowl-course.js` | 275 | `src/wasteland-access.js` | 138 |
| `src/expansion-courses.js` | 275 | `src/combat-weapons.js` | 118 |
| `src/progression.js` | 215 | `src/wasteland-tuning.js` | 117 |
| `src/circuit-manifests.js` | 178 | `src/summit-attack.js`, `src/drivers.js`, `src/arsenal/targeting.js` | 108, 103, 102 |

About 150 more files pick between 41 and 100. The whole table is in the merge commit of QA-CHECKS-BY-CARD.

## The question to settle before any code

Each of these is imported by a great many suites as a plain helper (a course list, the seeded generator, the unlock
rules). The runner already has the tool for this: `SHARED_FILES` in `tools/run-tests.mjs`, where a file is given a few
owner suites and importing it no longer picks a suite. For each file above, decide:

- which two to five suites truly test that file (its owners);
- whether the replay and world-signature guards, which run in every lane, already cover the rest;
- what the night then catches that a lane no longer does, and whether that is acceptable for that file. The save rules in
  `src/progression.js` and the seeded generator are the two to be most careful with.

## What done looks like

A ruling per file in this card, then a Codex job that adds the owners to `SHARED_FILES` with a check in
`tools/test-test-runner.mjs`, and a before-and-after count for three recent real cards.
