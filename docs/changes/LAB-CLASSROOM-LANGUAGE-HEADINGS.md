# LAB-CLASSROOM-LANGUAGE: Headings and maps

Rewritten to the rules in `docs/board/cards/LAB-CLASSROOM-LANGUAGE.md`, with the faults from the first two review batches
checked. The game's rules, the challenge (heading 070, 550 m, a 30 m ring), the notebook ids and the rewards do not change.

## What changed

- **Whole sentences.** Every line Brian says, each prompt, hint, question, answer, recap card, notebook meaning and hover line is
  now a sentence a teacher would say. The source called Kestrel One "she" and "her" about 80 times; it is now "the helicopter"
  everywhere, in the code comments too.
- **Definitions first.** Heading defines the compass, north, the degree (a full turn is 360 equal parts), clockwise and heading,
  in that order: a heading is the direction measured clockwise from north, in degrees. Speed is defined where it is first used, in
  "Brian flies a job": 50 metres per second, written m/s, which is 180 km/h, with the reason for 3.6.
- **New step "Finding a heading from a map".** The player moves a marker one square at a time. A right-angled triangle on the map
  shows the distance north, the distance east and the straight line, and the panel shows atan(east ÷ north) and the rule of Pythagoras
  changing on each press.
- **New step "South and west of the pad".** The correction by quarter, because the lesson's own jobs need it (heading 120 and
  heading 340): add 180° south of the pad, and add 360° north and west of it.
- **New step "Test your own settings".** The player chooses any heading and a flight of 100 m to 300 m. The panel shows
  east = distance × sin(heading), north = distance × cos(heading) and time = distance ÷ speed before the flight. Earlier flights stay on
  the map, a table keeps where each one ended up, and three different settings open Continue. Show me tries a new setting each time.
- **New question 3 of 4.** A hut 300 m east and 300 m north asks for the heading, so the checks test the sum that the lesson teaches.
  Question 1 now asks "Which heading points the helicopter west?" and question 2 asks which turn is the smaller change of direction, and
  all their answers answer the question as worded.
- **The controls move the sums.** The heading, the ruler, the marker and the flight length each change the worked line on that press,
  including the turn still needed, the short way round. Word steps stay open after the answer, and their closing words are in the
  past tense so that they stay true.
- **The picture.** The compass ring shades the angle from north, clockwise round to the heading, with an arrowhead and the number of
  degrees, and the gauge says "degrees clockwise from north". The answer cards and recap compasses show the same. The triangle is drawn
  with its sides labelled in metres on the watch, the marker steps, the tries and question 3. The recap text moves up and uses the
  smaller size, so it stays inside its cards.
- **Prompts and hints follow the control.** A hint says which key to press from where the gauge or the ruler is now, and a prompt
  says only "press Space" once the control is already right.

## Removed

- All of the old wording in this lesson, every "she" and "her", and the label "That's east".
- The `SETTLE_S`, `lastAt` and `lengthOf` leftovers, and the small "phase by old result" branches that nothing reached.

## Changed assertions (for Claude's review, rule 18)

`tools/test-lab-classroom-headings.mjs`: every assertion on wording moves to the new sentence and keeps its numbers (025, 30 degrees,
120, 450 m, 100, 275 m, 080, 10 degrees, 4xx m, 6xx m, 55x m, 40 and 320 degrees, 340 degrees, 500 m and 50 m). No check of behaviour
is removed and no number is loosened. The play-through helper gains the new steps. Help's list gains the two marker steps. The check test
gains question 3, and now also asserts that an open question shows no worked sum. Added: sums follow each control and come out
on a calculator, no minus sign on a zero, the free test, Show me reaches three settings, word steps stay open, prompts and hints from every
setting, the open question on the short way round is not settled by the panel, the compass arc runs from north, and a source check.

`tools/scenarios/lab-classroom-headings.mjs`: wording moves as above, it now runs at 1920 by 1000 so that the panel is on, and it adds
the marker steps, the free test, question 3, and checks that the sums follow the controls.

## Proposed voice lines

For `src/lab/lab-lines.js`; Claude records them at the merge. No credits were spent here.

- `lab.brian.headings.intro`: "This map table has a compass and a ruler on it, and with them you can find the heading and the distance from one pad to another."
- `lab.brian.headings.explain`: "A heading is the direction in which a helicopter is pointing, measured clockwise from north, in degrees. North is heading zero, east is ninety, south is one hundred and eighty, and west is two hundred and seventy. To find a heading from a map, you measure how far the target lies to the east and to the north, and the arctangent of east divided by north gives the angle. The rule of Pythagoras gives the distance, and a map's scale says how many metres one square stands for. Dividing the distance by the speed gives the time the flight will last."
- `lab.brian.headings.pass`: "With a heading and a distance, you can find any place on a map."

## Checks

- `node tools/test-lab-classroom-headings.mjs`: 20 of 20.
- Source check for she, her, mph, decides and "air takes", the same patterns as `tools/test-lab-classroom-page.mjs`: none in either
  lesson file.
- Browser walkthrough `lab-classroom-headings`, through the shared slot: passed, 45 screenshots, on the final code. Look: the word steps,
  the free test, the questions with their cards open, the recap and the challenge card were read at 1920 by 1000. The first run found a
  ruler label under the angle label, side labels crossed by other lines, a scale label against its bar and a panel that needed scrolling
  on the watch; all four are fixed. No frame check: the classroom is a 2D board.
- Lane tier and build: left to Claude at the merge, as the brief asks.
