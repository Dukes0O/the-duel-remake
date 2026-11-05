# LAB-CLASSROOM-LANGUAGE-WAX

The Ski wax lesson rewritten to Kyle's standard (card: `docs/board/cards/LAB-CLASSROOM-LANGUAGE.md`). The game's rules, the
challenge, the rewards, the save and the notebook ids are unchanged. Every time and friction number is the ski rules' own.

## What changed

- Every sentence is rewritten as a teacher would say it, and objects are named. Snow no longer "wants" a wax, and the fragments
  and the colons that skipped a verb are gone. Question 2 was a sentence to fill in; it is now a whole question with three
  whole answers. Question 3 now asks where you can read today's snow, so its answers answer it.
- Units are defined where they first appear: metres, seconds and degrees Celsius in the opening, then m/s, km/h with the
  reason for 3.6, and m/s² in Glide.
- New step "Friction": what friction is and what the friction number means. A tin moves the two arrows on the slope, three
  bars (the pull, the slowing, and what is left) and the sums.
- New steps "Why cold snow needs a hard wax" and "Why wet snow needs a soft wax": a close-up of the base on the snow.
  Sharp points press into a soft wax and catch, and stay on the surface of a hard wax. On wet snow, one sheet of water holds
  the ski by suction under a hard wax, and the water gathers into beads under a soft wax.
- New step "Test your own settings": any snow with any wax, with the sums moving on each press, a close-up, and a table of
  results. Three different settings open Continue, and Show me tries a different setting each time.
- Glide now shows a mark for each second, an arrow that grows with the speed, and the speed in both units.
- The physics panel follows the rule on the wax bench: pull = g × sin(slope), slowing = friction × g × cos(slope),
  acceleration = pull − slowing, and time = √(2 × distance ÷ acceleration). The sums come out on a calculator from the numbers
  they show, and they round to the stopwatch's time. While a choice or a question is open, the panel shows only the general rule.
- The board no longer gives answers away while a question is open. Question 3 used to show the ski menu, and Question 1 used to
  show a hard wax lane. A tin's hover now gives only its name.
- The thermometer has one neutral fill, because its old colours matched the tins and answered every open pick. Glide defines the degree of an angle, and the Friction panel defines sin and cos.
- The word steps stay open after their answer. Brian's job now shows the day's temperature and crystals.

## Removed

- All of the old wording in this lesson, the `why` helper it no longer needs, and the tin hover that named each wax's use.
- The ski menu on the board while Question 3 is open, and the two labelled lanes while Question 1 is open.
- The made-up bar lengths on the recap's second card, which now show how far each ski had travelled when the first ski finished.

## Changed assertions (for Claude's review)

- `tools/test-lab-classroom-wax.mjs`: every assertion on wording moves to the new sentence and keeps its numbers (8.9 s, 9.1 s,
  9.4 s, -5 °C, 0 °C, the bands and the menu lines). The times 8.88, 9.05 and 9.43, and every band and challenge check, are
  unchanged. The key idea title moves from "Hard wax for cold, soft wax for warm." to a whole sentence, and the scenario's check
  moves with it. No check of behaviour is loosened or removed.
- `playThroughTo` walks the new steps, and the help test adds them.
- Added: the calculator check of every worked line, the sums following each control, the free test, Show me on the free test, the
  panel and board giving nothing away, closing words staying true, words defined before use, and hints holding from every setting.
- `tools/scenarios/lab-classroom-wax.mjs`: wording moves as above, it now runs at 1920 by 1000, and it plays the new steps.

## Proposed voice lines

Each new text replaces the line's whole entry in `src/lab/lab-lines.js`. For `lab.brian.wax.explain`, it replaces both `text` and `spokenText`.

- `lab.brian.wax.intro`: "This test puts skis on three kinds of snow with three waxes, and we will time every glide."
- `lab.brian.wax.explain`: "Very cold, dry snow has hard, sharp crystals that press into a soft wax, so very cold snow needs a hard wax. Cool snow lies in the middle, so cool snow needs a medium wax. Warm, wet snow holds a ski by suction through a sheet of water, so wet snow needs a softer wax, which breaks the water into beads. Less friction leaves more acceleration, so the ski reaches the finish sooner."
- `lab.brian.wax.pass`: "You chose the right wax for the snow, and that made your ski faster at no cost."

## Checks

- `node tools/test-lab-classroom-wax.mjs`: 23 of 23.
- The source check for "she", "her", "mph", "decides" and "air takes" is part of that suite and passes.
- Browser walkthrough `lab-classroom-wax`: passes at 1920 by 1000, with 40 pictures and no errors.
- Look: the word steps, the free test, the questions and the recap were read from the walkthrough's pictures at 1920 by 1000.
- The lane tier and the build run at the merge, as the brief asks.

## A game rule worth knowing

The game knows only a right and a wrong wax, so soft wax and medium wax both have 0.06 on dry powder, and a wrong wax is slower than no wax. The lesson says "in this game" wherever that matters.
