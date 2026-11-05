# LAB-CLASSROOM-LANGUAGE: Air and altitude

Rewrites the Air and altitude lesson to the standard in `docs/board/cards/LAB-CLASSROOM-LANGUAGE.md`. The rules, the
challenge, the rewards, the save and the notebook ids do not change, and every number still comes from the same bench
function.

## What changed

- Every sentence is rewritten as a teacher would say it. Kestrel One is "the helicopter" or "Kestrel One" throughout, and
  "she" and "her" are gone from the code and the screen.
- The reason comes first. Air has weight, so the air at Sea level has all of the air above pressing down on it, and higher up
  there is less air above, so the particles spread apart. The rotor throws air down and the air pushes back, so thinner air
  means a smaller push. The engine also burns its fuel with air from outside. The game uses one rule for both effects, which
  is why the push falls to 71% while the air in the jar falls to 75%, and Brian now says so.
- Metres, kilograms of push, the percent mark, the lever's percentage and hover are each defined before they are used. "Bits
  of air" become dots in a jar, and the lesson says that the jar from Sea level is drawn with 100 dots.
- The physics panel appears on every step after the first, with the game's own rules: altitude, air density at a height, how
  much of the push remains, the most push, the push at a lever setting, the total weight, the lever needed to hover, the crates
  the helicopter can carry, and the fuel burned each minute. Every sum comes out on a calculator from the figures it shows.
- The panel explains the 15% extra push close to the ground, which is why the lesson's 3,887 kg is more than the flying
  gauge's most push.
- The word steps stay open after the answer. Moving the stand changes the jar and the sums, and the closing words name their
  places, so they stay true.
- New step "Test your own settings": any place and any number of crates, the sums change on each press, a table keeps the
  results, and three different settings open Continue. Show me tries a different setting each time, changing the crates and the place in turn, so Show me
  alone can finish the step and the comparison teaches both.
- Pictures. A new column of air shows why the air thins, drawn to scale up to 11,000 m, with arrows for the air above pressing
  down. The rotor now throws a cloud of dots down, with fewer dots in thin air. New bars compare the push with the weight, so
  the player can see the green bar reach the red mark. The jar stays and keeps showing its dots.
- Nothing settles an open guess or question. While a guess is open, the most push at Summit Run leaves Brian's words, the
  readouts, the bars and the panel, which shows Sea level's sum instead. While a question is open, the panel shows general
  formulas and the board keeps back the column that would answer it. Brian's job shows its crate sum as "= ?" until the job
  is done.
- Directions hold from every setting: above the red line, the prompt and the hint say to hold S.
- The step's opening words no longer change with a control. Brian's job moved its live numbers into the prompt.
- Question 3 now says "without refuelling on the way", so the pump answer is wrong as worded.

## Removed

- All of the old wording in this lesson, including the "bits" of air and the fragment "Thin air, less lift."
- The rotor's streak arrows, replaced by the falling dots.
- The `want` helper's name, which is now `motion`, because nothing here wants anything.

## Changed assertions

Reviewed for Claude's check under rule 18.

- `tools/test-lab-classroom-altitude.mjs`: every assertion on wording moves to the new sentence and keeps its numbers (2,910,
  2,777, 133, 3,887, 3,513, 757, 243, 353, 34.4, 28.8, 48.0, 70% and 50% are all unchanged). No check of behaviour is removed and
  no number is loosened.
- In the same suite, the check that a click where Brian points does what he points at now expects "go" for the new "set:next"
  target. A click on lift off tests the setting on the board, while Show me chooses a new setting first.
- Added: the sums follow the height and the load; every sum comes out at every place and load; the free test; Show me reaching
  three settings; nothing settling an open guess or question; directions from above the line; words defined before use; formulas
  on every step; the source check for "she", "her", "mph", "decides" and "air takes".
- `tools/scenarios/lab-classroom-altitude.mjs`: wording moves as above, the scenario runs at 1920 by 1000, and it adds checks
  that the sums follow the controls, that the panel keeps back the answers to the two guesses, that each question is fully
  visible, and that the free test works.

## Proposed voice lines

Not recorded here. Claude records these at the merge, with `src/lab/lab-lines.js` and the table in `docs/LAB.md`.

- `lab.brian.altitude.intro`: "Now the stand will visit each place in turn. At each place the lever goes all the way up, and we
  write down the most that the rotor can push."
- `lab.brian.altitude.explain`: "Higher up there is less air above to press down, so the air is thinner. The rotor then has less
  air to throw down, and the engine has less air to burn its fuel with. At Summit Run a jar holds about three quarters of the air
  that it holds at Sea level, and in this game the rotor pushes seventy one percent as much. So plan your load for the height
  where you will land, and fly straight there, because at high altitude the helicopter burns fuel faster."
- `lab.brian.altitude.pass`: "Thinner air gives the rotor less to push against, so always plan your load for the height where
  you will land."

## Checks

- `node tools/test-lab-classroom-altitude.mjs`: 18 of 18.
- `node tools/test-lab-classroom-page.mjs` passes. The lesson's own suite also applies that file's source patterns and its
  formulas check to this lesson, because the lesson is not yet on that file's list.
- Browser walkthrough `lab-classroom-altitude` at 1920 by 1000 passes. Screens read: the wonder, the word steps, the watch, both
  guesses, the free test, Brian's job, the three questions, the recap and the challenge card. Two look faults were found and fixed
  along the way: labels colliding in the air column and in the readouts, and the push label running under the readouts.
- One independent review found wrong verbs ("the lever hovers", "takes 70% of the lever"), a load named when there were no crates,
  and Show me testing no crates at all three places. All are fixed, with tests.
- The lane tier and the build are left for the merge, as the brief asks. No frame check, because the classroom is a 2D board.
