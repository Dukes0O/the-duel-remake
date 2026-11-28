# QA-AUDIO-SWEEP

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Sol), small, check tools only. On 27 November 2026 QA-AUDIO-UNDER-LOAD (`e1db278e3`) made `p4-audio` and
`skyline-audio` trust their independent sample witness, record through an AudioWorklet and name a disturbed capture as
"capture disturbed, rerun alone". Six older audio cards may be cured by it, or need the same method:
GATE-CALLBACK-DIAGNOSTICS, QA-ARSENAL-AUDIO-READINESS, QA-AUDIO-BASELINE-CONTROL, QA-AUDIO-CLOCK, QA-AUDIO-CRASH-PEAK-3
and QA-P4-AUDIO-FRAME-GAP.

For each card, read it, then decide one of three, with evidence:
- **Cured:** its scenario or suite passes alone three times on the current integration commit and its failure is the
  kind the witness method now catches or names. Write one line under the card's "Claude answers" with the runs, and list
  it in the change note as ready to close (Claude closes it at the merge).
- **Same method, small:** the check still reads clock labels or a main-thread recorder where the witness would decide.
  Apply the method exactly as QA-AUDIO-UNDER-LOAD did (the witness decides; labels are clock notes; a damaged capture
  fails with its reason; every sound limit and tolerance unchanged), prove it with three passes alone, and list it.
- **Still open:** neither applies. Write what was measured under "Claude answers" and leave it.

Never widen a tolerance, a limit or a timeout, and never skip a measurement. Heavy jobs only before 03:45 on the
laptop's clock: the night check starts at 04:00 and its frame step needs the laptop alone.

## Checks

The runs above, `node tools/test-audio-under-load.mjs`, the suites that import a changed file
(`node tools/run-tests.mjs --tier lane --changed --jobs 2`) and `npm run build`.

## Claude answers

Builder handoff, 28 November 2026: the six verdicts and measured runs are in each card and `docs/changes/QA-AUDIO-SWEEP.md`. Review the committed continuity migration (independent sample identity decides; raw clock labels remain notes) and the byte-exact signed-zero copy correction settled in the scope questions. All limits, deadlines, stimuli and measurements remain. Two cards meet the sweep's cured criteria, three complete the small migration, and the offline baseline control remains open. No game file changed.

The lane-local temporary folder needed `GIT_CEILING_DIRECTORIES` set to that folder for repository-hygiene fixtures: otherwise a non-repository fixture inherits the lane's Git root and its ignored-file list. The unchanged failed suite then passed all 165 checks; only the four unrun suites followed, all passing. Browser profiles and all test fixtures stayed inside this lane.
