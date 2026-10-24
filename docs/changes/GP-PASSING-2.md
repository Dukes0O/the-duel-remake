# GP-PASSING-2

Switch `cpu-racecraft` (dev). Card: `docs/board/cards/GP-PASSING-2.md`. Each step is one 20-race batch (360 races: 20 seeds, three courses, normal/slow/nitro, switch off and on) with `tools/racecraft-rate.mjs`; compared with the nitro-and-pace build (PR 2: Panorama 17 races with 8+ crashes, mean 13.70, 2 pile-ups; Woods 4, 4.15, 1; Pacific Canyon 0, 0.45, 0) and with the 2% race-time limit against switch off.

## Step A: nitro arms after the first braking zone's apex (a2111b2d)

Every car's nitro, the player's and the computer's, is locked on lap 1 until the car passes the apex of the first braking zone (`nitroArmS` in the field state, switch on only; `nitroLocked` in `race-field.js`; the HUD label reads NITRO LOCKED, then NITRO ARMED for 150 m). Switch off is unchanged (field suite pins pass).

| Gate | Panorama Ridge | Tremblant Woods | Pacific Canyon |
| --- | --- | --- | --- |
| Nitro player leads after lap 1, at most 5/20 (off: 19, 2, 20) | 16 FAIL | 0 PASS | 0 PASS |
| 8+-crash races vs PR 2 | 16 vs 17 PASS | 2 vs 4 PASS | 0 vs 0 PASS |
| Mean crashes vs PR 2 x 1.1 | 11.35 vs 13.70 PASS | 4.40 vs 4.15 PASS | 0.15 vs 0.45 PASS |
| Early pile-ups vs PR 2 + 1 | 1 vs 2 PASS | 3 vs 1 FAIL | 0 vs 0 PASS |
| Max race time change vs off, at most 2% | 1.58% PASS | 1.17% PASS | 1.38% PASS |

One Woods slow-player race had a CPU unfinished at the 952 s limit (report-only mode).

## Step B: lap-1 defend with nitro from 1 s behind the player (11857f14)

Needed because Panorama stayed above 5/20 after step A. On lap 1 a computer car defends with nitro on a straight when the player is within 1 s behind (0.5 s for other cars and later laps), still at half strength.

| Gate | Panorama Ridge | Tremblant Woods | Pacific Canyon |
| --- | --- | --- | --- |
| Nitro player leads after lap 1, at most 5/20 | 12 FAIL (from 16) | 0 PASS | 0 PASS |
| 8+-crash races vs PR 2 | 15 vs 17 PASS | 2 vs 4 PASS | 0 vs 0 PASS |
| Mean crashes vs PR 2 x 1.1 | 11.30 vs 13.70 PASS | 4.30 vs 4.15 PASS | 0.05 vs 0.45 PASS |
| Early pile-ups vs PR 2 + 1 | 1 vs 2 PASS | 3 vs 1 FAIL | 0 vs 0 PASS |
| Max race time change vs off | 1.97% PASS | 1.14% PASS | 1.38% PASS |

Report-only: CPU passes 1.9, 10.7, 3.8 per race; slower player passed 11, 20, 12 of 20.

Outcome: both steps together fix Pacific Canyon completely (nitro leader 20 -> 0 of 20) and Woods stays at 0, but Panorama still has the nitro player leading 12 of 20 (from 19) and Woods has 3 early pile-ups against 1 (a count of 3 in 20 races, same with step A alone). By the card, both steps failing a gate is recorded and the pass types carry on. Steps A and B stay in the dev build; Claude to decide whether they stay.
