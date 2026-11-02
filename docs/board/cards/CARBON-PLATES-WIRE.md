# CARBON-PLATES-WIRE

The short board entry controls current state, ownership, dependencies and locks.

The Lab shop sells **Carbon plates** (1,500 credits, opened by passing Strength against
weight; `src/lab/lab-shop.js` line 19), but nothing in the game reads it. `docs/LAB.md`
section 4.2 says it makes every Wasteland armour kit weigh 40% less with the same
protection. This card makes the item do something real, or takes it out of the shop.

## What armour weight does today (2 November 2026)

- A kit's weight (`massKg` in `src/armor-kits.js`: Scrapper 90 kg, Raider 180 kg, Warlord
  270 kg) is read in one place: `_vehicleSpec` in `src/sim-contacts.js` line 181 adds it to
  the car's crash body (CRASH-04, `docs/CRASH_PHYSICS.md` section 6 rule 3).
- A heavier crash body only helps its owner: the kitted car deals more ram damage, is
  shoved less and crushes more. Nothing else reads kit weight. Acceleration comes from the
  car's `accel` figure (`src/game.js` line 168) and never from mass, so plating does not
  slow a car.
- Protection is the kit's `armor` (10, 20, 30), added to the car's armour in
  `initializeCombatArmor` (`src/combat-armor.js` line 71). A 1,450 kg car starts with 100.

So the item as written (40% lighter, same protection) would make an owner's kit hit softer
and get pushed around more, with nothing gained. Selling that for 1,500 credits would be a
downgrade. The brief's stop rule applies: wiring it as written is wrong, and giving weight a
cost touches the driving rules for every kitted race. Stopped before code.

## Question for Claude (Director)

Which way should Carbon plates go?

**A. Wire it as written: kits 40% lighter in the crash body.** About 10 lines. A paid
downgrade, as above. Not recommended.

**B. Give plating weight a driving cost, then Carbon plates takes 40% of it away.** Kit
weight would cut acceleration by the mass ratio (a Warlord kit on a 1,450 kg car: about 16%
slower off the line; Scrapper about 6%), and Carbon plates would cut both that and the crash
weight by 40%. True to the physics the lesson teaches, and it makes kit choice a trade. But it
changes every released Wasteland race with a kit, for players who do not own the item too:
Kyle's and his son's kitted cars get slower. It moves replay fingerprints for kitted runs and
needs a combat balance run. Closer to a direction change than a fix.

**C. Stronger plates for the same weight (recommended).** Owning Carbon plates makes each paid
kit give 40% more armour at its usual weight: Scrapper 10 to 14, Raider 20 to 28, Warlord 30
to 42 (on a 1,450 kg car, 130 to 142 total with the Warlord kit, about 9% more). Earned looks
(Side Saws, Turret Look, Chrome Crown) carry no armour and stay as they are. This is the same
lesson from the other side: carbon fibre is stronger for its weight, so the same weight buys
more protection. It touches only the owner's starting armour, so players without the item and
every existing replay are unchanged, and the crash rules are untouched.
How it would be built: `src/app.js` reads `ownedLabUpgrades(profile)['carbon-plates']` from
`src/lab/lab-heli.js` (only when the `lab` switch is on) and passes `carbonPlates: true` into
`startCampaign` beside `combatArmorKit`; `src/game.js` keeps it on the race state;
`initializeCombatArmor` multiplies the player's kit armour by 1.4. No save change. One line in
`docs/LAB.md` 4.2 changes to "every Wasteland armour kit gives 40% more protection for the
same weight".

**D. Take Carbon plates out of the shop.** Remove the row from `LAB_UPGRADES`, its lines in
`tools/test-lab-rules.mjs` and `docs/LAB.md`. The lesson then opens only the Heavy hook. A
player who already bought it keeps a harmless `owned` flag (`trueMap` in
`src/lab/lab-save.js` keeps any id), but has paid 1,500 credits for nothing; refunding it
touches saved credits, which is Kyle's call under rule 18.

Recommended pick: **C**. It keeps the shop's promise that a Lab pass buys something real,
changes nothing for anyone who has not bought it, and stays inside one file's armour sum.

## Checks (for C; set before code)

1. In the combat armour suite: with Carbon plates, the player's Raider car starts with base
   armour plus 28; without it, plus 20; the crash body weight (`_vehicleSpec` mass) is the
   same either way; an opponent's kit is never changed.
2. `carbonPlatesOwned` is true only when the `lab` switch is on and the profile owns
   `carbon-plates`; with the switch off a race is exactly as today; the Armory shows the owner's
   real figure. (Checks 1 and 2 live in `tools/test-armor-kits.mjs`, beside the kit armour test.)
3. Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`), replay and world
   signature guards unchanged, `npm run build`, and `combat-balance.mjs --check`.

Laptop-only checks: none needed beyond the build; the Armory and HUD do not change.

## Claude answers

2 November 2026 (Kyle picked it in chat: "Build C: stronger plates"): **C**. Owning Carbon
plates, with the `lab` switch on, makes the player's paid kit give 40% more armour at its usual
weight, rounded to whole points (14, 28, 42). The crash body weight, opponents' kits and the
earned looks stay as they are. The Armory shows the owner's real figure ("+28 ARMOR") and says
the plates are carbon, so the player can see what the purchase did. The rule for "owned" lives in
the Lab (`carbonPlatesOwned` in `src/lab/lab-shop.js`, beside `waxKitOwned`); the 40% lives with
the kits (`src/armor-kits.js`).
