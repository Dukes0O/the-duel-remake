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

## Pass type 2: exit pass with the tow (fa65369b), no effect, switched off

On the straight after a corner a car that left it at least 3 mph faster counts its tow in the closing rate, with the mirror check and commit point. Against the switch-off figures the result matches steps A and B almost exactly (Panorama 15 8+-crash races, mean 11.30, 1 pile-up, nitro leader 12/20; Woods 2, 4.30, 3 pile-ups, 0/20; Pacific Canyon 0, 0.05, 0, 0/20; max race time change 1.97%, 1.14%, 1.38%), so by the gates alone it passes; but no pass or crash was ever tagged `exit` and CPU passes moved only 1.9 -> 1.9, 10.7 -> 10.8, 3.8 -> 3.8, so the condition (straight, still accelerating, tow, 3 mph faster) almost never holds together with the rest of the pass rule. A type with no effect is not a finished feature, so it is off (`PASS_TYPES.exitTow = false`); no retune within its bounded attempt.

## Pass type 3: safe outbraking dive (8c7c17b3), FAILED two gates, switched off (recommended for Claude to review)

A dive starts only if, at the closing rate, the diver will be at least half alongside before the other car's turn-in point (25 m before the apex); it gives up and brakes to follow if not half alongside 20 m before turn-in; its late-braking gain is capped at 3% (was up to 12%). Against the switch-off figures:

| Gate | Panorama Ridge | Tremblant Woods | Pacific Canyon |
| --- | --- | --- | --- |
| 8+-crash races, on <= off (16, 4, 0) | 14 PASS | 2 PASS | 0 PASS |
| Mean crashes <= off x 1.1 (12.55, 3.75, 0.10) | 10.75 PASS | 3.40 PASS | 0.05 PASS |
| Early pile-ups <= off + 1 (2, 1, 0) | 1 PASS | 3 FAIL | 0 PASS |
| Max race time change vs off, 2% | 4.04% FAIL | 1.15% PASS | 1.38% PASS |
| Nitro player leads after lap 1, at most 5/20 | 8 FAIL | 0 PASS | 0 PASS |

Report-only: CPU passes 1.65 -> 1.85, 9.95 -> 4.15, 3.55 -> 3.80; slower player passed 10, 17, 13 of 20. No dive-tagged crash remains (Panorama 213 untagged, 2 in a pass; Woods 54 untagged, 14 in a pass; Pacific Canyon 1), so the rule removes the dive crashes the earlier batches showed (Woods 26, Panorama 14), at the price of about half of Woods' passes. It fails the Panorama race-time gate (4.04%, the paired maximum over 20 races; steps A+B were 1.97%) and Woods' 3 pile-ups (the same count Claude accepted for steps A and B). It is off per the card (`PASS_TYPES.dive = false`); turning it on is a one-line change if Claude judges the crash result worth the Panorama time and passing change.

## Pass type 4: wider window (f56407fe), FAILED, switched off

Aggressive drivers wait up to 1.5 s behind a slower car, never on lap 1 before the first braking zone is passed. Against the switch-off figures: 8+-crash races 14, 1, 0 (off 16, 4, 0) PASS; mean crashes 11.35 PASS, 4.60 FAIL (limit 4.125), 0.25 FAIL (limit 0.11); early pile-ups 1, 3 (FAIL, limit 2), 0; max race time change 2.37% FAIL (Panorama), 1.22%, 1.00%; nitro leader 13, 0, 0 of 20. Report-only: CPU passes 1.65 -> 2.90, 9.95 -> 10.35, 3.55 -> 3.75; slower player passed 10, 20, 12 of 20. Off (`PASS_TYPES.window = false`).

## Pass types: summary

No type passes and stays on: type 1 (racing-line pass) fails the crash gates, type 2 (exit pass) never triggers, type 3 (safe dive) removes the dive crashes but fails Panorama race time and halves Woods passing, type 4 (wider window) fails the crash and time gates. The `PASS_TYPES` table holds all four, all false, so each can be turned on alone. Steps A and B stay on (Claude's decision).

## Step C: every car starts with half a nitro tank

Panorama stayed above 5 of 20 (12/20 with steps A and B), so Claude's step C: under `cpu-racecraft` the player and every computer car start a Grand Prix with half a nitro tank (`FIELD.startBoost = .5`), refill unchanged. New cases in `test-race-field.mjs` (half tanks with the switch on, full with it off). Measured alone on the final build (steps A, B, C; all four pass types off).
