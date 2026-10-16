# QA-REVIEW-RUNUP-START

The existing track-review placement can miss its requested point near the start line while the harness reports success. This is a QA view fault; no player-driving cause is proved.

During the three-frame pit-tone recipe on7e3ee577, frame1 requested55.076493m. Its plan started at6629.238765m and targeted6739.076493m, but it returned absolute/phase2020.534535m and reported -4663.465465m. There were no browser errors or warnings. The grid frame and La Fontaine frame2 (phase390.244539m for requested389.937198m) are valid; only those two pictures are used for the pit-material review. The generated pack contains two Duel cars, not an eight-car GP acceptance.

Retained packet: .evidence/2026-10-15/QA-REVIEW-RUNUP-START. It contains the unchanged input, actual report/poses, log and misplaced02-c1-brake.jpg. The historical headless trace is framing data, not a new lap-time claim. Cause is unknown. Do not alter the original packet or call this source's three requested positions verified.

Future owned files: tools/scenarios/track-review.mjs, existing tools/test-track-review.mjs and own change note. First diagnose the existing near-start run-up and its600-step guard using actual native state. Keep current targets, clocks, driver and placement semantics; no fake pose, physics/road fix, extra harness or tolerance waiver. A corrected existing guard must refuse a missed target rather than label it as reached. Settle any additional hook before code. One independent review, targeted lane/jobs4 and build before merge. Stop after30minutes if the cause remains unresolved.

This low-priority backlog card does not block Ardennes: the full native eight-car two-lap check passed on545158d0, and this later correction changes only pit drawing. No further capture or source investigation is started now.
