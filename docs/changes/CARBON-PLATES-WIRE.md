# CARBON-PLATES-WIRE

Claude (Director and Release Manager), 2 November 2026. Kyle picked option C in chat ("Build C:
stronger plates"). The question and the options are on `docs/board/cards/CARBON-PLATES-WIRE.md`.

## What changed

- The Lab's **Carbon plates** (1,500 credits, opened by Strength against weight) now does
  something. It was sold but nothing read it. As written in `docs/LAB.md` (kits 40% lighter,
  same protection) it would have been a paid downgrade, because plating weight only adds to the
  crash body, which helps its owner, and never slows a car.
- Now: owning Carbon plates, with the `lab` switch on, makes the player's paid Wasteland kit give
  40% more armour at its usual weight, rounded to whole points: Scrapper 10 to 14, Raider 20 to
  28, Warlord 30 to 42. On a 1,450 kg car the Warlord kit goes from 130 to 142 armour.
- Unchanged: the kit's weight in crashes, opponents' armour, the earned looks (Side Saws, Turret
  Look, Chrome Crown), every race for a player who has not bought it, and every race with the
  `lab` switch off. No save change.
- How: `carbonPlatesOwned(profile, flags)` in `src/lab/lab-shop.js` (beside `waxKitOwned`) is
  the Lab's answer; `src/app.js` passes it as `combatCarbonPlates` beside `combatArmorKit` to
  both race starts (`startCampaign`, `startArenaEvent` in `src/game.js`), which keep it on the
  race state only when a paid kit (one with armour) is fitted under Wasteland rules; `initializeCombatArmor` in
  `src/combat-armor.js` adds `armorKitBonus(kit, {carbonPlates})` for the player only; the 40%
  is `CARBON_PLATES_ARMOR` in `src/armor-kits.js`.
- The Armory shows the owner's real figure on each kit card and the equipped line, for example
  "RAIDER EQUIPPED (+28 ARMOR · CARBON)".
- `docs/LAB.md` section 4.2 row and the shop row's comment say "40% more protection for the same
  weight".

## Removed

Nothing. The old promise in `docs/LAB.md` ("weighs 40% less") is replaced in the same change.

## Changed assertions

None. New tests only.

## Checks

- `tools/test-armor-kits.mjs` 7/7, two new tests: with Carbon plates the player starts with base
  plus 14, 28 or 42; the rival keeps base; the crash body weight is the same with and without the
  plates, for the player and for an opponent; no plates outside Wasteland rules or without a
  kit; `carbonPlatesOwned` is true only when bought and the Lab is on; the Armory shows +28 and
  +14 with CARBON for an owner and the plain +20 without; a kitted opponent keeps plain plating;
  an earned look carries no plates.
- `tools/test-lab-rules.mjs`, `tools/test-combat-armor.mjs`, `tools/test-lab-snow.mjs`: pass.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`, from PowerShell):
  109 passed, 0 failed. `npm run build`: passed. Both on 98a2b2eb, before current integration
  (WARLORD-NINE) was merged in without a code conflict; the two review changes after it were
  checked with `tools/test-armor-kits.mjs` 7/7. `game.js` and `app.js` are shared files, so the
  release takes a full tier under rule 19.

## Review

One independent review of 98a2b2eb: no real defects. It traced every race start (campaign,
restart, arena, warlord, story, lessons, Hidden Road, helicopter), every later armour step
(repairs, respawns, wreck recovery, arena scaling), `carbonPlatesOwned` with odd profiles and
flags, and found no price, purchase or credit code changed. Two small points taken: the test now
gives an opponent a kit and checks it keeps plain plating, and the race keeps the plates only
with a paid kit (not with Side Saws or Turret Look, where it did nothing).
