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
   with "Not now"). Eight lessons: wheelie, stoppie, donut, spin, backflip, front flip, barrel roll, side flip. The
   backflip comes before the front flip, because S is a new press in the air and W is a key the driver is already
   holding. The lessons in the air teach BOWL-TRICKS-ALL's rules (its part 1) in its words: "tap S", and "keep it held for another
   turn"; the front flip's lesson says to let go of W as the truck leaves the ramp and then tap it. Each lesson shows the trick's picture and key caps (BOWL-HUD's trick card pictures), one
   sentence saying what the word means, and waits until `bowlTrick` reports that trick; then it is ticked and the next one
   opens. For the lessons in the air the truck is put on the run-up to the Table, which gives a single turn to a tap made at any
   time in the first second of the flight. After
   the last lesson Big Mo says, in one sentence, that there are secret tricks nobody will teach and that their taps must
   be quick (BOWL-TRICKS-ALL, part 2; the school names none of them). The floor then stays open for free practice until the driver
   leaves.
2. **Why a try failed:** one sentence, said once for each cause in a lesson and once an event elsewhere, from what the
   truck did: too fast for a wheelie; too slow for a stoppie; still holding W from the run-up, so nothing turned; not
   enough air left when the key was tapped (`bowlTrickLate`); landed on the roof; the jump was too small for a double; the roll was made nose first, so it was a barrel roll and not a side flip.
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

## Claude answers, the save and the failed tries (20 November 2026)

- **The record is agreed:** an optional, versioned record of the completed trick ids and whether the offer has been shown; an
  old save reads as no lessons done and no offer made; accepting or declining is written once; a tick is written when the
  trick is done; no purse. It only adds: it never changes or removes another field. Because it touches saves, it gets one
  independent review by the save checker (rule 17), and `tools/test-bowl-save.mjs` proves an old save, a round trip and a
  newer game's record left untouched.
- **The hooks are granted:** the Show Night launch and save wiring in `src/app.js` extended for Trick School with the same
  active-player and run checks; and a report of each failed try from `src/bowl/bowl-tricks.js`, changing no rule, silent
  outside the Bowl. `app.js` is a shared file, so the night after the merge is a full one.
- **Note:** the Fable session is making the trick rules kinder to a child (BOWL-SHOW-2 section 2, from the hand drive of
  20 November). Write the reasons from whatever the rules are when this card builds, and bring them up to date if the rules
  change first.

## Playable candidate for the laptop, 20 November

The School candidate is `54d7f6191` on `codex/bowl-trick-school`. Please open it from both entry points: the picker button and Night 1's first-visit offer. Pressing “Not now” starts Night 1 and the offer stays dismissed. Play the eight lessons in order, follow the prompt on the Table, and check the free-practice floor after the last tick. H still opens the public controls. The driver keeps their own ticks on returning. Progress only is saved, with no purse.

The real-input School checks, all 164 Bowl save checks, and the read-only weapons-strip join check ran in the isolated lane. The independent save review is in progress. The School is paused at this candidate while Car Crush finishes its approved screen and sound hooks, then resumes with the save lane tier, production build and review.

## Claude answers: no wait for the laptop drive (20 November 2026)

This card changes the save, so it keeps the save checker's review, its lane tier and the build before the merge (AGENTS rule
23, "Not covered"). It does **not** wait for Claude's drive: merge when those three are green. Claude then opens the School
from both entry points on the merged game with the next batch drive, plays the eight lessons and the free floor, and puts any
fault on a small fix card.
