---
task: WAR-02b
status: ready-to-merge
kind: feature
flag: warlords
player_facing: yes
---

# The Dustmonger (Claude, 2 October 2026)

## What changed

- src/warlords/dustmonger.js: Dusthawk Rally on the gunner brain. Dust Veil
  when the player is within 40 m behind him: the shared tell and DUST VEIL!,
  then a 7 m smoke cloud behind him and, if his yaw stayed under 10 degrees
  a second for 0.5 s, a 4 by 8 m oil strip starting at the cloud's far edge
  (ordinary Oil Slick effect, shared through applyOilSlip). Window: 2 s at
  70% speed, rear hits 1.5 times, HE'S CHOKING. HIT HIM NOW!. Cooldown 10, 8,
  6 s. Phase two: veils 20% more often, clouds 1.3 times wider, dust storm.
- Reward: first win saves Smoke Screen as earned (rewardArsenalWeapon) and
  the result says so; pay is the second rung of the ladder.
- The Preview's temporary player starts with every built warlord's territory
  full, so each built fight opens from the yard (tools/preview-player.js).

## Tests

- New tools/test-dustmonger.mjs (7 tests). Headless fights with the balance
  tool's simple scripted player, 12 per difficulty: it beats Sal 0 of 36 and
  the Dustmonger 1 of 36, so he sits near Sal. Kyle and Gratian judge feel.

## Removed

- Nothing; the brown exhaust puffs use the shared tell for now (P3-POLISH).
