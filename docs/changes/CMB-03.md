---
task: CMB-03
status: integrated
kind: combat-feature
flag: wasteland2
player_facing: yes
---

## What changed

Flagged combat races now score hits from armor actually removed by a
player-owned weapon or ram. A shielded impact, a hit on traffic, self damage,
and CPU damage earn no player hit points. Overkill counts only the armor the
victim had left. Each caused opponent wreck and each player wreck is counted
once, including when several cars are caught in one bomb blast.

The combat chain lasts five seconds and stops growing at five hits. Each
positive hit earns 100 points times the chain, and a caused wreck earns 400
points. The existing Pro multiplier applies. These points join the existing
style score when earned, so the finish does not add them again. The near-miss
chain remains separate.

Finish and timeout results show hits landed, wrecks caused and taken, damage
dealt, best combo, combat style points, and knockdowns. Knockdowns remain zero
until on-foot combat is added. A separate scorecard shows the stats on desktop
and narrow screens. SAVE-01 owns the later credit bonus and persistence work.

## Verification

- Independent red test commit `3e48790`: one existing behavior control passed;
  fourteen new acceptance cases failed before implementation.
- `node tools/test-combat-scoring.mjs`: 15/15 passed after implementation,
  covering ownership, all three opponents, overkill, simultaneous bomb
  victims, one-time recovery, shields, combo limits, Pro, timeout, result
  markup, and 30/60/144 FPS parity.
- Light related checks passed: armor 19/19, armored ramming 13/13,
  projectiles 9/9, combat opponents 8/8, race integrity 605 checks,
  completion screen 162 checks, plus legacy combat and module checks.
- No independent assertion was changed. Ordinary and explicit flag-off result
  shapes remain covered by the first acceptance case.
- Production build passed on the final branch (181 modules; existing large-chunk advisory).
- Private combat-results browser scenario passed on High and Performance at
  1280x720 and 390x844. All scorecard fields were present, no horizontal
  clipping, memory-only saves, four screenshots, zero warnings or errors.
  The scorecard layout was visually checked and the last cell now fills its row.
- Broad release, balance, and frame checks: reserved for the single final
  release candidate gate. This lane ran focused checks by the Director's
  instruction to keep testing proportional.
- After the combined pickup and effects merge, the focused 15/15 scoring
  checks and private High/Performance desktop/mobile results scenario passed
  again. The combined production build passed.
