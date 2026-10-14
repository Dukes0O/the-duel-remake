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

## Director claim and first repair scope — 14 October

Claim codex/qa-browser-sweep in its own tools lane. First repair only the existing native helper bundles that emit iife and now import the FAC-04 registry's top-level await. Preserve production registry discovery, validation, course order, flags, saves and every scenario assertion. Prefer the existing ES-module/async helper pattern already used by native course scenarios. Own the affected tools/scenarios helper files, their existing relevant tool tests if an actual regression needs one, and docs/changes/QA-BROWSER-SWEEP.md. No production hook is granted before a concrete need is reported. Use the actual failing browser scenarios for acceptance; no repeated whole browser sweep or full tier. Each other named failure gets its own bounded 30-minute investigation and preserved facts, without weakened pins or tolerances. Root owns board/status, independent review, merge and this new lane's cleanup. Source preparation in the retained Yeti lane is complete; it stays parked while this higher-priority repair builds.