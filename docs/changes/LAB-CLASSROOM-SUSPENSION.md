# LAB-CLASSROOM-SUSPENSION

## What changed

Expanded Suspension to a 16-step classroom lesson. Brian teaches spring,
spring stiffness, weight transfer, body roll, body shake, and the costs of a
stiffer spring before the predictions. The formula panel shows a worked roll
calculation from visible metric inputs. The Watch changes through all four
spring and road pairs; its board readings change with those settings. The
learner predicts two different comparisons, tests three unique settings,
works toward a less-than-3-degree target, answers three review questions, and
gets recap cards with readings.

The rear-view board draws the car at its measured roll angle, with one spring
compressing and the other extending. A fixed corner key names the body,
compression, extension and sideways push. The physics panel keeps worked
answers hidden while a prediction or check is open. The board contract checks
sendable arrow glyphs, held-key pacing, targets, hit areas and rectangle bounds,
including the run button.

The old challenge prompt now asks for both springs on each road. Its four-pair
goal, reward, save and classroom attempt path are unchanged. Legacy answer and
result wording now uses “body roll” consistently. The Lab-map scenario now
walks to the wind tunnel, opens its lesson list, selects Suspension and sets
the driving lesson gate in memory. It captures a screenshot for every lesson
step when Claude runs it.

## Checks

- `node --test tools/test-lab-classroom.mjs`: **40 passed, 0 failed**.
- `node --test tools/test-lab-classroom-page.mjs`: **6 passed, 0 failed**.
- `npm run build`: PowerShell blocked `npm.ps1`; the same build passed as
  `npm.cmd run build`. Vite reported its existing large-chunk and dynamic
  import warnings.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`:
  all 45 selected suites reached PASS in the output log. The command process
  had not returned when this note was written; final process status is recorded
  after it exits.
- Browser scenario: not run because Chrome is unavailable in this job. The
  keyboard-only scenario is ready for Claude and captures each step.
- The sorted-unique classroom-part assertion now allows predictions before
  Watch. That order keeps the Watch readings from giving away the predictions;
  all seven parts remain required. The wrong-prediction assertion now checks
  the two real readings, whose explanation spells out “m/s squared.” Neither
  change weakens an acceptance check.
- Race fingerprints: none recorded or changed. Suspension race rules were
  untouched.

## Removed

- Removed the outdated “other spring” challenge wording and “lean” challenge
  labels from the legacy Suspension lesson specification.
- No source files removed; legacy lesson removal remains LAB-CLASSROOM-LIVE.
