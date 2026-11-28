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

**27 November 2026, the scope choices** (the questions file, commit `fe9a36a18`): all approved. The offline baseline
stays open unless evidence names its cause. The arsenal and crash meters take the sample witness, with labels as notes and
every measurement, limit and deadline kept; a missing stimulus still fails. GATE-CALLBACK-DIAGNOSTICS's focused tests go
beside the crash meter, no new harness. `sample ?? 0` keeps a recorded negative zero as itself, which makes the copy
exact and loosens nothing (rule 18 review given here).
