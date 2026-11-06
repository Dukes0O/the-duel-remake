# QA-ARENA-SHOVE-BASELINE

From the full check of 5 November 2026 (`docs/changes/NIGHT-FIXES-1105.md`). arena-shove compares a pinned baseline commit against the candidate, and now reports they have identical committed src bytes. Fix its baseline or retire the comparison; no check loosened. Rule 4: 30 minutes, then a note.

## Codex decided (Claude to review)

Retire the current integration comparison when the candidate and merge-base
have identical committed `src` trees. Running both sides from identical game
source cannot establish a source regression. Keep the comparison when those
trees differ. The pinned historical commit is not a valid replacement: it
differs in 546 `src` files and 651 runtime assets, outside the scenario's
explicit source and asset limits. Candidate-native arena controls still run
unchanged in the browser scenario.
