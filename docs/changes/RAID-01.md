# RAID-01 — roadside ambush zones

Integrated at `9565ed5` in the Wasteland development branch.

## Behavior

- The 11 combat courses each have three seeded ambush zones. Each zone has three raiders standing beyond the road edge. Positions vary by seed and avoid tunnels, stations and nearby obstacles. Arena raiders stand inside the perimeter wall.
- Only Wasteland races with `wasteland2` enabled create raids. Ordinary and flag-off races create no raid state or route changes.
- A yellow roadside warning post stands 125 m before each zone. The player gets a single **ROADSIDE AMBUSH AHEAD** callout per zone per lap within 190 m. The marker's symbol is visible from both directions.
- A raider fires one aimed crossbow bolt per lap at the nearest moving player or opponent car within 82 m. Shots are spaced by at least 0.8 seconds per zone. Across two laps, the bound is 18 raider shots per race. Shots share the existing 40-projectile cap and swept collision rules.
- Raider hits use the normal 12-point crossbow armor damage, with a smaller 0.32 impact shove. The damage and hit event carry `owner: 'raider'`, so a raider hit on an opponent gives no player score or wreck credit.
- Nine raiders reuse the four pooled fighter draw calls. Warning posts add four instanced draw calls for three signs. The player figure still fits the 12-figure pool.

## Checks

- `node --test tools/test-raiders.mjs`: four focused checks passed for 11-course placement, seed repeatability, obstacle clearance, flag-off route identity, warning and shot bounds, raider ownership, opponent targeting and pooled visuals.
- `node tools/test-replays.mjs`: all 162 existing ordinary replay fingerprints passed unchanged.
- `node tools/test-combat-replays.mjs`: all 12 existing combat replay fingerprints passed unchanged. No baseline or existing assertion changed.
- `npm run build`: passed.
- `node tools/browser-harness.mjs scenario raider-ambush`: passed on private port 48164 with memory-only saves, zero browser warnings or errors. The scene captured the camp and the two-sided warning post in `.qa-dist/browser-output/raider-ambush-2026-09-24T02-27-16-474Z/`.

## Limits and next step

- Raiders are stationary shooters in this slice. Taking cover, attacking the raiders, raider knockdown, and salvage crates belong to RAID-02.
- The three signs and nine figures are rendered from pooled geometry. Frame pacing was not measured in this bounded check; the new scene adds eight steady draw calls while raids are active.
- Zone ammunition refreshes with the player's lap. A rival that reaches the next lap first may exhaust the current camp before the player's lap changes. This keeps the 18-shot bound and should be reviewed during balance play.
