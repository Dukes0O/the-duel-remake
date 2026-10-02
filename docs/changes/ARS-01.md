# ARS-01 tests-first slice

Source has not started. This slice adds independent acceptance tests for
Harpoon and Caltrops and four appended combat-balance counter checks.
Existing assertions, balance bands and replay pins stay unchanged.

## Coverage

- Native weapon admission, launch, recharge and upgrade transactions.
- Harpoon leading flight, cone, literal range, damage, tether, yank and breaks.
- Caltrops placement, strip dimensions, lifetime, damage, once-per-car contact,
  refreshed grip effect and top-speed cap.
- Actual player, road CPU and arena CPU speed consumers.
- All four wave-one CPU triggers, generated loadouts and native use accounting.
- Memory-only purchases, equipment, upgrades and rejected transaction controls.
- Actual App.advance cadence at 30, 60 and 144 FPS.
- Real stage/menu cleanup and bounded renderer state purity and disposal.

## Waiting

Claude must answer two literal-rule questions before Source begins:
1. Caltrops owner-grace duration.
2. The steering threshold meant by Harpoon's "hard away" break rule.

Tests use full steering for the settled half-second break witness. They do not
invent either pending value or claim threshold-boundary coverage.

The audio files and catalog have a separate owner. This slice does not inspect
that branch or claim sound completion. Native audio cues, private browser
High/Performance checks and the full 30-race balance gate remain builder work.

## Validation

Both changed test files pass node --check and git diff --check.
Genuine RED on unchanged Source, 1 October 2026:
- node tools/test-arsenal-wave1.mjs: 51 checks, 5 passed, 46 failed.
- node tools/test-combat-balance.mjs: 33 checks, 29 passed, 4 failed.

All 29 existing balance checks pass. The five new-suite controls pass:
Oil CPU positions, Smoke CPU positions, Smoke recent-hit requirement and
both weapons' rejected purchase/discovery/switch/normalization transactions.

The 46 wave-one failures are native Harpoon/Caltrops launch returning false,
real campaign/CPU admission missing, purchase/equipment refusal and their
consequent flight, hit, speed, cadence, lifecycle and rendering preconditions.
No missing module/import/export error occurred. The two native accounting
checks fail at actual memory-only purchase. The two zero-use validator checks
fail because --check accepts missing Harpoon or Caltrops CPU evidence.

Those precondition failures honestly leave downstream behavior unproved.
The builder must run these same tests after implementing the settled rules.
The owner-grace and threshold-boundary assertions remain incomplete pending
Claude's answers. No Source, replay pin or existing assertion changed.

## Removed

None. This slice adds tests only and does not replace runtime behavior.
