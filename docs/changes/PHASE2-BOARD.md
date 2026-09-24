# Phase 2 board triage

## Design

The art polish cards need their base art only. GFX-04 is a later yard card, so it no longer gates GFX-01-P1, GFX-02-P1 or EGG-02-P1. BUG-06 and BUG-07 retain their integrated fixes; BAL-02 owns their measured remaining balance work. CREW-01 keeps only the three perks whose mechanics do not yet exist. AUD-01 and AUD-02 have their implemented cues and verification merged; future sounds and full-race listening become follow-up work. TOOL-02 has no active branch and remains backlog for its exact-source feel and listening checks. Reversal: restore an explicit dependency only if a tested asset or hook actually requires the yard; reopen an old card only with a scoped, owned slice.

## Checks

- Lane tier: 6 suites passed, 0 failed, 518 source checks; rerun after this note.
- Build: passed; rerun after this note.
- Browser: not needed for board metadata.
- Replay fingerprints: no simulation files changed.
- Changed assertions: none.

## Removed

- False GFX-04 dependencies and stale active statuses. No game files removed.
