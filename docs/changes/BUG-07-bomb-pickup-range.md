---
task: BUG-07
status: ready-for-review
kind: combat-balance-fix
flag: none
player_facing: yes
behavior_change: yes
---

# CPU bomb pickup range

This follow-up is based on integration commit `8acfe93657685cecde9f1f19015dc352197ca8ae`.
Medium and Hard rivals still collect a bomb only by crossing its visible road
pickup. They now spend that charge in a scheduled attack when the target is
35–50 m away, instead of 35–65 m away. At 50–65 m they fire the ordinary
crossbow and keep the bomb for a closer target. The 10/7/5-second attack
intervals and Easy's no-pickup rule are unchanged.

The earlier 65 m limit changed the Hard stock-UFO comparison for seed 1989.
The CPU physically collected a bomb at 17.56 s and threw it at the 50 s attack
opportunity. Its weak hit did not push the player into the road prop that the
usual crossbow hit reached. Avoiding that real crash and its 30 s penalty
increased the measured UFO time gain from the pre-pickup 22.11 s to 57.87 s.
The narrower range keeps the crossbow at that distance and returns this gain
to 22.11 s. The crash is a physics result, not a fabricated outcome.

## Measured result

Memory-only Pacific Canyon races used stock Falcone F42, Casual Wasteland,
seeds 1989–1998, fixed 30 FPS input, and no player weapons. All 30 completed.

| Difficulty | Player wins | CPU pickups collected | Pickups used | Pacific hits | Titan hits |
| --- | ---: | ---: | ---: | ---: | ---: |
| Easy | 8/10 | 0 | 0 | 1 | 1 |
| Medium | 6/10 | 17 | 8 | 2 | 5 |
| Hard | 2/10 | 4 | 3 | 10 | 10 |

The win and hit bands pass at their current boundaries. The Hard pickup use
count is one lower than on `8acfe93`, because a distant collected bomb stays
held. The focused test crosses a real bomb pickup, checks that a 57 m attack
fires a crossbow while retaining the charge, then checks that a 45 m attack
fires a bomb and spends it. No existing assertion was weakened.

`node tools/combat-balance.mjs --check` completed 21 policy runs and 30
baseline races. Its six UFO-gain checks remain red against the four-second
target: stock Easy/Medium/Hard gain 9.59/45.52/22.11 s; max-level gain
26.31/62.24/76.18 s. The stock Hard gain is exactly the pre-pickup value.
This change is a narrow BUG-07 balance fix and does not close BUG-04.

## Checks

- `node tools/test-cpu-pickups.mjs`: passed the 57 m and 45 m physical pickup
  regression and the existing Easy, shield, crossbow, and contact cases.
- `node tools/test-cpu-combat.mjs`: passed Pacific and Titan hit bands.
- `node tools/test-road-powerups.mjs` and `node tools/test-combat.mjs`:
  passed player power-up and 67 combat lifecycle checks.
- `node tools/test-replays.mjs`: 162/162 comparisons passed, with no stored
  fingerprint changed. The recorded Wasteland replay is Easy, so the
  Medium/Hard behavior is covered by the focused test and race traces.
- `node tools/trace-cpu-combat.mjs --baseline`: all 30 races complete with the
  win, pickup, use, and hit counts above.
- `node tools/combat-balance.mjs --check`: exits 1 for the six still-open
  BUG-04 UFO-gain checks listed above; the 30-race win bands now pass.
- `npm run test:lane`: 93/93 suites passed in 351.44 s, including campaign
  runs and replay fingerprints.
- `npm run build`: passed; Vite reported its existing large render chunk
  advisory.

The live game, integration branch, real saves, and live port were not touched.
