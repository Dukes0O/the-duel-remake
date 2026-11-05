# LAB-CLASSROOM-LANGUAGE: Strength against weight

Rules and method: `docs/board/cards/LAB-CLASSROOM-LANGUAGE.md`. No game rule, challenge, reward, save or notebook id changes.
Every number comes from the bench's `loadBar` and `hookArm`.

## What changed

- **Words.** Every sentence is rewritten as a teacher would say it, in whole sentences, and objects are named. The verbs are
  accurate: a load "brings the stress to 73% of the strength of the steel", rather than a car "using" strength.
- **Definitions.** Hook arm, steel, aluminium, carbon fibre, millimetre, kilogram, density, kg/m³, load, stress, N/mm², newton,
  strength, bending for good, spring back, stiff, dip, E, brittle and ram are each explained on first use.
- **The real rule is now taught.** The lesson used to say that a thicker bar is stronger. It now says why: thickness comes from
  density (weight ÷ (density × length × width)), and thickness counts twice in what a bar can carry and three times in how little it
  dips. It also now says something the old words hid: steel is the stiffer material (E of 200,000 against 135,000 N/mm²), and the carbon
  fibre bar dips less only because it is about five times as thick.
- **New step "Density".** Keys 1, 2 and 3 show the 1 kg bar in each material, drawn to scale, and the sum follows the key.
- **New step "Test your own settings".** Any material and any thickness; the sums change on every press, a table keeps the results,
  and three different arms open Continue. Show me tries a different arm each time, so it reaches three and finishes.
- **The physics panel.** Sums on every step after the first, all computed from the rounded numbers they show: the bar's thickness, force,
  stress, strength used, dip, what the part can carry, the arm's weight, the load carried for each kilogram of arm, and strength ÷ density.
- **Nothing gives an answer away.** While the player guesses what the car will do to the thin arm, the panel shows the arm's weight and
  the force, and the two sums that would settle it stay as bare formulas until the car is on. Questions 1 and 2 show general formulas
  only. Question 3 shows the weights already on its cards and the two rules. The Watch's sums fill in when the ram has finished.
- **The picture.** Arrows on the part show the top stretched and the bottom squeezed, largest at the vice and growing with the load. A panel
  shows the end of the bar to scale, tinted the same way. The length is marked, the weights show their force in newtons, and the arm's
  card shows the end of the arm. The Stiff step keeps "dipped 23.7 mm, then sprang back" on the board after the weights come off.
- **Strength stays open.** ↓ takes a weight off, so the player sees the bar spring back, and it fits a fresh bar after one bends for good.
- **Questions.** Each now has one literally correct answer as worded. Question 3 says what "best" means: the arm must hold the car under
  the two rules and add as little weight as possible.
- **Hints.** A hint that names a direction reads the handle ("Press ↓ until the handle reads 80 mm" from 110 mm). Show me's words stop at
  the guess on the Too thin step, because that is where it stops.

One independent review. Real faults, all fixed with tests: Show me's words were wrong from some handle settings; Too thin still asked for
carbon fibre after it was picked; an empty bar was asked for "another" weight; one panel entry had an empty heading. The look check then
found a stale "press 3 first", a button that promised the car before the guess, and a glow crossing a label.

## Removed

- All of the old wording in this lesson, the colons that skipped a verb, and the word "tough", which was never defined.
- The steel colour on the three guess pictures, because the arm in that guess is carbon fibre.
- The repeated carry formula in the Watch's panel: one formula now heads three results.

## Changed assertions (Claude's review, rule 18)

- `tools/test-lab-classroom-strength.mjs`: every assertion on wording moves to the new sentence and keeps its numbers (73%, 145%,
  23.7 mm, 0.3 mm, 1,991 kg, 164%, 157%, 80%, 67%, 61%, 18.8 kg, 6.5 kg, 41%, 33%, 18.9 mm, 2.9 kg, 2.4 kg, 16.4 kg, 44.9 mm). No check of
  behaviour is removed and no number is loosened.
- `playThroughTo` gains the two new steps. The "review fixes" test goes through the free test on its way to Brian's job, because
  that step now lies between them; what it checks is unchanged.
- Added: density keys and sums; ↓ on Strength and the closing words staying on the page; every arm's sums against the bench at every
  thickness; the panel not settling an open guess or question; the free test; Show me reaching three different arms; Show me's words and
  directions from every setting; the source check for she, her, mph and decides; sums on every step after the first.
- `tools/scenarios/lab-classroom-strength.mjs`: wording moves as above, it runs at 1920 by 1000, and it adds the two new steps, a check that
  sums follow the keys, a check that the panel keeps the guess open, and a check that a question is not cut off.

## Proposed voice lines

Claude records these at the merge, and the lesson's words already match them.

- `lab.brian.strength.intro`: "Here are three bars of the same weight, made of aluminium, steel and carbon fibre. The ram will load all three together until each one bends for good or snaps."
- `lab.brian.strength.explain`: "Aluminium is about a third of the weight of steel for the same size. Carbon fibre is lighter still and very strong for its weight, but it snaps instead of bending for good. For the same weight, a lighter material makes a thicker part, and a thicker part is far stronger and stiffer. Engineers choose the material by what the part has to do."
- `lab.brian.strength.pass`: "That arm holds the load for the least weight, which is the right choice for a helicopter."

`tools/test-lab-classroom-page.mjs` can add `strength` to its list of rewritten lessons at the merge; this lesson passes the same checks
in its own suite.

## Checks

- `tools/test-lab-classroom-strength.mjs` 24/24.
- Browser: `lab-classroom-strength` and `lab-view` (which plays this lesson at 1280 by 720) through the shared slot helper.
- Look: the word steps, the free test, a question with cards open and the recap read at 1920 by 1000. Text fits, labels do not collide,
  and the question is fully visible. Fixes from the look: readable small labels, a shorter arm panel, a caption that overran its card.
- Lane tier and build are left for the merge, as the brief asks. No frame check: the classroom is a 2D board.
