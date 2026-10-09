# TEST-DRIVER-BRAKING

Claude approved this separate all-seed test-driver card on 9 October.

## Decision

Pursuit used its rival's speed target to replace the ordinary driver's
turn braking and coasting. Keep the greater brake request and the ordinary
throttle ceiling. Apply this to every seed; game code stays unchanged.
Crew's matching Hard measurement finished before this tool changed.

## Evidence

The new acceptance control failed on the old wrapper. It now passes all
30 cases across negative, zero and positive seeds, including 1989. Existing
combat-balance tests pass all 34 checks. No assertion or target changed.
The independent source review found no issue.

Native Arsenal replays, seeds 1989-2018, before/after: Medium pursuit
finishes improve from 24/30 to 30/30; wins change from 15 to 16. The six
old stalls are 1999, 2000, 2003, 2004, 2012 and 2018. All thirty ordinary
Hard results and complete input/pose trace hashes stay exactly identical
(6/30 wins). Medium 1989 finishes in 134.72 s before and 143.35 s after.

A separate probe against Crew's frozen new admission source also finishes
Medium 1989 before/after (131.52/226.45 s). Its old pursuit wrapper already
finishes under the new stop rule; this does not prove repair of the earlier
Crew-specific stall. No seed exception or game behavior changed.

Original tool SHA-256: dfee1c29f0ee09c69debef4b3879174c4fecbc30078aba34d2ea5ecefd4bbcb6.
New tool SHA-256: 4873b23cddf8a0ba117ff1cac0167d538d4d3526676c2996f8d95d20ec40b461.
The before process imported the captured original module before editing;
its cached body stayed unchanged during measurement. Raw reports are used
once and removed after integration. Lane tier and build remain pending.

## Removed

Removed pursuit's unconditional replacement of turn braking and coasting.
No game physics, saves, assets or historical samples were replaced.
