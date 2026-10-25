# SKIN-HOOKS

Wire skins in: the paint shop, buying, the wash, the count report, fit buttons that offer the matching skin.

Owner: Claude. Design: `docs/HELI_WILDLIFE.md` (the H3 Wildlife and skins packet). The
board entry holds state, needs and locks.

Packet sections 5.2, 6 and 7. Files: `src/heli/heli-session.js`,
`src/heli/heli-board.js`. No `busy-game-files`.

## Gear wiring from SKIN-GEAR (Claude, 16 October)

SKIN-GEAR made each piece of gear a pure, optional argument (`gearStats` from
`src/heli/heli-skins.js`). Wire it here (details in docs/changes/SKIN-GEAR.md):
- `src/heli/heli-session.js`: pass the worn skin's `gear` into the hook calls,
  call `reelWinch` (which keys reel in and out is this card's call; follow the
  packet's controls), pass `{gear}` to `rescueHit` and `stepSurvey`, call
  `carryNet`/`spillNet`, skip netted crates in `stepCable`, and use the gear's
  line length and hook reach instead of `CABLE.length`/`CABLE.hookReach`.
- `src/heli/heli-missions.js`: `peoplePay(r, bonus)` with `hoistBonus`, and the
  hiker clock limit taking `searchLimit`.
- `src/app.js` (about line 1810): camera cycling `% 4` becomes
  `% cameraViewsFor(gear).length` (needs busy-game-files).
With stock paint or the `heli-skins` switch off, every result stays
byte-identical (reuse SKIN-GEAR's pinned fingerprints).
