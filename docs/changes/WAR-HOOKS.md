---
task: WAR-HOOKS
status: ready-to-merge
kind: architecture
flag: warlords
player_facing: no
---

# Each warlord in its own file (Claude, 2 October 2026)

## What changed

- Sal's fight moved from src/arena/sal-fight.js to src/warlords/sal.js with
  six hooks; src/warlords/index.js lists the built fights.
- arena-brains, arena-event, warlord-event, vehicle-contact-modifiers,
  combat-armor and sim-contacts call the hooks instead of naming Sal.
- Settlement accepts any built warlord and pays its own reward (a kit or an
  early weapon). The ladder order moved to src/warlords.js.
- `hazardsActive` lets road hazards and car effects run in warlord fights
  with the arsenal switch off; the renderer draws strips along their heading
  and an arena's dust-storm weather; arsenal cues from a warlord move play.

## Tests

- New tools/test-warlord-hooks.mjs: shared files never name a warlord; every
  built warlord has its file, ladder place, car, brain and reward.
- Every existing Sal, Side Saws, warlord format, pay, settlement, arena
  event, steering, wreck-rate, shove and junk test passes unchanged, with
  unchanged replays. No changed assertions.

## Removed

- src/arena/sal-fight.js, salRearDamageMultiplier, the `salSweep` contact
  flag and the ladder list in warlord-settlement.js.
