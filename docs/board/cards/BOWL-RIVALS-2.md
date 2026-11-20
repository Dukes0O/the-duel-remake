# BOWL-RIVALS-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (the rivals' pace and habits). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

Rivals that compete. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), sections 2 and 6. Kyle, 20 November 2026: the rival in the
side-by-side race "does almost nothing and crawls; rivals in general are weak".

**Measured before (Claude's hand drive):** the rivals' top pace is 13 to 15 mph on Easy, 24 to 26 on Medium and 28 to 32
on Hard (`BOWL_RIVALS` `pace`), against about 50 mph for the driver's truck. Old Bess needs about 49 seconds for a lap
that takes the driver about 17. In Last Truck Rolling the rivals also back up and stand still.

## What to build

1. **Pace from lap time.** Measure a clean lap of a lane for the show truck in the simulation and keep it as the
   reference. A rival's lap on Easy is 1.35 times it (Old Bess 1.45), on Medium 1.12 times, on Hard 1.0 (Dragon Wagon
   0.97). The `pace` numbers in miles an hour go.
2. **Close at the line,** Easy and Medium only: a rival more than 25 m ahead eases off by up to 15 percent, and one more
   than 25 m behind pushes by up to 8 percent.
3. **Side by Side is twice round.** The rivals take their kickers, brake for the turns, and each has one habit: Old Bess
   runs wide in the turn; Rust Rhino brakes late and brushes the wall; Tin Lizard is quick in the turn and slow on the
   straight; Big Kettle takes 1.6 seconds to get going and is then the fastest in a straight line; Dragon Wagon flips
   over the last kicker and loses half a second. A rival never stops for a wall (BOWL-WALLS).
4. **Rivals' scores in Freestyle:** the target is shown as a rival's score ("BEAT OLD BESS: 300"). The numbers are
   BOWL-TRICKS's measured targets; here, the rival for each night and the words.
5. **Last Truck Rolling:** the rivals keep moving at 30 to 40 mph, charge, and go for each other as well as the driver.
   No rival backs away for more than 2 seconds or stands still for more than 1. (Weapons are BOWL-WEAPONS's.)

## Files and locks

`src/bowl/bowl-rivals.js`, the Freestyle goal in `src/bowl/bowl-night.js`, `src/bowl/bowl-lines.js`,
`tools/test-bowl-rivals.mjs`, `tools/scenarios/bowl-rivals.mjs`. Locks: `bowl-rivals`, `bowl-night`.

## Checks

1. `tools/test-bowl-rivals.mjs`: on each level each rival finishes two laps inside 5 percent of its target time; a
   scripted child-pace driver who meets one wall wins Side by Side on Easy at least 9 times in 10 and by less than 6
   seconds; a clean scripted driver loses to Dragon Wagon on Hard by taking a turn wide. In Last Truck Rolling no rival is
   under 5 mph for more than 1 second while it is sound.
2. The scripted drive (one way): `tools/scenarios/bowl-rivals.mjs` brought up to date for two laps. Claude runs it.
3. Every changed assertion listed in the change note for Claude's review (rule 18).

## Sound cues

`bowl.race.lights` (the start lamps; stand-in `interface.countdown`), `bowl.race.finish` (the finish gate's lamps name the
winner; stand-in `interface.win` or `interface.lose`), `bowl.rival.jump` (a rival lands a jump near the driver; stand-in
`heli.setdown.thud`).

Behind `titan-bowl`. Builder's checks, then the lane tier and `npm run build`, recorded in `docs/changes/BOWL-RIVALS-2.md`
with a Removed line. Before CARD DONE, search `tools/` for `sideBySide`, `side-by-side`, `pace` and each rival's id and
bring each older suite and scenario that names them up to date. No Chrome under `codex exec`: any browser scenario is
"Claude runs". Memory-only saves. No new dependency, network request or key. Clean up nothing outside this lane.

## Build decisions, 20 November

- Measure the reference on the current Bowl after the wall and trick cards. Tune a lap against a neutral, repeatable driver before measuring the Easy and Hard head-to-head results.
- Use continuous track progress from each truck's own start to compare the two lanes. A gap over 25 m changes the pace only at Easy and Medium. Leave weapon behavior with BOWL-WEAPONS.

## Decision needed from Claude, 20 November

The neutral test driver measured a clean lane lap of 19.70 seconds at 49 mph on the straights and 36 mph heading into a bend. Three alternative speed and line choices were slower or touched the wall. Use 19.70 as the reference and allow up to 75 seconds for two Easy laps with the 15 percent lead slowdown.

The current rival driver owns its pace, braking and steering inside `src/sim-rival.js`, and the arena pilot chooses fights in `src/arena/arena-event.js`. May this card pass an optional Bowl-only speed and lane plan into those existing paths without changing ordinary rival behavior? It also needs one read-only update to the finish lamps in `src/bowl/bowl-stadium.js` and the existing Show Night audio dispatch in `src/app.js` for its named race cues. The card will prepare the two-lap rules and measured pace before those hooks.

## Claude answers (20 November 2026)

- **The reference lap: 19.70 s** from the neutral driver is accepted, and so is 75 s for two Easy laps with the 15 percent
  slowdown while the rival leads.
- **The hooks are granted:** an optional Bowl-only speed and lane plan passed into `src/sim-rival.js` and
  `src/arena/arena-event.js`; the read-only update to the finish lamps in `src/bowl/bowl-stadium.js`; the named race cues
  through the existing Show Night audio dispatch in `src/app.js`. Conditions: with no plan passed, every rival drives
  exactly as before (replay fingerprints and combat balance unchanged); nothing outside the Bowl with `titan-bowl` on reads
  the plan; `app.js` is a shared file, so the night after the merge is a full one.

## Follow-up hook for Claude, 20 November

The granted stadium update currently receives only time and crowd level. Please grant one read-only wire in `src/bowl/bowl-view.js` to pass the existing Bowl event state to that stadium updater. The lamps use the event’s first finisher, and no ordinary course or player state changes.

## Claude answers, the stadium wire (20 November 2026)

**Granted:** one read-only wire in `src/bowl/bowl-view.js` that passes the existing Bowl event state to the stadium updater,
so the lamps can show the event's first finisher. Nothing outside the Bowl reads it, and no race state is written.

## Assertion review requested from Claude, 20 November

Lane `codex/bowl-rivals-2`, code at `fd7cd027e`. The 209 focused checks passed. All fifteen neutral rival runs met the five percent two-lap target, the one-wall Easy driver won by less than six seconds in at least nine of ten seeds on both nights, and a wall-free wide turn changed the clean Hard win over Dragon Wagon into a loss. Ninety Last Truck Rolling trials check that a sound rival never stays below five mph for more than one second.

The old tests pinned one lap, speed caps and at least eight Easy wins for a different race. They now check two actual laps, elapsed targets and the newer one-wall test described above. The former driver still runs on all three levels and reports its results (four Easy wins over Old Bess, zero over Rust Rhino with the new pace); the newer driver keeps to a 26.55–26.85 mph cap, clips a wall under its own inputs and lets go of the keys in the air. The legacy knockout credit, caption, sounds, no-wear and unarmed fight checks stay. Night and Turn checks still prove the existing progression and purse. The browser drive now watches the first finish signal and both scheduled laps.

## Laptop drive, 20 November

Please run `bowl-rivals` on lane `codex/bowl-rivals-2` at `915619b86` while the builder’s lane tier runs. The scenario keeps the HUD opening confirmation and the short Last Truck Rolling goal. It checks both Rust Rhino starting distances, waits for the first finish signal and captures the gate before the result. All 32 browser expressions parse, and the independent check of the scenario passed.

The review also checked that two crossings in one simulation tick use the first actual crossing, that a sound rival leaves its retreat after two seconds, and that Dragon Wagon’s final flip costs time against the same pilot with the flip disabled on each level. The production build passed at `915619b86`. Ordinary combat balance passed at `f6a1298c6`, before joining the HUD scenario conflict.

## Builder gate complete, 20 November

Handoff commit `6303ea683`. The lane tier at `915619b86` passed 118 of 119 suites, including all 216 Rivals checks, 297 race replay checks, 12 combat replay checks and the world signatures. The one-wall Easy driver won by less than six seconds in 10 of 10 runs on each of nights one and two.

The HUD suite held two exact copies of the old text. At `e091d596d` it still checks the whole line, now “Beat Old Bess: 310.” and “Beat Old Bess over two laps.” The focused suite passed. Please review those two assertion changes with the earlier list. No game code changed after the laptop candidate.

## Claude answers, the HUD text (20 November 2026)

**Approved under rule 18, `e091d596d`:** the HUD suite still checks the whole line, now "Beat Old Bess: 310." and "Beat Old
Bess over two laps.", matching the two-lap race. Nothing is loosened. The `bowl-rivals` browser run on `915619b86` is Claude's,
now running on the laptop; the verdict follows here.

## Claude answers, the browser run (20 November 2026)

**Merge when green.** `bowl-rivals` passed on `6303ea683` (6 pictures, no warnings, memory-only). Rust Rhino crossed first,
the strip showed LEVEL 0 m at the start and BEHIND 217 m with 0:22 left, and Last Truck Rolling was won with the rivals
labelled HUNTING YOU and knocked out in turn. Whether a rival can be seen racing and coming at the truck is checked in
Claude's drive by hand at BOWL-FINISH.
