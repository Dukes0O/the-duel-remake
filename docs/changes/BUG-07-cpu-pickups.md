---
task: BUG-07
status: ready-for-review
kind: combat-balance-fix
flag: none
player_facing: yes
behavior_change: yes
---

# CPU pickup use

Medium and Hard rivals now collect a road pickup only when their swept track
position and lane cross the visible pickup. Easy does not collect them. A
collected star activates a real five-second rival shield. A collected bomb or
crossbow is held for a suitable scheduled attack and fires its normal physical
projectiles. A bomb may replace a mid-range crossbow attack; the CPU keeps its
existing 10/7/5-second attack interval and never gets an extra shot. The
pickup disappears with its existing burst and a rival pickup callout. The
source pickup layout is unchanged. CPU UFO use remains a separate BUG-07 slice,
so the rival leaves UFO pickups for the player instead of silently consuming
them.

## Balance and replay evidence

The first trial steered toward pickups and fired extra attacks. It failed:
Medium Titan reached eight CPU hits against the 2–6 target; ten-seed wins
became Easy 8/10, Medium 7/10 and Hard 1/10. That trial was removed.

The final trial keeps the CPU's normal route. In ten seeded Pacific Canyon
no-weapon races (seeds 1989–1998), player wins are Easy 8/10, Medium 6/10 and
Hard 2/10, inside the approved 80–95%, 45–65% and 20–40% bands. Easy collected
and used zero pickups; Medium collected 17 and used eight; Hard collected and
used four. Some collected charges remain held when no suitable attack occurs.
The seed-1989 Pacific Canyon CPU hit counts are 1/2/10, and Titan Arena counts
are 1/5/10 for Easy/Medium/Hard. All meet their 0–3, 2–6 and 4–10 bands.

The recorded-input replay check passed all 162 comparisons across 18 cases,
16 events, three frame rates and three runs. No stored fingerprint changed.
Only one Wasteland case is currently recorded, on Easy, so Medium/Hard changes
are verified by the focused test and race traces instead of that fingerprint.
Compared with the same pre-change ten-seed trace, Medium seed 1997 has two CPU
hits instead of one, and Hard seed 1996 has seven instead of five. All other
sampled CPU hit counts and the three win totals are unchanged. These are real
pickup effects, even though the current replay fixture cannot fingerprint them.

## Checks

- `node tools/test-cpu-pickups.mjs`: passed physical contact, Easy exclusion,
  held charges, real shield and projectiles, attack timer, and UFO exclusion.
- `node tools/test-cpu-combat.mjs`: passed both course hit bands.
- `node tools/trace-cpu-combat.mjs --baseline`: 30/30 races complete with the
  win, collection and use counts above.
- `node tools/test-replays.mjs`: 162/162 comparisons passed.
- `node tools/test-road-powerups.mjs` and `node tools/test-combat.mjs`:
  player pickup behavior and 67 combat lifecycle checks passed.
- `node tools/combat-balance.mjs --check`: all 21 policy runs and 30 baseline
  races completed. Win rates 8/6/2, CPU hits 1/2/10, crossbow aim 13/26, and
  own-bomb maximum speed loss 4.53% pass. The command exits 1 for the six
  existing BUG-04 UFO time-gain failures: stock Easy/Medium/Hard
  9.59/45.52/57.87 seconds and max-level 26.31/62.24/76.18 seconds, all
  above the four-second target. CPU pickup work does not change UFO use.
- `npm run test:lane`: 168/168 suites passed in 274.69 seconds, including
  replay fingerprints and the new pickup test.
- `npm run build`: passed with the existing large rendering chunk warning.

The live game, integration branch, real saves and live port were not touched.
