# BOWL-TRICK-SCHOOL

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (lessons and words). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

The game teaches the trick list. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 2, "How the game teaches it". Kyle, 20
November 2026: "backflips and front flips exist but nothing tells the player. The trick list must be taught in the game."
Read `memory/teach-dont-slide` and `memory/lessons-teach-in-prose` in spirit: every word is explained with a picture, the
driver does the thing, and a failed try says why.

## What to build

1. **Trick School,** an event of its own on the Bowl with no clock, no target and no purse, opened by a TRICK SCHOOL button
   on the Show Night picker and offered once before a driver's first night ("First time here? Come to Trick School first",
   with "Not now"). Eight lessons in the order of the design's table: wheelie, stoppie, donut, spin, front flip, backflip,
   barrel roll, side flip. Each lesson shows the trick's picture and key caps (BOWL-HUD's trick card pictures), one
   sentence saying what the word means, and waits until `bowlTrick` reports that trick; then it is ticked and the next one
   opens. For the lessons in the air the truck is put on the run-up to the right jump (a kicker for single turns). After
   the last lesson the floor stays open for free practice until the driver leaves.
2. **Why a try failed:** one sentence, said once for each cause in a lesson and once an event elsewhere, from what the
   truck did: too fast for a wheelie; too slow for a stoppie; let go before the turn was complete; landed on the roof;
   the jump was too small for a double; the roll was made nose first, so it was a barrel roll and not a side flip.
3. **Tonight's trick:** a night's data names one or two tricks. The picture and keys are on the card before the event,
   and that trick pays double that night (BOWL-NIGHTS supplies the table; here the rule and the card).
4. **Lessons done** are kept with the driver's Bowl records, so the offer is made once and ticks stay.

Every sentence on screen is one full plain sentence (`memory/dialogue-plain-prose`). Claude reads them all in the closing
drive of BOWL-SHOW-2.

## Files and locks

`src/bowl/bowl-school.js` (new: the lessons and the reasons, as data and rules), `src/bowl/bowl-night.js` (register the
event), `src/bowl/bowl-lines.js`, `src/bowl/bowl-screens.js` (the button, the offer, the lesson panel),
`src/bowl/bowl-save.js` (lessons done: a new optional field, old saves read as none done), `tools/test-bowl-school.mjs`
(new), `tools/test-bowl-save.mjs`. Locks: `bowl-night`, `bowl-screens`, `save-shape`.

## Checks

1. `tools/test-bowl-school.mjs`: scripted keys complete all eight lessons in order on the real floor; each failure cause
   produces its sentence once; a save without the new field loads with no lesson done and nothing else changed.
2. `tools/test-bowl-save.mjs` with the new field, reviewed by the save checker (rule 6).
3. Laptop only, Claude runs: Trick School played through by hand from the picker.

## Sound cues

`bowl.school.tick` (a lesson is done; stand-in `interface.bonus`), `bowl.school.next` (the next lesson opens; stand-in
`interface.radar`), `bowl.school.why` (a reason is shown; stand-in `interface.countdown`), `bowl.school.done` (all eight;
stand-in `crowd.cheer`).

Behind `titan-bowl`. Builder's checks, then the lane tier and `npm run build`, recorded in
`docs/changes/BOWL-TRICK-SCHOOL.md` with a Removed line. Before CARD DONE, search `tools/` for every id and name this card
changes and bring each older suite and scenario that names it up to date. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key. Clean up nothing outside this
lane.

## Preflight question for Claude, 20 November

I propose an optional record with the driver’s completed trick IDs and whether the offer has been shown. An old save reads as no lessons complete and no prior offer. Accepting or declining the offer records it once. Each lesson tick is recorded as soon as the trick is completed. School uses the Show Night truck and has no purse.

May this card extend the existing Show Night launch and save wiring in `src/app.js` for Trick School, including the same active-player and run checks used by Show Night? May it report failed attempts from `src/bowl/bowl-tricks.js`, where the controls, turns remaining and landing result are known? The report changes no trick rules. The School or Bowl event shows each reason once, and the hook is silent in other game modes.
