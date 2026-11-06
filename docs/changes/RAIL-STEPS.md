# RAIL-STEPS

## Changed

- Added the railway fields and the `runaway`, `dig` and `whistle` step kinds to the existing world-job engine.
- Drivetrain acceleration and braking use force divided by consist mass. Grade force uses 9.81 m/s² and the configured signed ratio. Stop marks keep the best error as a number in the job's additive `storyMarks` field; ride along reads the prior stop distance.
- Runaways conserve momentum on a soft coupling and bounce on a hard contact. Token locks, hoop retries and sand drags keep the job recoverable. Digging tracks pile tonnes, fires the reveal once and can hand the remaining work to an apprentice. Whistle calls start a silent goat wait.
- No job data is wired into the game. No save format or released-course replay changed.

## Checks

- `node tools/test-rail-steps.mjs` — passed. This includes headless real Duel braking input and the specified new-step scenarios.
- The 260 tonne, 1 in 30 bank stopped from 9 m/s in **191.3 m**. At 15 m/s it reached the sand drag and returned to the top. These values follow the configured mass, 140 kN brake force and grade.
- The earlier `tools/test-iron-mule-*.mjs` names are absent from this lane. `tools/test-iron-line.mjs` and the existing job suites are still to be run.
- Claude should check the later rail-job integration against stop marks, token swaps and hoops, runaway recovery, the dig reveal, whistle wait, and ride-along stopping. No browser or look check is needed for this engine-only change.

## Changed assertions

None.

## Race fingerprints

Unchanged. No released course or replay code was changed.

## Removed

Nothing.
