# BOWL-LTR-EASY

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (fight balance). Last Truck Rolling on Easy is still lost by a driver who plays it the obvious way.
In Claude's keyboard drives of 20 November 2026 a driver who steers at the nearest rival and presses F in reach won one
fight in nine (lost in 48 to 58 seconds on the merged game at `57e478340`), mostly to rams, while the card's scripted
driver wins eight in ten. Kyle, on his own play: "I might not win this"; and the same day: the player is a pre-teen, and
losing is allowed. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), sections 6, 7 and 9.

## What to build

1. **Measure first.** Add a second scripted Easy driver, the chaser: it steers at the nearest sound rival, presses F when
   the weapon is in reach, and does not dodge. Run ten seeds with each weapon and report where the player's health went
   (rival-started rams, own rams, walls, hammers, saw, throws).
2. **Tune Easy only** until the chaser wins five to seven fights in ten with each weapon and the card's careful driver
   still wins at least six. Levers, in this order: the player's recoil from own rams (50 per cent today); how many rivals
   may hunt the player at once and how soon; the rivals' closing speed in a ram. Medium and Hard keep their tables.
3. **A fight on Easy lasts at least 75 seconds** for the chaser in eight seeds of ten, win or lose, so there is time to use
   the weapon.

## Files and locks

`src/bowl/bowl-weapons.js`, `src/bowl/bowl-rivals.js`, `tools/test-bowl-weapons.mjs`, `tools/test-bowl-rivals.mjs`.
Locks: `bowl-rivals`.

## Checks

1. The two drivers' ten-seed results for each weapon, as assertions (the ranges above), with the health-by-source table in
   the change note.
2. The non-dodging Hard driver still loses.
3. Laptop only, Claude runs with the next batch drive.

## Sound cues

None new.

Behind `titan-bowl`. Tested and merged under AGENTS rule 23, recorded in `docs/changes/BOWL-LTR-EASY.md` with a Removed line.
Memory-only saves. No new dependency, network request or key.

## Added from Batch drive 2 of the merged game at `fb02d3233` (20 November 2026; pictures in `.evidence/2026-11-20/batch-2/` of the integration folder)

4. **Keeping away loses too.** On Night 3, a driver who kept away for the full two minutes with 44 health left still lost
   ("another truck had hit the others harder"). On Easy, a driver still rolling when the clock ends wins if no rival has more
   health left; on Medium and Hard the rule stays.
5. Nights 3 and 5 could not be passed after three tries each, so this card now stops the season for a tween. It goes first
   among the Bowl's fix cards.
