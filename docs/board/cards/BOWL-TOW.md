# BOWL-TOW

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (a tow over the truck's path, a ramp as ground, rivals on the terraces). Kyle, 20 November 2026:
graphics and physics go to Astra, the rest to Sol.

Pull anything into the crowd. Design: [BOWL-SHOW-3](BOWL-SHOW-3.md), sections 1 to 4, with Kyle's words. After the first
release (needs BOWL-FINISH).

**The secret holds** (Kyle, 20 November 2026, `docs/board/decisions.md`): no goal, picker line, night card, lesson, hint or
weapon line names the stands, the ramp, the tow into the crowd or the bonus before the driver has done it. The trick card
and Trick School list G as "the tow hook: G pulls a car or a knocked-out truck behind you", and say nothing about where to.

## What to build

1. **The hook on G** in every Bowl event except the Scrapasaurus (which keeps F): the fight's reach and bite
   (`src/bowl/bowl-hook.js`, 25 m and 60 degrees), aimed at the nearest thing that is not driving (parked, junk or crushed
   car, bus, Bus Pile top bus, knocked-out truck). G again lets go. Check `src/input-contexts.js` that G is free in the
   Bowl's driving keys.
2. **The tow** (`src/bowl/bowl-tow.js`, new): the towed thing follows the truck's own track 15 m behind, as a trailer; over
   a jump it flies after the truck along the truck's line and lands where the truck landed; it bumps walls by the wall
   rules and never passes through a solid. Top speed with a car nine tenths, a bus seven tenths, a knocked-out truck six
   tenths. The cable snaps after one second caught behind a solid, and lets go when the event ends.
3. **The crowd ramp:** one dirt ramp against the stand wall on the Crush Straight, outside the racing line, as ground in
   `src/bowl/bowl-course.js` (the place is Claude's in BOWL-SHOW-3-LOOK; use a placeholder place from the card's data and
   say so). At 25 mph or more at its foot a truck rolls over the wall top onto the first terrace; slower, it rolls back.
4. **Delivery:** a towed thing at rest beyond the wall line is delivered. Points once each, through the crowd multiplier:
   car 150, bus 300, knocked-out truck 500. The crowd scatters round it as for a truck. It stays until the event ends.
5. **The bonus:** the first knocked-out rival truck the driver delivers in a night pays 300 scrap into the driver's own
   wallet, through the purse's own path in `src/bowl/bowl-save.js`, recorded so that a night pays it once however often it
   is played; in a Turn Show to that driver's own wallet, once a night. A design number for Claude's review, with one
   independent review (rule 17, pay).
6. **Last Truck Rolling on the terraces:** a truck on the terraces is still in the Bowl; only the car park is out, and the
   driver's own truck keeps 15 seconds there to come back through a gate. This replaces the rule that a truck over the
   wall is out (`src/bowl/bowl-weapons.js` near line 164, and BOWL-SHOW-2 section 3). A rival chasing the driver follows
   it up the crowd ramp and fights on the terraces; a rival never goes up first; one follows at a time on Easy, two on
   Medium, all on Hard. A rival knocked out on the terraces pays 200 points and no bonus.
7. **Words, said only after the thing has happened,** each one full plain sentence (`memory/dialogue-plain-prose`), in
   `src/bowl/bowl-lines.js`: the pop-up "INTO THE CROWD! +500"; Big Mo for a truck: "Did that truck just drag Rust Rhino
   into the crowd? Somebody give our driver a bonus!" (the rival by name); for a car: "That car has a better seat than I
   do now."; the result card: "You dragged Rust Rhino into the crowd, and Big Mo paid you a bonus of 300 scrap."; when the
   cable snaps: "The cable caught on something and snapped, so press G to fire it again."
8. **Events:** `bowlTow {phase: 'fire' | 'bite' | 'snap' | 'letgo', what}`, `bowlDelivered {what, points}`,
   `bowlTowBonus {rival, scrap}`.

## Files and locks

`src/bowl/bowl-hook.js`, `src/bowl/bowl-tow.js` (new), `src/bowl/bowl-course.js`, `src/bowl/bowl-outside.js`,
`src/bowl/bowl-rivals.js`, `src/bowl/bowl-weapons.js`, `src/bowl/bowl-night.js`, `src/bowl/bowl-save.js`,
`src/bowl/bowl-lines.js`, `src/bowl/bowl-hud.js` (the hook's mark), `tools/test-bowl-tow.mjs` (new), and the older suites
below. Locks: `bowl-night`, `bowl-rivals`, `bowl-floor`, `save-shape`.

## Checks

1. `tools/test-bowl-tow.mjs`: each kind of thing can be hooked, towed over a jump and up the ramp, and delivered once; a
   rolling rival cannot be hooked; the cable snaps behind a solid; the bonus is paid once a night and never twice, in a
   solo night and in a Turn Show; a truck at 20 mph rolls back down the ramp and at 25 mph goes up.
2. `tools/test-bowl-rivals.mjs` and `tools/test-bowl-weapons.mjs`: rivals follow up the ramp by level and never go first;
   a truck on the terraces is in play and one in the car park is out; the launcher's throw into the crowd no longer ends
   the rival.
3. `tools/test-bowl-save.mjs` with the bonus record, reviewed by the save checker; `tools/test-bowl-out.mjs` and
   `tools/test-bowl-course.mjs` with the ramp. World signatures of the Bowl change only with Claude's reviewed picture of
   the ramp (AGENTS "Never").
4. Laptop only, Claude runs: one Last Truck Rolling by hand, dragging a knocked-out rival up the ramp.

Before CARD DONE, search `tools/` for `bowlOutside`, `out of the Bowl`, `outsideGateAt` and the launcher's knock-out and
bring each older suite and scenario that names them up to date. A changed assertion needs Claude's written review on this
card (rule 18).

## Sound cues

`bowl.tow.fire` (the hook leaves; stand-in `bowl.hook.fire`), `bowl.tow.bite` (stand-in `bowl.hook.bite`),
`bowl.tow.drag` (a scrape while towing; stand-in `vehicle.tires`), `bowl.tow.snap` (stand-in `bowl.hook.jerk`),
`bowl.tow.letgo` (stand-in `bowl.hook.letgo`), `bowl.crowd.delivered` (the crowd's scream and cheer; stand-in
`crowd.cheer`), `bowl.tow.bonus` (scrap paid; stand-in `interface.bonus`).

## How it merges

Behind `titan-bowl`, but it changes pay and the save, so the lane tier and its reviews before the merge (rule 23, "Not
covered"): `node tools/run-tests.mjs --tier lane --changed --jobs 4` and `npm run build`, recorded in
`docs/changes/BOWL-TOW.md` with a Removed line (the old "over the wall is out" rule). No Chrome under `codex exec`.
Memory-only saves. No new dependency, network request or key. Clean up nothing outside this lane.
