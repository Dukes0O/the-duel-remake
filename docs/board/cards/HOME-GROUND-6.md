# HOME-GROUND-6

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Astra: a machine, its view and the ground), Home Ground's step 6: the digger. Kyle's direction of
27 November 2026 (night): carry the building and the story on; Claude settles the design. Design: `docs/HOME_GROUND.md`
section 6 ("The digger takes it down", "Lanes stay open", "The digger does more than wreck") and step 5 as built in
section 16. Behind `home-ground`; it changes the save, so it keeps the lane tier and one independent review of the save.

Reuse before building: the excavator already exists (`src/machines/content/machines.js` `excavator`, its controls in
`src/machines/controls-view.js`, digging in `src/machines/plant.js` and `src/machines/dig-sandbox.js`, the dug-ground
look in `src/machines/dig-game.js`), and the flatbed and drill outings of steps 3 and 5 show how the yard sends him out
in a work machine.

## Design, settled by Claude before code

**Tin Town's excavator.** Once his tank stands, the board adds: "Auntie Solder has a digger doing nothing in her yard.
It's yours to borrow." The yard offers "Go out in Tin Town's digger". It is about 3 m wide and fits the 8 m lanes; an
outline that would shut the digger out of a building's door turns red and says so (the lane rule already does this for
the main lane).

**Tearing down.** Driving up to a coop, shed, tower, tank or greenhouse of his, the bucket's own controls bite it: the
roof first, then the walls, in four or five scoops, each scoop dropping a stage. What he tears down leaves a pile of
its tin and poles beside it. A tap of F on the flatbed takes the pile as that building's load, and the crew raise the
same building again where he marks it, at their fast rate. Small things (a panel, a box, a bed) are still picked up by
hand, free. Anything living moves out first: hens walk out of a coop before the first scoop, and the greenhouse's pots
are kept with their plants.

**The ditch.** Outside his fence the bucket digs a ditch a cell at a time (2 m long, 1.5 m deep). No wheel crosses
it: a raider's bike or buggy stops at its edge and goes round. A ditch cell left open beside the gate's lane is refused,
so the gate stays reachable.

**The cellar.** Under his shed, the bucket digs a cellar in four scoops. Once dug, half his store (eggs and scrap,
rounded down) is kept in the cellar, where raiders cannot reach it; a lost raid takes its tenth only of what is left
above.

**The pond.** Inside his ground, 2 by 2 cells dug four scoops deep; once dug, a well within 8 m fills it over 12 real
hours (as the tank fills). For now the pond is for the hens to drink at and for the look; geese and ducks come later.

**The save:** version 9 adds `ditch` (cells), `cellar` (`{dug}`), `pond` (`{i, j, litres, filled}`) and `piles`.
Older versions load unchanged after the verified backup.

**Sound cues** to name: `home.dig.bite`, `home.dig.dump`, `home.dig.tear`, `home.dig.ditch`, `home.pond.fill`.

## Checks

- `tools/test-home-ground.mjs` by behaviour: four or five scoops take a building down to a pile; the pile is that
  building's load and the crew raise it again; hens leave a coop first; a ditch stops a raider's wheels and never
  closes the gate's lane; the cellar keeps half the store from a lost raid; the pond fills on the real clock and never
  past full; a version 8 save loads unchanged.
- The lane tier, the rule 23 guards, the suites naming the excavator, `node tools/combat-balance.mjs --check` if a raid
  rule changes, and `npm run build`. One independent review of the save. Claude drives it by hand.
- Named checks: `test-home-ground`, `test-open-roam-start`, and the save group (`test-save-fixtures`,
  `test-career-backup`, `test-career-budget`). The existing excavator and work-vehicle suites accompany the lane tier.

## Codex decided (Claude to review)

- Use home save version 10: step 5C already owns version 9. `cellar.dug` counts four scoops; `pond.scoops` keeps
  partial work. Piles keep the original building, its water and greenhouse plants through delivery and rebuilding.
- Keep the existing excavator joints, tracks and bucket. B selects work; G chooses teardown, ditch, cellar or pond.
  Space takes a scoop and E empties the bucket. Four scoops finish a building, cellar or pond. Beds move free with B.
- The lost raid takes its tenth from above-ground eggs and scrap, as section 6 specifies; the cellar protects half.
- Changed assertion for Claude: `test-town-vehicles` adds the borrowed excavator to the exact allowed vehicle list.
  No old vehicle or check is removed; the excavator is also checked against garage and rival lists.
- `test-home-hens` expects migration to version 10 instead of 9, matching the approved additive save version.
  Its exact checks of all original pieces, hens, eggs and clocks remain.
- The independent save review found a missing pond clock trigger after the last tank was dismantled and pile
  validation occurring after crew access. Both are fixed and confirmed by the same reviewer on a second reading.
- Kyle reserved the laptop until 06:30 local. No tests, build, browser, frame or balance run before then.

## Claude answers

**28 November 2026, the three picks** (the questions file, commit `3abfda25d`): all approved. Version 10, keeping every
version 9 field, behind the verified backup. `cellar.dug` counts 0 to 4 scoops and the pond keeps its scoops, so half-dug
work survives leaving; a pile keeps its building and the greenhouse's plants through carrying and rebuilding. The drill
rig's hooks, with shared-file changes kept to the outing check and the excavator's keys. Checks after 06:30.
