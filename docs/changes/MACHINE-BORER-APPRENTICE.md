# MACHINE-BORER-APPRENTICE, slice 1

A1 records stalls, cutting time and the distance the rock would have allowed while cutting. A completed cut to daylight of at least 100 m yields its height error from the mouth, stalls per 100 m and pace against the rock. An underground breakthrough does not count.

A2 is underway. The Dig holds Pim and the observed lessons in memory. The town apprentice module now records the mean of two valid bore lessons, improves each figure independently on later lessons, and applies the Easy limits when requested. Daylight passes a valid hand-cut lesson to it, and the Dig passes the current Easy setting. Completed daylight tunnels are now retained in the visit state. A second independent bore still needs a way to start and display all retained tunnels.

## Checks

- `node tools/test-machine-borer-lesson.mjs`: passed. Scripted clean, stalled, off-level and slow cuts, plus short and unfinished cuts.
- `node tools/test-machine-borer-apprentice.mjs`: passed. Invalid cuts, two-cut means, later improvements, the Dig's Easy setting and limits, and retaining a finished tunnel once.
- `node tools/test-town-apprentices.mjs`: passed, 16 checks.
- Remaining card checks, replay checks and build: not run yet.
- Race fingerprints: not checked yet.

## Changed assertions, for Claude to review

None.

## Codex decided (Claude to review)

Pace compares distance cut with the distance the same rock allowed during successful cutting steps. Stalls are recorded separately. Waiting, reversing and refusals do not count as cutting time.

## Sound

No new game event in A1. Existing stall and daylight cues remain `borer.stall` and `borer.daylight`.

## Removed

Nothing. This adds measurements to Mabel's existing cutting rules. The rest of this card will use them.

## For Claude to run

The apprentice browser scenario and the hand play check, once the remaining steps are built.
