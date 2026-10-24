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

## Pass type 1: alongside a car on the racing line, with mirror check and commit point (fc3ec5b4), FAILED, switched off

On top of steps A and B. The pass lane is measured from the car itself; a lane is crowded if a car is closing from behind within 2 s; a pass not half alongside 60 m before the braking zone backs out. Gates compared with the switch-off figures (card rule):

| Gate | Panorama Ridge | Tremblant Woods | Pacific Canyon |
| --- | --- | --- | --- |
| 8+-crash races, on <= off (16, 4, 0) | 15 PASS | 3 PASS | 0 PASS |
| Mean crashes <= off x 1.1 (12.55, 3.75, 0.10) | 11.45 PASS | 4.75 FAIL | 0.65 FAIL |
| Early pile-ups <= off + 1 (2, 1, 0) | 1 PASS | 2 PASS | 0 PASS |
| Max race time change vs off, 2% | 1.97% PASS | 1.34% PASS | 0.88% PASS |

Report-only: CPU passes 2.2, 11.0, 4.0; slower player passed 12, 20, 11 of 20; nitro leader 13, 0, 0 of 20. Crashes by pass type (in the pass or within 3 s of it): Panorama dive 14 of 229; Woods dive 26, alongside 4, line 2 of 95; Pacific Canyon line 5, alongside 1 of 13. Pacific Canyon went from 1 crash (steps A+B) to 13 in 20 races. The type is off (`PASS_TYPES.alongside = false`); its mirror check and commit point stay in the code and are reused for the types that follow.
