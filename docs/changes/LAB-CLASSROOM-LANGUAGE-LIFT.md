# LAB-CLASSROOM-LANGUAGE: Lift and weight

Claude (lane `claude/lang-lift`), 4 November 2026. Rules and method: `docs/board/cards/LAB-CLASSROOM-LANGUAGE.md`.
No game rule, challenge, reward, save or notebook id changes; every weight and lift still comes from `padForces` and so from the helicopter's own flight rules.

## What changed

- **Words.** Every sentence is rewritten as a teacher would say it. Kestrel One is called the helicopter throughout (the old source said "she" and "her" about 90 times).
  The pad's dial reads a number; it no longer "feels" one.
- **Definitions.** Mass, kilogram, weight, force, newton and g come first, with the reason that a scale, and this game, can give a weight in kilograms. The rotor, Newton's third law and lift
  follow: the tilted blades push the air down, so the air pushes the rotor up. A lift of 500 kg is defined as a push that could hold up a mass of 500 kg.
- **The lever explained, as Kyle asked.** Raising the collective lever tilts every blade more steeply at the same moment, which is where the name comes from. A steeper blade throws more air down each
  second, so the air pushes back harder. A new picture beside the lever shows one blade seen end on, tilting as the lever moves, with more air arrows under it.
- **Why it hovers.** Lift and weight are two forces, and when they are equal they cancel, so no force is left over to move the helicopter.
- **Same terms as Air and altitude** (`claude/lang-altitude`): the lever, the red line, the push, most push, `push = lever × most push` and `lever to hover = weight ÷ most push`. The lever now also
  reads as a percentage.
- **New step "Test your own settings"** (`try-free`). Any load and any lever; the sums change on the press; Space writes the result in a table. Three different settings open Continue, a repeat does not count,
  and Show me reaches three different settings by itself.
- **The physics panel**: total mass, weight = mass × g in newtons, kilograms of push = newtons ÷ g, dial = weight − lift, most push = 3,380.4 kg × 1.15, push = lever × most push, lever to hover, and
  extra push = lift − weight. Worked lines come out on a calculator from the numbers they show. During an open guess or question the panel gives only general formulas.
- **Pictures.** Clearer air arrows that stop at the pad, a green arrow on the rotor labelled "air pushes the rotor up", and a red weight arrow on the same scale.
- **Guesses that are really open.** The wonder used to show the Dusthawk with two crates staying down, and the Three loads step showed all of the guided tries' answers. The wonder now uses three crates, with two
  coming off together, and Three loads uses one, three and four crates, teaching that a heavier load needs a higher lever. The red line's "above the top" label is hidden during a guess.
- **Small faults fixed.** "Take the crate off with 2" appeared after the crate was already off. A hint saying to press W now says S when the lever is above the line. Brian's job now says why the helicopter climbs
  when the lever goes past the line. "Lever", "rotor" and "hover" no longer appear before the steps that define them.

## Removed

- All of the old wording, the `padFeels` name, the "the pad feels" label and the colon captions on the board.
- The Dusthawk loads from the Three loads step, and the two crates from the wonder's starting picture (now three).

## Changed assertions (for Claude's review, rule 18)

- `tools/test-lab-classroom-lift.mjs`: each assertion on wording moves to the new sentence and keeps its numbers (1,630, 2,910, 3,410, 3,887, 3,910, 23 and 977 kg).
- One number moves: the wonder's replay check expects 3 crates rather than 2, because the wonder must not show the answer to the Two more crates guess. It still proves that a replay restores the full load.
- The walkthrough helper gains the free test. No check is removed or loosened.
- Added: the sums follow the load and the lever; the lever sums come out on a calculator at every setting; the free test's counting; Show me on the free test; nothing gives away an open guess or question; a hint is
  right from either side of the line; words are not used before they are defined; the lesson's band and hold time equal the challenge's own; and a source check that also bars "feels".
- `tools/scenarios/lab-classroom-lift.mjs`: runs at 1920 by 1000. Added: the free test, sums following the controls, questions fully visible, no worked sum during a question, and earlier words staying on the page.

## Proposed voice lines

Not recorded. Each matches what the lesson now says on its page or its board.

- `lab.brian.lift.intro`: Here are three loads, and each time the lever goes up until the lift equals the weight of that load. Watch how far the lever has to go.
- `lab.brian.lift.explain`: To hover, the rotor has to throw air down hard enough that the air pushes back as hard as the Earth pulls the helicopter down. A greater weight needs more push, which means a higher lever, and every rotor has a most that it can push.
- `lab.brian.lift.pass`: That is well done. Now you know why a heavy load is a hard lift.

## Checks

- `node tools/test-lab-classroom-lift.mjs` 18/18; `tools/test-lab-classroom-page.mjs` 6/6 (Lift still needs adding to its `REWRITTEN` list at the merge; the suite's own source check covers it now).
- Browser walkthrough `lab-classroom-lift` at 1920 by 1000 passes through to the helicopter challenge, and the pictures were read for fit.
- Lane tier and build are left for the merge, as the brief says. No frame check: the classroom is a 2D board.
