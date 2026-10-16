# P4-CUPS

Adds Mountain, Night and Winter Cups and Grand Tour behind both existing grand-prix and dev grand-prix-career switches. No production flag changes. Eight-place points are 10, 8, 6, 5, 4, 3, 2, 1; ties use countback then final-race order. Normal course ownership, transport and fire admission remain. A series retains its car, difficulties, actual field seed and native participant identities across reloads.

Optional per-player state preserves old saves and opaque future schemas. Only settled native classifications advance a cup. Permanent settlement keys retain proof beyond the 60-entry display history. Trophy and bonus are paid once per cup and difficulty, within the existing wallet ceiling. Abandonment pays no cup bonus. Normal bonuses are 900/1500/2250; Grand Tour is 1800/3000/4500 and requires the three other cup wins. Results show actual progress, standings and separate bonus; the garage shows earned trophies. Audio uses the existing GP finish cue.

## Validation

Frozen 8a910245 passed the canonical lane tier: 271/271 suites, jobs 4, zero failures or unrun suites, 1422301.5732 ms. Production build passed in 2243.3033 ms. Independent cups_save_review is CLEAR, including code, saves and pay. No rerun after the clean merge.

The complete native suite passed 13/13 in 73571.4594 ms. Its actual eight-car, three-race Mountain Cup uses stored field seed 1000, reloads the real memory-only App after race one, checks named-player isolation and actual classifications/result markup, and proves duplicate finish and bonus refusal. Existing save guards passed 437 checks across 13 old fixtures, progression 27 checks, backup/damaged-save checks and the 3.54 MB storage budget. No real save was touched.

Two reviewer-found faults have failing regressions and fixes: history eviction stranding a cup, and an App read into opaque future cup state. No existing assertion, tolerance, fixture or race fingerprint changed.

## Removed

Removed the unused App availability wrapper. No replaced gameplay path or generated placements remain. Individual GP starts, settlement, records, ghosts and off-state markup retain their existing paths.
