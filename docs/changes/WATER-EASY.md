# WATER-EASY: can a child win each Water Road chapter on Easy?

Claude (Opus side session), 1 November 2026. Card `docs/board/cards/WATER-EASY.md`,
claim from `docs/story/wasteland-water-road.md` section 4. No game file under `src/`
changed and no difficulty number changed. **The claim fails in all 15 cases**, so the
card stops here for Claude to decide (section "What Claude decides").

## What changed

- `tools/water-easy-driver.mjs` (new): the child-pace test player. It plays only
  through a player's own controls (pedals, steering, fire, the F key, the on-foot keys
  and gear slots) in a headless arena game (`playArena`) or a Mad Max Duel race on the
  App's autopilot line (`playRace`). It changes no rule, car or computer brain.
- `tools/test-water-easy.mjs` (new): the 15 cases (seven jobs from `WATER_CHAPTERS`,
  eight warlord fights through `startWarlordEvent`). Default (lane tier, about 10 s):
  checks that the child is never better than an Easy computer car, that one seed is one
  child, and that Last Car Rolling, Sal's fight and a Fuel Run each reach an end the
  same way twice. `--rates [case]` runs 10 seeded games per case (150 games, about
  12 minutes, a heavy job) and exits with a failure while any case is below 8 in 10.
  `--player assisted` runs the comparison player below; `--clock easy` presses fire
  only on the Easy car's 10 s clock.

## What child pace means

Never quicker or sharper than an Easy computer car (`BRAIN_DIFFICULTY.easy`,
`CPU_COMBAT.easy`):

- Sees late: it decides from where things were 0.3 to 0.6 s ago (seeded per game) and
  re-plans every 0.6 s. An Easy car re-plans every 0.6 s from the present.
- Slower: 80 to 85% of the car's arena top speed (Easy cars drive at 85%), 85 to 90% of
  the autopilot's corner speed on a road. Never boosts.
- Aims no better: presses fire when the weapon is ready again, seen late (about every
  5 s for the crossbow; an Easy car fires every 10 s, which is a limit on computer cars,
  not a skill, so the child gets a child's trigger). Every bolt leaves with the Easy
  car's aim error (up to 10 degrees) and no homing. Bombs only inside the Easy bomb
  range (35 m). Drives at where a car was seen, never where it will be.
- Reacts to tells: when a car's tell points at it, the child brakes, late, until it is
  over. It never dodges sideways or times a counter.
- On foot: walks and turns with the keys (2.4 rad/s), no sprint or jump; each rocket
  aimed with the same 10-degree error, fired inside 40 m; walks back to the car to
  refill rockets; mends the fort with the wrench between waves.
- In the Convoy Raid it drives at the nearest unbroken red valve, then stops beside the
  stopped tanker, holds F to get out, walks to it, presses F to climb and holds fire.
- No shield, UFO hop, arsenal specials, pickups chased or shortcuts.
- Hands: an Easy car's hands (the arena pilot's wall sense, slowing for tight turns,
  backing out when stuck), so a failure is never a bot driving into a wall.
- Car: the starter `falcone_f42` with no upgrades in every case; the Easy field at
  upgrade 0, as the App sets it. A probe of Sal with `banshee_muscle` and
  `dusthawk_rally` lost the same way (0 of 3 each).

## The 15 cases (10 seeds each, seeds 1 to 10)

| Case | Child | Assisted | What the child loses to |
| --- | --- | --- | --- |
| ch1 job: Mad Max Duel, Pacific Canyon | 0/10 | 10/10 | Pace: the Easy rival finishes first |
| ch2 job: Fuel Run | 0/10 | 0/10 | The collector car delivers 5 first (about 7 s a trip; the child about 12 s) |
| ch3 job: Bounty Hunt | 2/10 | 2/10 | Points: the computer cars hold the bounty longer |
| ch4 job: Ambush Alley (on foot, Pit) | 0/10 | 0/10 | The fort falls in wave 1 or 2; about 1 rocket in 8 knocks a raider down |
| ch5 job: Last Car Rolling | 3/10 | 4/10 | A four-car field: the child wins about its share |
| ch6 job: Mad Max Duel, Alpine Serpent | 0/10 | 10/10 | Pace, as ch1 |
| ch7 job: Convoy Raid, Salt Flats | 0/10 | 0/10 | Time: valves fall only to about 70 to 120 of 150; the escorts wreck the child 6 or 7 times |
| ch1 fight: Sal | 0/10 | 0/10 | Ram exchanges: wrecked 3 times while wrecking her 1 or 2 |
| ch2 fight: Dustmonger | 1/10 | 2/10 | Three wrecks |
| ch3 fight: Mirage | 0/10 | 1/10 | Three wrecks |
| ch4 fight: Gunn | 3/10 | 5/10 | Three wrecks, or damage at the bell |
| ch5 fight: Kettle | 0/10 | 0/10 | Three wrecks |
| ch6 fight: Vultures | 6/10 | 7/10 | Three wrecks |
| ch7 fight: Tollkeeper | 0/10 | 0/10 | Time: no boarding |
| ch8 fight: Blackiron | 0/10 | 0/10 | Three wrecks |

Run time: 710 s for the child's 150 games, 707 s for the assisted player's.

"Assisted" is NOT child pace. It is the comparison asked for in step 2 (is the bot the
problem?): the game's own player aim (bolt lock and homing), full arena and road pace,
0.3 s late. It wins both races, so the road child loses on pace alone. In the arena it
does barely better than the child, and the project's own balance player agrees: the
SCRAPDOME section 8 scripted player wins 18 of 36 Easy rounds against one to three
cars. So the arena failures are not a broken bot: a player at about an Easy car's skill
wins about an Easy car's share.

Smaller probes (scratch, not shipped): Last Car Rolling against 1 car 5/10, against
2 cars 3/10; Bounty Hunt against 1 or 2 cars 2/10; Fuel Run against 1 or 2 cars 0/10.
For Sal, a stronger warlord-file setting alone does not fix the fight: her armor at the
ordinary share (1.0 instead of 1.5) 1 of 3; half the damage to the player 0 of 3; both
together 2 of 3. Kettle and Blackiron with both: 0 of 3 each.

## What Claude decides

The card stops on every case. The central finding: a player who is never better than
an Easy computer car cannot win 8 in 10 in a mode where it meets one to three cars of
that same skill. Easy in the arena is built for a player who is clearly better than the
computer, and no single number in a warlord's own file closes the gap (the Sal probe).
Two directions, either of which needs Claude's call before any tuning:

1. **Move the bar:** prove section 4 against a stronger "young driver" (for example the
   assisted player, which already passes both races), and keep the child-pace player as
   a floor that must reach some lower rate.
2. **A story Easy:** give each story job and fight its own Easy settings in the files
   that own them, as Kogane's duel did with `daichiRival` in its story file. Candidates,
   none measured to 8 in 10 here:
   - Races (ch1, ch6): a story rival with a reduced nitro share or a slower car, set in
     the story's own job settings (Kogane: `nitroScale`).
   - Fuel Run: no collector brain on Easy (rammer and hunter only), or fewer
     deliveries to win on Easy (`FUEL_RULES`).
   - Bounty Hunt and Last Car Rolling: one opponent for the story job (the App already
     allows one to three); measured 2/10 and 5/10, so not enough alone.
   - Ambush Alley: an Easy wear rate and Easy rocket gap for raiders (`AMBUSH_RULES`
     has none today; 5 health a second per raider and a 2.2 s rocket gap on every level).
   - Convoy Raid and the Tollkeeper: Easy valve armor (`CONVOY_RULES.valveArmor`, 150
     on every level) and fewer escort attacks on Easy (`tollkeeper.js`).
   - Warlords: an Easy armor share and an Easy damage share in each warlord's own
     `reset` and `attack` hooks, plus longer `cooldownSec.easy`. Probes say this helps
     Sal (2 of 3 with both) but not Kettle or Blackiron.

Recommended pick: direction 1 for the arena (the child floor at Vultures-like 5 to 6 in
10 is already honest Easy play), direction 2 for Ambush Alley and the Convoy Raid,
which no player of mine wins at all.

## Checks

- `node tools/test-water-easy.mjs`: 12 checks passed, about 10 s.
- `node tools/test-water-easy.mjs --rates`: fails as reported (the claim is unmet).
- `node tools/test-water-easy.mjs --rates --player assisted`: as the table.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 18 passed, 0 failed, 168 s.
- `npm run build`: built (the usual large-chunk warning only).
- No assertion changed; no world signature or replay touched.

## Removed

Nothing: two new test files, no replaced code. The scratch probes lived only in the
session scratchpad.
