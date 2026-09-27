---
task: BALANCE-SAMPLE
status: ready-to-merge
kind: tooling
flag: none
player_facing: no
---

# Combat balance judged on enough races (27 September 2026)

CRASH-05 showed the ten-race win-rate sample and the one-race policy samples
flip on a single close finish. Kyle wants crash physics released, and the
release gate needs a balance check that can tell a real shift from noise.

## Changes

- `tools/combat-balance.mjs`: win rates on 30 no-weapon races per difficulty
  (seeds 1989 to 2018); CPU hits and the UFO time gains are the mean of seeds
  1989 to 1991 (12 more policy races); crash-physics follows the game's own
  switch unless `--flags crash-physics` asks for it. The target bands are
  unchanged. A full check takes about 8.5 minutes (was about 4.5).
- `tools/test-combat-balance.mjs`: a new check that the single-race targets
  use the mean of the repeated seeds (22 checks pass).

## Results with the larger sample

| Flags | Easy | Medium | Hard | Other failures |
| --- | --- | --- | --- | --- |
| wasteland2 (the live game) | 25/30 | 20/30 (67%) | 8/30 | Medium win rate over 65% |
| wasteland2, crash-physics | 26/30 | 19/30 | 5/30 (17%) | Hard under 20%; Medium CPU hits 6.33 (limit 6); UFO-max Hard gain 4.88 s (limit 4) |
| crash-physics only | 27/30 | 13/30 (43%) | 5/30 (17%) | Medium CPU hits 1.67 |

The live game was already one race over the Medium band; the old ten-race
sample could not show it. With crash physics on, Hard is harder for the player
(8 to 5 wins on the same thirty seeds) and the CPU lands more hits on Hard
(5 to 8.33 a race). Following the card's stop rule, the tuning decision goes
to Claude and Kyle before CRASH-RELEASE; this card changes no game tuning.

## Changed assertions

None.

## Removed

The ten-seed win-rate sample and the one-seed CPU-hit and UFO-gain samples.
