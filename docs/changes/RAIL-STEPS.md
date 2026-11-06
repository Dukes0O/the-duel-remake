# RAIL-STEPS

## Changed

- Added the railway fields and the `runaway`, `dig` and `whistle` step kinds to the existing world-job engine.
- Drivetrain acceleration and braking use force divided by consist mass. Grade force uses 9.81 m/s² and the configured signed ratio. Stop marks keep the best error as a number in the job's additive `storyMarks` field; ride along reads the prior stop distance.
- Runaways conserve momentum on a soft coupling and bounce on a hard contact. Token locks, hoop retries and sand drags keep the job recoverable. Digging tracks pile tonnes, fires the reveal once and can hand the remaining work to an apprentice. Whistle calls start a silent goat wait.
- No job data is wired into the game. No save format or released-course replay changed.

## Checks

- `node tools/test-rail-steps.mjs` — passed. This includes headless real Duel braking input and the specified new-step scenarios.
- The 260 tonne, 1 in 30 bank stopped from 9 m/s in **191.5 m**. At 15 m/s it reached the **500.3 m** sand drag and returned to the top. These values follow the configured mass, 140 kN brake force and grade. The 9 m/s result is 1.5 m beyond the card's approximate 190 m figure.
- `tools/test-iron-line.mjs` — passed. No `tools/test-iron-mule-*.mjs` file exists in this lane.
- `tools/test-heli-job-clarity.mjs` — passed, 1,530 checks. `tools/test-heli-jobs.mjs` — passed, 5,802 checks. `tools/test-world-job-mode.mjs` and `tools/test-world-jobs.mjs` — passed.
- `node tools/test-repo-hygiene.mjs` — passed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4` — all 29 suites reported `PASS`; the runner stayed open after the final suite, so it did not return an exit code or summary.
- `npm run build` — passed after the review fixes. Vite reported the existing dynamic-import and large-chunk warnings.
- Claude should check the later rail-job integration against stop marks, token swaps and hoops, runaway recovery, the dig reveal, whistle wait, and ride-along stopping. No browser or look check is needed for this engine-only change.
- Reviewer follow-up: corrected stop marks to retain the true stopping distance past the path endpoint, show the overrun position, and made coupled wagons share the consist speed. The focused suite passes with these regressions covered. The production token view hook still needs the Director’s scope decision.

## Changed assertions

One existing consist-speed assertion now expects the configured tractive force divided by consist mass. The prior expectation incorrectly subtracted coast drag while throttle was held. Added assertions cover unchanged legacy throttle behavior, measured stop error, and braking a coupled consist. The new compatibility assertion caught an initial throttle/coasting difference during development; the old throttle branch behavior was restored and the final focused suite passed.

## Race fingerprints

Unchanged. No released course or replay code was changed.

## Removed

Nothing.
