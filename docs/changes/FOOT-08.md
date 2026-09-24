# FOOT-08: is it worth getting out?

## Change

Added `tools/onfoot-balance.mjs`, a small deterministic, headless comparison for one decision to keep driving, stop for one RPG ambush, or stop for one wrench repair. It replays the same seed and driving inputs to 12 seconds, uses the production fixed step at 120 Hz, and compares progress at 33 seconds. It includes normal roadside destruction and combat. The stop script brakes below 23 mph, holds the exit control, uses one gear action, re-enters, then follows the same driving line. All checks run without graphics or saved careers.

No weapon, armor, or car tuning changed. The sample did not show a clear need for a numeric adjustment. The check ran on integration `39b5e85`, which includes the separate parked-car brake fix found during this work.

## Routine-stop sample

All distances and times below are differences from continuing to drive in the same seeded case. The time is the extra time to reach 200 m beyond the decision point. Relative gap is player progress minus rival progress; a negative value loses race position.

| Route / CPU | RPG: time, gap, armor | Wrench: time, gap, armor |
| --- | --- | --- |
| Pacific Canyon / Easy | +5.5 s, −376 m, +6 armor; one shot | +5.8 s, −401 m, +6 armor; repair completed |
| Pacific Canyon / Hard | +10.3 s, −603 m, +12 armor; target escaped before a shot | +4.4 s, +35 m, +14 armor; incoming weapon interrupted repair |
| Harbor & Highlands / Hard | +8.3 s, −47 m, +29 armor; one shot | +8.3 s, −47 m, +38 armor; repair interrupted |

Across these three cases, RPG stops leave the player 454 m behind the clean drive on average and 342 m worse in relative gap. Wrench stops leave the player 304 m behind and 138 m worse in relative gap. These are descriptive means from one seed, not win-rate estimates. The final sample includes the new seeded roadside raiders, which made routine stops more costly without changing the tactical conclusions.

## Tactical opportunities

Two explicit stress cases show why stopping can still be useful. Both arms of each pair start from the same altered state, which is excluded from the routine means.

- **RPG:** The car is already stopped. A wounded rival with 30 armor is 55 m behind, moving slowly, with a clear line of fire. One locked rocket hits and wrecks it. The ambush costs 1.9 s at the 200 m marker but gains 199 m of relative race position by 33 s.
- **Wrench:** The car is already stopped at 20 armor. A single controlled 20-armor scenery hit is applied 100 m ahead to both arms. Driving away wrecks the car; the four-second repair prevents that wreck. The repaired run reaches the 200 m marker 0.3 s sooner and is 55 m farther along at 33 s. This case clears traffic and CPU weapons to isolate the repair-versus-wreck choice.

The first sample exposed a parked-car reverse bug: holding the exit brake led the unattended car to move backward at 22 mph, leaving the fighter nearly 200 m away. A compact two-second trace in the report showed no contacts and constant brake input. The Director fixed the parked-car rule in integration `39b5e85`; the same sample then left the car stationary and allowed repair and re-entry. The Hard rival pace fix in `4121dfc` was also included before the final sample. On Harbor/Hard, a stop still slows the rival, but the player loses 388 m and the race gap worsens by 47 m, so this small sample shows no free race-position gain from that path.

## Checks and limits

- `node tools/onfoot-balance.mjs --check`: pass on the branch rebased onto integration `0d59751`. It checks that the sampled routine stops do not beat clean driving on mean distance or relative position, and that each controlled opportunity repays its cost. The crew roster left the previous values unchanged; seeded raiders changed routine losses but left both tactical payoffs intact.
- `npm run build`: pass; Vite printed its existing large-chunk advisory.
- No browser run was needed because FOOT-08 changes only a headless report. No existing assertion, saved career, or world fingerprint changed or regenerated.

This is one seed, two routes, three route/difficulty cases, and two constructed opportunities. The scripted ambush uses exact aim; actual player aim, other seeds, routes, weapon loadouts, and full-race win rates remain unmeasured. A future broad balance pass should sample those before changing the 35/20 RPG damage, three rockets, or four-second repair.
