---
task: CRASH-RELEASE
status: merged
kind: release
flag: crash-physics, crash-effects
player_facing: yes
---

# Crash physics in the real game (27 September 2026)

Kyle, after playing CRASH-05 in the Preview: "These are good now, so can merge
into real gameplay", and chose to tune Hard first (option 2).

## Changes

- `src/feature-flags.js`: `crash-physics` and `crash-effects` on.
- `src/wasteland-tuning.js`: the Hard Mad Max CPU attacks every 6 s (was 5);
  aim unchanged so Hard still aims best.
- `src/vehicle-knock.js`: a car shoved backwards by a hit never reads as
  reversing (found by `tools/test-reverse.mjs` once crash physics was on).
- `tools/combat-balance.mjs`: CPU hits are the mean over all thirty no-weapon
  races, UFO gains the mean of six seeds, CPU-hit bands for that mean
  (easy 1-4, medium 4-9, hard 4-10; were one-race counts 0-3, 2-6, 4-10).

## Balance (thirty races per difficulty, wasteland2 and crash physics on)

| | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Wins, Hard CPU at 5 s | 26/30 | 19/30 | 5/30 |
| Wins, Hard CPU at 6 s (released) | 26/30 | 19/30 | 8/30 |
| CPU hits a race (released) | 2.67 | 7.2 | 5.53 |

The live game before this release averaged 7.27 CPU hits on Medium over
thirty races, so the old one-race Medium band (2-6) did not describe it.
A version that also widened the Hard aim to 0.04 rad reached the same win
rate but let Hard aim no better than Medium in the seeded aim check, so the
aim stays 0.03.

## Changed assertions

- Hard CPU cadence 5 s to 6 s: `tools/test-cpu-combat.mjs`,
  `tools/test-cpu-pickups.mjs`, `tools/test-enemy-aim.mjs`,
  `tools/test-combat-brain.mjs`.
- `tools/test-cpu-combat.mjs`: CPU hits judged on the mean of each
  difficulty's two races (Pacific Canyon Hard had 11 in one race; the two-race
  mean is 8.5 and the thirty-race mean 5.53).
- `tools/test-combat-balance.mjs`: CPU-hit bands for the thirty-race mean;
  traffic accounting uses touching cars and the released outcomes (smash is a
  wreck, knock is not).
- `src/test.js`: its contact fixtures pin the switch-off rules explicitly.
- `tools/test-feature-flags.mjs`, `tools/test-wasteland-beta.mjs`,
  `tools/test-crash-presentation.mjs`: the two switches are on.
- `tools/test-checkpoint-recovery.mjs`: seed 2009 (seed 1989 no longer misses
  a gate with crash physics on).
- `tools/replays/combat-inputs.json`: the staggered three-car attack replay
  runs 750 ticks (was 720) so the third car's turn at 6 s is inside it;
  combat fingerprints re-recorded.

## Removed

Nothing yet: the switch-off crash paths stay until the janitor removes the
switch (a card follows this release).
