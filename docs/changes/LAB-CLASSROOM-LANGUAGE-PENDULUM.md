# LAB-CLASSROOM-LANGUAGE: Pendulums

Rules and method: `docs/board/cards/LAB-CLASSROOM-LANGUAGE.md`. Kyle and his son struggled with this lesson first of all, so the
work went beyond the words: a child who follows each prompt can no longer reach a state the prompt does not explain.

## What changed

- **Words.** Every sentence is rewritten as a teacher would say it. Pendulum, kilogram, metre, string length, second, swing time,
  π, √, metres per second, g, newton, degree, crane and hover are each defined in plain words before they are used.
- **Teaching order.** String length and metres come before swing time, so "15 m" means something when it appears. The Watch now
  shows the 15 m and 25 m strings only, and the old "light and heavy" Watch is gone, because it stated the answers to the two guesses
  that followed it. The 5 m string and the 200 kg weight are now real guesses, and the reason is given with each result.
- **The formula.** A new step gives T = 2 × π × √(L ÷ g), the rule of the pendulum test's own `stringPeriod`, after both guesses.
  A hook press changes the swing time sum. A weight press changes the numbers in (weight × g) ÷ weight and leaves the answer at
  9.81 m/s², which is why the weight makes no difference.
- **Free test.** String length, weight and pull-back (↑ and ↓, buttons on the board, or a drag), with live sums for the swing time,
  the trip and the average speed. Three different settings open Continue, the table keeps the results, and Brian compares each test
  with the one before. Show me tries a new setting each time. Pull-back is honest about its limit: in this game it never changes
  the time, and a real pendulum pulled back very far needs slightly longer.
- **Faults a child could fall into, now fixed.** A wrong press in a guided try used to leave a prompt that did nothing and a Show me
  that pressed nothing (5 m hook, then the 200 kg weight, then "press 5" for ever). The prompt, the hints and Brian's pointer now
  work out what is still wrong from whatever is hanging. A tap after the correct tap can no longer overwrite the result. A miss on
  the crane job says why and what to do.
- **Kestrel link.** Hovering is explained: nothing gives the car a new push, and the friction of the air and of the hook use up the
  swing. "A swing or two" became the game's own figure, a 3 m swing falling below 1 m in about 16 seconds, which a test measures on
  `stepCable`. The challenge card is unchanged and true. The recap, its card and its prompt send the car to the orange light, and
  the prompt names H to hook and H to let go.
- **Pictures.** A grown-up and a 1 m bar to scale, trip labels under the weights, gravity arrows with their sum on the heavy
  weight's result, the pull-back angle on the string, and "the car is still moving" on the wonder. The settling picture now runs at
  the game's rate and reads out the swing. It used to show "settled" at once, because the screen's clock overrode the lesson's.

## Removed

- All of the old wording, the `watch-weights` step, the old claim that slow swings are "easier to calm" (nothing in the game's rules
  shows it), and `goal` and `wrongSetup` on the guided tries.

## Changed assertions (for Claude's review, rule 18)

- `tools/test-lab-classroom.mjs` and `tools/scenarios/lab-classroom.mjs` hold this lesson's checks, so they moved in place; no
  `-pendulum` files were added. Pendulum wording moves to the new sentences with the same numbers. The G-force tests in the same file
  are untouched.
- The play-through scripts follow the new step order. The check that the table shows light and heavy at 7.8 s moved from the removed
  Watch to the heavy weight's result; the table check now covers 15 m and 25 m, and the 4.5, 7.8 and 10 s check stays. The crane's
  failed-tries test now starts at the crane. Nothing is loosened.
- Added: every wrong press in a guided try leaves a prompt and a Show me that reach the guess; no guess or question is settled early;
  sums come out on a calculator; hook, weight and pull-back move the sums; the free test and its Show me; mouse controls; the settling
  figures against the game's cable; the orange light; and a source check for the reviewed word faults.
- The scenario now runs at 1920 by 1000 and adds the wrong press, the sums following the controls, the free test and a closed panel
  during open guesses.

## Proposed voice lines

- `lab.brian.pendulum.intro`: Here are two strings of different lengths, 15 metres and 25 metres, with the same 20 kilogram weight on each. Both weights start together, and a stopwatch above each string times one full swing.
- `lab.brian.pendulum.explain`: A longer string makes a slower swing, because the weight has further to travel. The weight makes no difference, because a heavier weight is pulled harder but is also harder to get moving. How far you pull the weight back makes no difference either, because a wider swing travels further but also faster. In the helicopter, the car on its 15 metre cable is a pendulum too. Carry the car to the orange light, and hover still inside the ring until the car stops swinging. Then set the car down.
- `lab.brian.pendulum.pass`: A longer cable makes a slower swing, and hovering still lets any swing settle.

## Checks

- `node tools/test-lab-classroom.mjs` 38 of 38 and `tools/test-lab-classroom-page.mjs` 6 of 6.
- Browser scenario `lab-classroom` passes at 1920 by 1000. Claude read the screens: words, guesses, free test, questions with cards
  open, and the recap. The look check found the recap's weights running off their cards, a label on an arrowhead, and the settling
  picture's clock; all three are fixed.
- Lane tier and build are left for the merge, as the brief says. No frame check: the classroom is a 2D board.
