# LAB-REVIEW-MOTION

Projectile, Launch, Wax and G-force brought up to Kyle's rules of 19 November 2026 (`docs/LAB.md` 13.2, on top of 13.1).
Only the four lessons' files (`src/lab/lessons/<id>-classroom.js` and `<id>-board.js`), their tests and their own browser
scenarios changed. `src/lab/classroom/*` is untouched. Watch again (R) restarts every animated watch or run in the four
lessons (checked in the tests below).

## Audit checked against the code

Every fault was checked in the code first. Where the audit was partly wrong or was left alone, it says so. The audit's
animation lengths were not re-timed by hand; the new lengths below are the model's own time to "ready" at normal speed.

- Confirmed as written: G-force's "Predict a tighter turn" set a wider turn (50 m to 75 m); Launch's "the ramp divides the
  speed" (14.1 and 14.1 do not add up to 20); the right card first in Launch, Wax and G-force; "the sum" for a product, a
  division or a subtraction in all four; "In this game" in Wax and G-force; the wonder question hidden behind "Tell me more"
  in Launch; Wax's wonder opening teaching three unit lessons before the experiment; the task hidden behind the mark in
  Projectile's try-flag, word-metres, word-arc and alone; Launch's check-lower panel showing the level-ground numbers; the
  Space key that opens the guess cards, not a launch, in Launch's try-speed; G-force's cord drawn at 15 to 45 degrees whatever
  the reading, its car turning 10% faster than the dial, and Show me's ten lines in 1.4 s.
- Partly wrong or only partly worth doing:
  - Projectile's "the formula after a 30 m fall reads 29.9 m while the board says 30 m": the panel line comes out on a calculator
    from its own shown numbers (4.9 × 2.47² = 29.9), so it was left; only the words changed.
  - Projectile's "friction of the air" and "top falling speed" have no `WORDS` entry: no new notebook word was added, the
    wonder-step result now defines both in plain words.
  - Launch's "best angle with air is 44 degrees, so 'about 45' is true": 44 and 45 both land 35.6 m on the bench, so the lesson
    now says "a ramp at 45 degrees sends the skier furthest" and "of the ramps you can set" where it counts steps of 5.
  - Launch's "about 50 degrees" kicker: the ski zone's own comment says the lip takes off at about 50, and the lesson's
    launcher check uses exactly 50, so the lesson says 50 degrees.
  - Wax's "word-friction has no word id": the step id starts with `word-`, so it was already on the page under Words so far.
    What was missing was the notebook, which now saves Friction, Acceleration, Film and Suction.
  - Wax's "merge try-cool and try-wet" and "move acceleration into its own step": left alone. The two tries test two
    different snows, and a new step would add a new board scene; Glide's opening is now three short sentences and the rest
    stays behind "Tell me more".
  - Wax's wet snow at -1 degrees: the game's wet band is -1 to 0, so the band stays; Brian's third day now reads 0 degrees,
    which matches "ice begins to melt at 0 degrees".
  - Wax's check-game question (where is today's snow shown) is game navigation, but the challenge needs that skill; the
    wording was fixed (the real menu line is quoted) and the question kept.
  - G-force's "the lesson never says what stops the car (grip)": left alone, it belongs to the challenge. Five reading steps
    before the first watch: left alone, each carries a different word.
  - Projectile's `HEIGHT_WHY` and Launch's check-game words "inrun" and "kicker" stay defined inside the question, because
    no step is there to hold them in Words so far; each is now a short phrase, not a clause.

## Projectile

- "The stone's sum" is gone. The panel's rule reads "water distance < forward speed × t", titled "The air shortens the water's
  journey", and its note says to multiply the release speed by the time in the air. It shows after the watch is done, so the
  four formulas are not all on the screen during the run.
- The air does not slow the stone, said once and plainly (words, panel, board hover): "A stone's slowing number is 0". The
  "barely", "hardly" and "we leave it out" hedges are gone. Word-arc says the 20 m/s stone landed 49.4 m, twice the 24.7 m at
  10 m/s, from the panel's own numbers (before: "49" against "25", "about twice").
- Word-gravity says 4.9 m in the first second, then 14.7 m, which makes 19.6 m in all, matching the marks. It says "moving
  downward at 24 m/s" (no "about").
- Tasks and purposes: word-metres puts the word, its unit and the task ("Fly the helicopter at a speed you choose, and count
  the metres between the marks") in the opening; word-arc and the job (alone) have what was hidden before the mark in the
  opening; try-flag names the question first and what to use ("the distances you saw at 5, 10 and 20 m/s"); try-free asks
  "Which makes a stone land further: more forward speed, or more height?" and ends with the answer; the wrong try-flag
  answer for a short flag no longer attaches "between" to the stone (it gives the stone's 37 m and the water's range).
- Wrong-answer texts for the height guess say the extra 20 m adds only 1 m (before: "very little", "nearly all").
  Watch-speeds says the three splashes landed after 4.0, 4.1 and 4.2 s while a stone falls from 30 m in 2.5 s, so the air slows
  the water's fall too (before: "nearly the same moment" and "height and gravity determine that").
- Every "Press Space / Enter / R / 1, 2 or 3", "choose with arrows" in Brian's words and prompts left; the hint ladder, which
  is help for a stuck player, keeps its key names.
- Watch pace: the model's clock runs at 0.4 to 0.75 in the multi-part watches so each lasts 8 to 10 s as the model's own time to ready (gravity 8.4 s, forward
  speed 9.9 s, arc 9.3 s, water 10.3 s, speeds 10.3 s, height 8.8 s, wonder 9.3 s); the prompt says the picture and its clock
  run slowly. S still halves them. The wonder no longer wipes its picture after 2.8 s; R plays it again.

## Launch

- The wrong maths is gone. The panel's two arrows are "The ramp splits the speed into two parts"; the word-angle result says
  "the two parts are equal, 14.14 m/s each, because each is the speed multiplied by 0.707" (20 × 0.707 = 14.14), and the notes
  say how to get cos and sin on a calculator. "divides the speed evenly" left the recap too.
- The air is said once: the formula that has none is "Distance without the air", and its note says the tape always reads
  less. Word-distance says "The distance formula, which has no air in it, gives 40.9 m"; the free test says "6.3 m less than
  the 45.0 m that the distance formula gives". "Leaving out the air" and "the sum above" are gone.
- Speed goes the way the dial turns: the first panel line is "m/s = km/h ÷ 3.6" (75.6 km/h ÷ 3.6 = 21 m/s). Word-speed's
  opening has the word, both units and the task ("Turn the dial up to 72 km/h"); the "more speed stays in the air longer"
  claim with no picture left that step.
- The wonder's question stays in its opening (the "nearly the same spot" sentence was cut). The right card moves: pair 3rd,
  lower 1st, game 2nd. The check panels match their questions: question 2 shows the landing 10 m lower (time
  3.47 s, 49.1 m without the air) and question 1 shows the 50 degree ramp.
- Try-speed's button is "Make a guess" and its text says to turn the dial and make a guess (Space never launched there);
  the cards read "34 m", "30 m", "20 m" (no "About"). Its result adds that 20 m/s to 18 m/s is 10% less speed and the jump is
  17% shorter. The job says a landing within 2 m counts.
- Key labels left the words, prompts, miss messages ("then launch again") and the board ("Launch", not "Press Space to
  launch"). "About 45", "close together" and "about 50" became "45 degrees", "within 2 m of each other" and "50 degrees".
- Pace: the wonder flies at life speed (7.9 s for the two jumps) and the watch at 1.25 (16.7 s for five); single launches keep their
  quick 1.6.

## Wax

- "In this game" and "the sum" are gone everywhere. The friction note reads "The friction number is 0.045 with a wax that
  suits the snow, 0.05 with no wax and 0.06 with a wax that does not suit the snow." The watch result says every right wax took
  4.0 s and every wrong wax took 4.8 s (before: "which is why all three trays show the same two times"). Sin and cos have
  "type 10 and press sin" notes with the calculator's number.
- The wonder opens with the experiment (two skis, hard wax and soft wax, watch which finishes first); the 50 m, minus 15
  degrees and freezing sentences moved behind "Tell me more".
- Tasks name their question first: the reasons ask "Which wax suits dry powder at -15 °C?" (the answer is no longer in the
  prompt), the free test "What happens when a wax does not suit the snow?", the tries "Which wax suits cool snow at -5 °C?", the
  job "Your job is to pick the right wax on three days" and quotes the first menu line. Brian's button on the job is "Check my
  wax" (nothing skis). The right card moves: question 1 third, question 2 second, question 3 first.
- Glide's opening is three sentences (the speed numbers are in its result's opening, not behind the mark); Friction's opening is
  three short sentences; the notebook saves Friction, Acceleration (m/s²), Film and Suction. "A softer wax repels water better"
  and the grooves sentence are gone; the picture's beads are what the words say.
- R plays the free test's last race again; Show me on the crystals takes 3 s, not 1.25 s.

## G-force

- The tighter turn is tighter. The step now sets 25 m (reading 0.79 g, twice 0.39 g); it was 75 m. Its cards: 0.20, 0.39 and
  0.79 g (right on the third). Speed: 1.18 (three times), 3.54 (right) and 1.57 g.
- The rule is stated plainly. "In this game", "The game squares speed", "the sum is approximate" and "about" are gone. The panel
  shows the speed in m/s to four places so that every line comes out on a calculator and equals the meter's reading
  (two places differed from the meter at 14 of 352 settings, such as 120 km/h on 50 m: meter 2.27, line 2.26). "9 times" and
  "4 times" are explained by 3 × 3 and 2 × 2, not by dividing the two rounded readings.
- The wonder watches the cord for 10 s, then asks "Why does the cord lean, and which change would make the meter read more?";
  the answer is in the acceleration step ("the weight on the cord leans outward because it tries to keep going straight"). The
  watch takes 10.5 s (was 6): each state shows for 2 to 3.5 s.
- Word steps: speed, radius and the rule name what the player does and why in the prompt (50 km/h is the speed of the car on
  the arm); "squares" is defined; one g is defined before G-force; the notebook saves One g with G-force.
- The cord hangs at the real angle (tan of the reading, 21 degrees at 0.39 g, 74 at 3.54 g) and its label says the angle; the car
  turns at the dial's own rate; the sideways arrow scales to the meter's 3.5 g.
- Show me keeps "I will set the speed dial to 100 km/h and run the turn." while the dials move.

## Tests

- `node --test` on every `tools/test-lab-*.mjs`: see Checks. G-force has no suite of its own; its tests are in
  `tools/test-lab-classroom.mjs`. `tools/test-lab-classroom-page.mjs` pinned Projectile's wording and was updated.
- Added: Projectile (wonder holds its picture, R replays), Launch (right card moves, check panels match their questions,
  wonder at life speed, no hedge words), Wax (right card moves, no "in this game" / "sum" / "about" over every text, R on the
  free test), G-force (the wonder's length and question, right card moves, the tighter turn, no hedge words, the cord's real
  angle, Show me keeps its line, the worked line equals the meter at every setting).

## Changed assertions (one reason each)

Projectile
1. `followPrompt` no longer reads a key out of the prompt: the prompts name the thing to do, so the player presses what the
   step offers (Space must be live).
2. Word-metres, gravity, forward-speed, arc, watch-water, height and flag texts are checked in their new wording (listed in the
   diff); each is the same fact with the hedge, key label or maths word removed.
3. Waiting budgets (`until`, `run`) were raised for the slower multi-part watches (8 to 10 s); no assertion about what shows was
   weakened.
4. "The wonder loops" became "the wonder holds its picture until R" because the self-looping wipe was the fault.
5. `test-lab-classroom-page.mjs`: the wording of the metres, "Watch the marks" and "the friction of the air against the
   droplets" lines.

Launch
1. The dial's first formula is "75.6 km/h ÷ 3.6 = 21 m/s" (it went the wrong way round).
2. The free-test result says "6.3 m less than the 45.0 m that the distance formula gives" (no "leaving out the air").
3. Miss messages end "then launch again" (no "by pressing ↑", "then press Space").
4. The right check card moved (pair 3rd, game 2nd), so the picked indexes in the wrong-answer test changed.
5. The strip's empty row is "There are no launches yet." (no "Press Space to launch").
6. Cards "About 34 m" etc. became "34 m"; "press ← until the dial reads 65" became "turn the dial until it reads 65".
7. "Those are two very different jumps that land in nearly the same spot" left the wonder; the test pins the question.
8. "about the same as 20 m/s" became "is 20 m/s".

Wax
1. Notebook ids: Friction, Acceleration, Film and Suction are saved now (list of words and of step words extended).
2. Brian's third day reads "Wet snow, 0 °C" (was -1) so it agrees with "ice begins to melt at 0 °C"; the band's own -1 stays.
3. Question 1's picked index for the wrong tins moved with the cards (soft wax is the second card, medium the first);
   question 2's wrong "softer" card is the first.
4. The reasons' prompt is "Try each tin, and find the wax that suits this snow." (it said "Press 1 to change to hard wax").
5. "A softer wax repels water better" became "With soft wax the water gathers into separate beads".
6. "Cool snow needs medium wax, so press 2 and then Space." became "Cool snow needs medium wax."
7. The sin and cos notes, the Glide wording, the crystals prompt and the glide result are checked in their new wording.

G-force
1. The wonder test asks for the new question after 10 s (it was 2.5 s) and the watch test uses the new timeline
   (changes at 2, 5.5 and 7 s).
2. The worked line is "(13.8889 m/s)² ÷ 50 m ÷ 9.81 m/s² = 0.39 g" with no "about", and equals the meter's reading.
3. The tighter-turn tests set 25 m (radius down) and expect 0.79 g and "half of 50 m ... twice as large".
4. The right answers moved, so wrong picks are card 1 for the two predictions and `check-rule` picks card 0.
5. Prompts name "run the turn", not "press Space".

## Lines to re-record

Not edited here (`src/lab/lab-lines.js` and `tools/audio/catalog.json` are untouched).

- `lab.brian.launch.explain`: says "about forty five degrees" and "divides the speed evenly". The recap now says "a ramp at 45
  degrees", and that the distance is the forward speed multiplied by the time in the air.
- `lab.brian.gforce.explain`: says "The cars in this game are allowed between two and a half and three and a half g." The
  recap no longer carries that sentence or "in this game".
- Projectile and Wax: none. The Projectile recap and the Wax recap text are unchanged.

## Removed

Projectile's self-restarting wonder and "the stone's sum" title; Launch's "divides the speed" wording, the "leaving out the air"
phrases and the level-ground panel on question 2; Wax's `FRICTION_NOTE` "In this game" opening, the grooves sentence and the
"press 2 and then Space" advice; G-force's "In this game", "the sum is approximate" and the cord's pixel lean (`8 + min(48, g × 17)`)
and the car's 1.1 factor; the `followPrompt` key-reading helper in the Projectile tests.

## Checks

Run on the lane after merging the current `integration/wasteland` (`f2b399b3d`, no conflicts). Not run: frame timing and
the full tier (no race, physics or save code changed).

- All 33 `tools/test-lab-*.mjs` suites pass, including `test-lab-brian-short` (6), `test-lab-classroom-page` (9),
  `test-lab-classroom-projectile` (21), `test-lab-classroom-launch` (18), `test-lab-classroom-wax` (25) and
  `test-lab-classroom` (80, which holds G-force's tests and the shared frame tests).
- `node tools/run-browser-scenarios.mjs --scenarios <all 16 lab-classroom*> --jobs 2 --output-dir .evidence/scn`: 15 of 16
  passed on the first run. `lab-classroom-launch` waited for the dial's number in the job prompt, which the new prompt
  ("Mark 3: land the skier on the flag at 30 m...") no longer repeats; the scenario now waits 0.4 s instead (and Launch's
  guess prompt shows the live dial again). Run alone after that: passed, 33 screenshots, 0 warnings, 0 errors.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 40 passed, 0 failed (left to the night:
  `test-arena-shove`, `test-convoy-tanker-art`, `test-first-person-polish`, picked by the G-force files).
- `npm run build`: passed.
- Race fingerprints do not apply: no race code changed.
- Pictures (taken on the merged lane with the formula panel open), in `.evidence/motion/`: `gforce-tighter-turn.jpg` (the
  corrected step: 25 m, cards 0.20, 0.39 and 0.79 g, the cord at 21 degrees), `launch-wonder.jpg` (the wonder's question in
  its opening, Watch again offered) and `gforce-watch-midway.jpg` (the multi-part watch at 100 km/h, the cord at 58 degrees).

## Left open

- The lesson's pace in the multi-part watches is the model's clock, so the clock on the board runs slowly with the picture.
  Brian says so in the prompt. A watch at life speed with a replay (play twice) is the other way if Kyle prefers it.
- Launch's "inrun" and "kicker" and Projectile's "friction of the air" are defined in the text but are not notebook words.
- Wax's Glide step still holds five definitions (slope degrees, m/s, km/h, acceleration, m/s²) behind "Tell me more".
