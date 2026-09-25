# JANITOR-P2: phase-2 documentation sweep

## Choice before changes

Fold the unique acceptance history from completed BAL-02, GFX-01-P1 and EGG-02-P1 notes into current decisions. Delete those notes and the fully represented PHASE2-BOARD note. Update current asset measurements and put uncertain audit candidates on CLEAN-11. Preserve active lanes, current runtime assets, reference art and licensed sources. Text history retains old experiment details; no binary history rewrite is part of this sweep.

## Verification

A separate agent compared all four notes against decisions, board, run log and review notes before deletion. No runtime code or assertion changes, so no new tests are needed. Run the required lane tier and build before merge. Final gate results and byte deltas go in the run log.

## Removed

Four consumed task notes, after the evidence fold. No source, test, asset, branch or player data removed in this lane. Its own note will be deleted after the verdict is folded into the current log.
