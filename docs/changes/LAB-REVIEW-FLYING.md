# LAB-REVIEW-FLYING

Lift, Pendulums, Air and altitude, and Headings brought up to Kyle's rules of 19 November 2026 (`docs/LAB.md` 13.2, on top
of 13.1). Only the four lessons' files (`src/lab/lessons/<id>-classroom.js` and `<id>-board.js`), their tests and their own
browser scenarios changed. `src/lab/classroom/*` is untouched. The page frame (the step on top, "Words so far", steps
leaving the page, the Watch again button) belongs to LAB-PAGE; each lesson here offers Watch again (R) on every animated
run and the model restarts that run (checked below).

## Audit checked against the code

Every fault below was checked in the code first. Where the audit was partly wrong or was left alone, it says so.

- Confirmed as written: Pendulums' free-fall maths for a weight on a string; Pendulum's try-formula step (203 words, the
  symbols after the rule); Lift's rotor word never saved; Lift's game-mode caveats and the closing hook caveat; "sum" for a
  formula in Lift, Pendulum and Headings; Headings' `^2` against Brian's `300²`; every repeated key label; the short runs
  (Lift's three loads 7.6 s and the guided runs 1.6 s, Altitude's wonder 4.5 s and watch 3.2 s a place, Headings' wrap demo
  0.33 s); the west demo turning left while the words say three quarter turns clockwise; Altitude's missing Watch again on
  the tries.
- Partly wrong: the audit says Lift's 23 kg margin for "Dusthawk and two crates" is hidden. It is not: the right and wrong
  texts already say "23 kg more than the 3,887 kg", so the loads are unchanged. The audit calls the 4.48 in Pendulum's
  formula remark a mismatch with the 4.5 s stopwatch; 4.48 rounds to 4.5, so it was not a contradiction (the remark is gone
  anyway, see Pendulums). Altitude's "two rules for thin air" is real, but the push falling to 71% while the jar holds 75%
  is physics (less air and less engine power), so one plain sentence replaces the caveat; the numbers did not change.
- Left alone: Pendulum's object is still called "the weight" (the name on the recorded lines, the board and the
  notebook). The pull of gravity is only ever called "the pull" now, so the two meanings no longer share a sentence. The
  guided tries' two-weight runs stay at about 8 s (the audit called them fine at the lower edge). Altitude's `alone`
  keeps its crates formula in the panel as the lesson that teaches the rounding. Headings' long steps (`word-sums`,
  `word-distance`, `word-quarters`) were shortened in place, not split into separate steps.

## Lift

- Rotor saved to the notebook: `word-lift` now has `words: ['lift-rotor']` beside `word: 'lift-lift'`, so a player's
  notebook gets Rotor (the ids and meanings of the other words are kept).
- Weight is one thing. The panel is "The total weight" (it was "The total mass" beside "the weight"), the weight in
  newtons is "weight in kilograms × g", and the word says plainly "A weight of 500 kg is the pull of the Earth on 500 kg of
  mass".
- Hedges and caveats removed: "this game gives a weight in kilograms", "in this game the push grows...", "every push in this
  lesson is measured close to the pad", "on this test pad", and the whole of "Real flying" and "Assisted flying" from the
  words, the questions, the key idea and the notes. They are now only on the challenge card, which also takes the
  hook's 1,500 kg limit, so Brian's job ends on its answer.
- "The engine is at full power" became "the helicopter is pushing upward as hard as it can" (the lever is not defined
  yet in the wonder).
- Tasks name their question first: "We will test whether the helicopter can lift the Dusthawk", "...with two crates added";
  Question 1 puts Kestrel One's 1,630 kg and the rotor's 3,887 kg in the question; "Start the rotor to see the lift";
  "Your job is...". "The sums" became "the physics panel". Every "Press 1", "press W", "Hold W (or ↑)" and "Press Enter"
  left Brian's words, prompts and hints.
- Steps shortened: Mass and weight, The rotor and lift, The collective lever (the Newton's third law and engine
  sentences moved behind "Tell me more" or out), Hovering.
- Three loads takes about 10 seconds (3 s between helicopters). The guided tries hold the result for 3.5 s (the heavy
  load is seen not to rise). R plays the wonder, the lever watch, the three loads and each try again (it already did).

## Pendulums

- The wrong maths is gone. The panel and the picture now show "pull on each kilogram = (kg × g) ÷ kg", worked as
  (20 × 9.81) ÷ 20 = 9.81 N per kilogram, and the note says every weight speeds up at the same rate along its path. No
  weight "speeds up at 9.81 m/s²" any more. The free test's last note says T stays the same "for every pull-back up to 30
  degrees" and stops there; the recap's rule has the same range.
- The formula step is three. "π and the square root" and "g and metres per second" are steps of their own (nothing to
  press, ids start `word-`, so they join "Words so far"), each with a worked example in the panel. "The swing time formula"
  then states the rule, names its task first ("Change the hook, then change the weight, and see which one changes the
  swing time T") and keeps the reason behind "Tell me more". The "2.2 times as 10.03 ÷ 4.48" remark is deleted.
- Tasks name their question first ("We will predict whether your weight finishes one swing before the grey weight"), the crane
  job says what to pick and which formula to use, the swing-time step says what to click, and the pendulum's release
  result answers the opening question in its first three sentences.
- "The sums" became "the formulas" or "the panel". Every key label left the words, prompts, hints, wrong-press messages
  and the board's hover notes. Letting go has a Let go button that shows Space.
- R plays the wonder, the two lengths, the guided runs, the crane run and the check swings again (checked).

## Air and altitude

- One plain account of thin air. The push falls to 71% while the jar holds 75% "because there is less air to throw down
  and the engine, which burns its fuel with the same air, loses power". The "one rule for both effects" and "pilots use
  this rule" caveats are gone. The air panel is "100 × air share = 75 dots" (no 0.0065, 288.15 or 4.256, which were never
  explained); the push-share formula says what 2.718 does. The question on fuel adds a reminder that more lever burns more
  fuel, and its wrong answer no longer cites a rule the player was not taught.
- Tasks name their question first ("We will test whether the helicopter can still lift the Dusthawk higher up the
  mountain"); "Fill the empty jar with the air at Summit Run, and compare the two jars"; "Your job is three deliveries".
  Every key label left the words, prompts and hints. The recap's "in this game" and the "measured on the pad" note are gone.
- Words steps shortened: Thin air (start the rotor, watch the arrow; the rest behind "Tell me more"), Air density
  (the particles in one sentence).
- Pacing: the wonder holds 8 s with the lever eased up over 1.5 s (it used to jump); the watch gives each place 4 s
  (12.8 s); the guided tries hold 3.5 s; Thin air and both tries offer Watch again (R), which plays the run again.

## Headings

- "The sum" became "the rule" or "the formulas"; the distance panel is `√(300² + 400²)`, matching Brian.
- Tasks name their question first: "What heading would point the helicopter at the marker?", "The rule needs a correction for
  places south or west of the pad", "We will find the heading of the smoke and fly to it", "Your job is to find the smoke".
  The squaring and Pythagoras step defines squaring first and says the rule in its opening.
- Every "press A", "Press D", "Press Space", arrow-key and Enter instruction left Brian's words, prompts, hints and
  messages ("Turn the helicopter until the gauge reads 070, then fly", "click That is east").
- Steps shortened: Heading (a degree and clockwise are defined in the opening; "Past 359 the number comes round to 000" is the
  third sentence of its result), Scale, the three marker steps, the watch (the km/h sentence and the km/h panel row
  are gone, m/s stays), the free test (sine and cosine in two sentences).
- The wrap demo turns the 20 degrees in 2 s (it took 0.33 s). The west demo turns right through 090 and 180 to 270,
  as the words say.

## Tests

- `node --test` on every `tools/test-lab-*.mjs`: all pass (see the list at the end of the checks below).
  `test-lab-classroom-lift.mjs` 28, `test-lab-classroom.mjs` (Pendulums and the shared frame tests) 70,
  `test-lab-classroom-altitude.mjs` 21, `test-lab-classroom-headings.mjs` 23, `test-lab-brian-short.mjs` 6,
  `test-lab-classroom-page.mjs` 9.
- Added tests, per lesson: Kyle's wording rules over every text the lesson shows (no hedging, no "the sum", no key labels,
  no flying-mode caveats, no free-fall maths, no unexplained constants, no km/h); the rotor in the notebook (Lift); the
  symbol steps and their order (Pendulums); Let go as a button (Pendulums); the length of the wonder, the loads, the
  watch and the guided runs, and Watch again on each (Lift, Altitude); the check demos' length and direction (Headings).

## Changed assertions (one reason each)

Lift
1. `followPrompt`, which read the key out of the prompt, became `doStep`, which acts by the step's own action: the prompts no
   longer name keys.
2. The notebook words list holds `lift-rotor` second: the rotor is saved now.
3. Panel title "The total weight" replaces "The total mass": one number, one name.
4. "Click a crate on the cable to take it off" replaces "Take a crate off by pressing 2": no key labels.
5. Hints "Raise the lever until it reaches the red line" and "Lower the lever until it comes back down to the red line"
   replace "Press W until" and "Press S until": no key labels.
6. The Assisted/Real flying test checks that the words, the key idea and the collective's meaning never mention the two
   modes and that the challenge card still does, with the hook limit: the caveat moved to the card.
7. The job's test checks the answer is the last sentence (no hook caveat) and the prompts "raise the lever up to the red
   line" and "lower the lever back down to the red line": no key labels.

Pendulums
1. `followPrompt` acts on the control Brian points at and checks the prompt names it by what it is (hook, weight, Tap, Let go).
2. The prompt-follows-the-pointer test names the control ("the 5 m hook", "the 200 kg weight") instead of a number key.
3. Wrong-press messages "Click the 15 m hook to go back", "Click the 20 kg weight to put it back": no key labels.
4. Every worked line of the pull reads "= 9.81 N per kilogram", not "9.81 m/s²": a weight on a string does not speed up
   at 9.81 m/s² (this is the fix of the audit's worst fault).
5. The formula test starts at the new symbol steps and checks the rule, the task sentence and the 5 m worked line; the "2.2
   times" assertion is replaced by a check that the remark is gone and 4.48 s is the calculator's answer.
6. The free test's note reads "for every pull-back up to 30 degrees", the end-of-range note "5 degrees is as small as the
   pull-back goes", and the result says "the formula’s 7.77 s": no caveat, no "sum".
7. The hover notes read "Click it to hang it" and "Click it to hang the weight here": no key labels.
8. The playthrough and the walk through the steps pass the two new symbol steps.

Air and altitude
1. "Bring the lever back down to the line" replaces "...with S"; the prompts and hints "Raise/Lower the lever" replace "Hold W/S".
2. The refuelling answer says "The question says there is no refuelling on the way": the old line cited a rule the lesson
   had not taught.
3. The air panel reads "100 × 0.75 = 75 dots in the jar" (and "100 × 1.00 = 100 dots"): the unexplained constants are gone.
4. The watch is run for 14 s, not 11 s: each place now gets 4 s (12.8 s in all).
5. The recap's prompt reads "Try this in the helicopter, or go back to the Lab.": no key labels.

Headings
1. "The sums", "the sum" became "the formulas" and "the rule" in the expected texts; `√(300^2 + 400^2)` became `√(300² + 400²)`.
2. The watch's panel row is "400 m ÷ 8 s = 50 m/s" (the km/h row is gone).
3. Wrong-turn messages say "Turn the helicopter back to the left", "by turning it to the left", "when you said it was east",
   "when you said it reached the hut", and the hints "Turn the helicopter to the right until": no key labels.
4. The word-step texts are checked in their new wording (a degree defined first, "the calculator button", "To square a
   number is to multiply it by itself", "square the east and north distances").
5. The wrong answer for the wrap question says "Turning to the left would reach heading 010...": the answer card lost the key.

## Lines to re-record

- `lab.brian.pendulum.explain` (`src/lab/lab-lines.js`, `tools/audio/catalog.json`): the recap's third sentence now reads
  "How far you pull the weight back, up to 30 degrees, makes no difference either, because a wider swing travels further but
  also faster." The recorded line leaves out "up to 30 degrees". Not changed and not re-recorded here.
- The catalog's text for `lab.brian.altitude.intro`, `.explain` and `.pass` is cut off after a few words, so it cannot be
  compared with the screen. The Altitude opening texts for the watch and the recap are unchanged; only the recap's second
  paragraph lost "in this game". If the recordings include that paragraph, `lab.brian.altitude.explain` needs it.
- Lift and Headings: none. The three-loads opening, the Lift recap and the Headings recap opening still match their lines
  (the Headings recap's second paragraph says "rule" where it said "sum", and the recorded line already says
  "arctangent" there).

## Removed

The Real flying and Assisted flying sentences and the hook limit from the Lift lesson's words (they are on the challenge card);
the "total mass" title; the 2.2 times remark and the pull "speeding up" formula in Pendulums; the temperature formula and its
constants in Altitude's air panel; the km/h sentence, the km/h panel row and the unused `KMH_PER_MS` export in Headings; the
`followPrompt` key-reading helper in the Lift tests.

## Checks

Run after merging the current `integration/wasteland` (`36945af65`, no conflicts, no Lab files in it).

- All 35 `tools/test-lab-*.mjs` suites pass, including `test-lab-brian-short` (6), `test-lab-classroom-page` (9), the four
  lessons' suites and the shared frame, title, radio, challenge, bench and walk suites.
- `node tools/run-browser-scenarios.mjs --scenarios <all 16 lab-classroom*> --jobs 2 --output-dir .evidence/scn`: 16 of 16
  passed. (The suite refuses an output folder outside `.evidence/`, so `.qa-dist/scn` from the brief was not usable.)
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 38 passed, 0 failed (three suites left to the night:
  `test-arena-shove`, `test-convoy-tanker-art`, `test-first-person-polish`, picked by the scenario and lesson files).
- `npm run build`: passed.
- Race fingerprints do not apply: no race code changed.
- Pictures of Pendulums, taken on the merged lane with the formula panel open: `.evidence/pendulum/pendulum-fixed-maths.jpg` (the heavy
  weight's result with "9.81 N per kilogram"), `pendulum-watch-midway.jpg` (the two lengths mid-swing) and
  `pendulum-try-formula.jpg` (the formula step).

## Left open

- `lab.brian.pendulum.explain` needs re-recording (see above); the Altitude recordings' catalog text is cut off and should be
  looked at by whoever re-records.
- Steps that only define symbols (`word-pi`, `word-gravity`) have nothing to press and are ready when opened; they are not
  notebook words.
