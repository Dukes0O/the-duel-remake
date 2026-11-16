# MACHINE-BORER-APPRENTICE, slice 1

A1 records stalls, cutting time and the distance the rock would have allowed while cutting. A completed cut to daylight of at least 100 m yields its height error from the mouth, stalls per 100 m and pace against the rock. An underground breakthrough does not count.

A2 is underway. The Dig holds Pim and the observed lessons in memory. The town apprentice module now records the mean of two valid bore lessons, improves each figure independently on later lessons, and applies the Easy limits when requested. Daylight passes a valid hand-cut lesson to it, and the Dig passes the current Easy setting. Completed daylight tunnels are retained in the visit state. After Mabel drives 12 m beyond a daylight mouth, she can turn and start another cut. Displaying and using all retained tunnels together still needs work.

A3 shows Pim riding along and records the survey, freeing a stall, holding the surveyed grade for 50 m, and daylight from the current cut. On the second cut Pim reads the survey distance and rise. The observations reset for the next cut and require no extra ground samples.

A4 adds a send button and F key at a surveyed, accepted face for a taught apprentice. It queues a town work order with the mouth, heading, grade and distance. A face already in the queue cannot be sent twice with the same heading. This step does not yet advance the orders.

A5 has started. The town's delegated-work function now accepts a bore's measured cutting distance and daylight result. It keeps the order open beyond the surveyed distance and finishes it only at daylight. It does not change the taught pace on each simulation step. The Dig still needs to drive Mabel and report her results to this function.

The apprentice's controls now set the lever to the taught share of the rock limit and turn the head toward the surveyed grade plus the learned height error, using Mabel's own steering limits. They release the lever when she stalls. These controls do not sample the land. They are not connected to the Dig yet; the 20-second stall delay and the order's progress still need to be built.

## Checks

- `node tools/test-machine-borer-lesson.mjs`: passed. Scripted clean, stalled, off-level and slow cuts, plus short and unfinished cuts.
- `node tools/test-machine-borer-apprentice.mjs`: passed. Invalid cuts, two-cut means, later improvements, the Dig's Easy setting and limits, retaining a finished tunnel once, and freeing Mabel for a second cut.
- `node tools/test-town-apprentices.mjs`: passed, 16 checks.
- A3: `node tools/test-machine-borer-apprentice.mjs` passed, including observations, grade limits, second-cut survey words and reset.
- A4: `node tools/test-machine-borer-apprentice.mjs` passed, including missing teaching or survey, refused faces, line details and queue order.
- A5 work-order support: `node tools/test-town-apprentices.mjs` passed, 21 checks, including measured distance, no work while time is stopped, and daylight completion.
- A5 apprentice controls: `node tools/test-machine-borer-lesson.mjs` passed. The real cutter held both tested paces and reached the learned grade in rock; stalled controls release the lever.
- Remaining card checks, replay checks and build: not run yet.
- Race fingerprints: not checked yet.

## Changed assertions, for Claude to review

None.

## Codex decided (Claude to review)

Pace compares distance cut with the distance the same rock allowed during successful cutting steps. Stalls are recorded separately. Waiting, reversing and refusals do not count as cutting time.

Mabel clears a daylight mouth by 12 m before she is ready for another cut. She can reverse back into the tunnel before then.

Holding the grade means 50 consecutive metres within 1 in 50 of the surveyed grade.

A face already in the bore queue cannot be sent a second time with the same heading.

The learned height error is spread upward over the surveyed distance. It is a magnitude in the existing lesson record, so it does not carry a direction.

## Sound

No new sound event in A1, A3 or A4. Existing stall and daylight cues remain `borer.stall` and `borer.daylight`.

## Removed

Nothing. This adds measurements to Mabel's existing cutting rules. The rest of this card will use them.

## For Claude to run

The apprentice browser scenario and the hand play check, once the remaining steps are built.
