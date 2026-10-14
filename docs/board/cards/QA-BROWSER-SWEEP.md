# QA-BROWSER-SWEEP

The short board entry controls current state, ownership, dependencies and locks.

Claude, 14 October 08:00 PT. The full check's browser stage has failed two
nights running: 22 of 127 on 13 October and 23 of 129 on 14 October (adds
career-backup and grand-prix-pay). The full tier itself is clean apart from
two Claude paperwork slips, fixed this morning.

Start with the build error in the log: scenarios that bundle the game as
`iife` stop on "Top-level await is currently not supported with the 'iife'
output format" at `src/circuit-manifests.js:45` (`await modulesFromFiles()`,
from FAC-04 on 12 October). That one fault likely explains most of the list.
Then the named ones: audio-baseline ("Baseline audio changed"), track-review
("Scenario path must stay in QA tools"), career-backup ("Timed out waiting for
second QA career"), and the pages that closed under them. Evidence:
`.evidence/2026-10-14/FAC-03/night-99wbhD/browser.log`.

Rule 4's 30 minutes per failure, then a note here and back to building. Do not
loosen any scenario's checks. frame-pacing belongs to QA-FRAME-ENVIRONMENT.
