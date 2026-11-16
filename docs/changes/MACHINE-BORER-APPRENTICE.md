# MACHINE-BORER-APPRENTICE, slice 1

A1 records stalls, cutting time and the distance the rock would have allowed while cutting. A completed cut to daylight of at least 100 m yields its height error from the mouth, stalls per 100 m and pace against the rock. An underground breakthrough does not count.

A2 is underway. The Dig holds Pim and the observed lessons in memory. The town apprentice module now records the mean of two valid bore lessons, improves each figure independently on later lessons, and applies the Easy limits when requested. Daylight passes a valid hand-cut lesson to it, and the Dig passes the current Easy setting. Completed daylight tunnels are retained in the visit state. After Mabel drives 12 m beyond a daylight mouth, she can turn and start another cut. Displaying and using all retained tunnels together still needs work.

A3 shows Pim riding along and records the survey, freeing a stall, holding the surveyed grade for 50 m, and daylight from the current cut. On the second cut Pim reads the survey distance and rise. The observations reset for the next cut and require no extra ground samples.

## Checks

- `node tools/test-machine-borer-lesson.mjs`: passed. Scripted clean, stalled, off-level and slow cuts, plus short and unfinished cuts.
- `node tools/test-machine-borer-apprentice.mjs`: passed. Invalid cuts, two-cut means, later improvements, the Dig's Easy setting and limits, retaining a finished tunnel once, and freeing Mabel for a second cut.
- `node tools/test-town-apprentices.mjs`: passed, 16 checks.
- A3: `node tools/test-machine-borer-apprentice.mjs` passed, including observations, grade limits, second-cut survey words and reset.
- Remaining card checks, replay checks and build: not run yet.
- Race fingerprints: not checked yet.

## Changed assertions, for Claude to review

None.

## Codex decided (Claude to review)

Pace compares distance cut with the distance the same rock allowed during successful cutting steps. Stalls are recorded separately. Waiting, reversing and refusals do not count as cutting time.

Mabel clears a daylight mouth by 12 m before she is ready for another cut. She can reverse back into the tunnel before then.

Holding the grade means 50 consecutive metres within 1 in 50 of the surveyed grade.

## Sound

No new sound event in A1 or A3. Existing stall and daylight cues remain `borer.stall` and `borer.daylight`.

## Removed

Nothing. This adds measurements to Mabel's existing cutting rules. The rest of this card will use them.

## For Claude to run

The apprentice browser scenario and the hand play check, once the remaining steps are built.
