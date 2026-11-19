# LAB-REVIEW-WORKSHOP

Rust, Fire, Strength and Fuel brought up to Kyle's rules of 19 November 2026 (`docs/LAB.md` 13.2, on top of 13.1). Only
the four lessons' files (`src/lab/lessons/<id>-classroom.js` and `<id>-board.js`), their tests and their own browser
scenarios changed. `src/lab/classroom/*` is untouched: the page frame (the step on top, "Words so far", steps leaving the
page, the R button) belongs to LAB-PAGE.

## Rust

### Audit checked against the code

Every fault in the audit was confirmed in the code. Two points were only part of the story:

- The audit said `rust-paint` is in `WORDS` and never taught. True, but a player's notebook may already hold it and the
  test pins it, so it stays.
- The audit counted Question 3 as testing something untaught (the fresh water soak). True. The soak is story in
  `lab.brian.restore.start`, so that line is unchanged; the question now asks what the lesson taught (how a week in fresh
  water compares with a week in the sea).

### Changed

- Rust grows over all of the nail that is under water, from the water line to the tip, and thickens as the share grows.
  The head above the water stays clean. One function (`nail`) draws every nail, so the jars, the answer cards, the
  questions and the recap all follow. The close-up now thins the steel slab as the rust layer grows above it.
- Hedges removed everywhere: "in this game", "a simplification", "real nails rust far more slowly", "these rates belong to
  this game", the graph's hover text. The rate note is the one sentence Kyle gave. "About" is gone from the answers.
- "The sum" became "multiply the rate by the days". Every key label ("Press ↑ or ↓", "press Space", "Press →", "Press 1, 2
  or 3") left Brian's words, prompts and hints.
- "Three days" names its question first: "A bare nail sits in salt water for 3 days. What percentage of it rusts? Turn the
  day dial to 3 and multiply the rate by the days." The prompt and hints say which way to turn the dial without key names.
- The zinc coat step says the zinc wears away first and the bare steel rusts after it. The coat's wear note now states the
  5% a day plainly for fresh and salt water.
- Steps shortened: Orange from the sea (the percentage is defined in the opening), Rust, Salt water (one sentence for the
  slow battery), Zinc coat, Brian's job. The job's things now fit their jars ("stays under sea water in the harbour all
  week", "stands in a puddle of rain water all week") and the cost of a coat, which the lesson never counted, is gone.
- The watch runs (the wonder, the three word steps, Four jars, Three days) take about 10 seconds for the 7 days
  (`WATCH_S`), and R plays them again on every one, including Three days and the coat's test. The coat's test (25 days),
  the free test and Brian's job keep their pace.
- Question 3 rewritten as above; the soak picture was removed from the board and the card pictures.

### Tests

- `node --test tools/test-lab-classroom-rust.mjs`: 20 of 20. `node tools/test-lab-brian-short.mjs`: 6 of 6.
- `node tools/run-browser-scenarios.mjs --scenarios lab-classroom-rust --jobs 2`: passed, 0 warnings, 0 errors.

### Changed assertions (one reason each)

1. Answer cards read `6%`, `36%`, `84%` instead of `About ...`: the answers are exact.
2. Wrong day: "turn the dial down to 3 days" replaces "press ↓ until the dial reads 3": no key labels.
3. The hint and the note: "Turn the dial up/down to 3 days" and "The dial reads 3 days, so go to the question": same reason.
4. The job's first failure ends "It needs a zinc coat." instead of "Press → to give it a zinc coat": no key labels.
5. Question 3's two wrong answers say the new numbers; the walk-through answers card 2, the new right answer.
6. The calendar run in "the sums follow the calendar" is watched for 3.1 s instead of 2.1 s: the run is slower now, and
   at 2.1 s the day was 1, which reads "1 day".
7. The scenario waits 6 s into the watch for its midway picture, says "turn the dial down to 3 days", "It needs a zinc
   coat", and answers the new Question 3 with card 2.

### Added tests

Kyle's wording rules over every text the lesson shows (no hedging, no "the sum", no "about", no key labels), the opening
of "Three days", the length of the watch runs and R, and the nail's rust staying under the water line and thickening.

### Lines to re-record

None for Rust. No recorded line changed: the watch step's opening and the recap's say still match `lab.brian.rust.intro`
and `lab.brian.rust.explain`.

### Removed

The soak picture kind and the sea-soak board for Question 3 (`drawPicture` 'soak', the "salt moving out" plate). The
"costs time and money" claim. Nothing else.

## Fire

### Audit checked against the code

All the hedges, key labels, hidden spread conclusion, short pacing and the unrelated formula beside Question 3 were as
the audit said. Where the audit was partly wrong or left alone:

- The audit's words list says cell, strength, spread, front, rake, char and degrees Celsius are defined but not saved.
  That is true, and they stay in the steps that define them. They are not notebook words in the old lesson, and adding
  seven notebook entries is a change to what players save, so none were added.
- The thermometer falling over the fade of the flame is a drawing, not a measured curve, as the audit said. The text
  never claims a curve, so nothing changed.

### Changed

- Hedges removed: the bucket, strip, spread, water and job notes, both "fact about real wood" notes, "In this game 150
  litres coat one cell", and the closing words of "Three ways out" and the free test ("A large fire in real life ..."),
  which contradicted the key idea that removing one side puts the fire out.
- "How a forest fire spreads" defines cell and strength in its opening before the first spread, names what to watch for,
  and its result now reads "A fire left alone reaches the road, so we must remove a side of the triangle somewhere in its
  path" in the first three sentences, with the speed behind "Tell me more".
- "fire = fuel and heat and oxygen" became "fire needs fuel, heat and oxygen". "The sums beside the picture" became "the
  panel beside the picture".
- Tasks that did not say what they were for now do: Fuel ("see whether it burns by itself"), Oxygen ("watch what the flame
  does"), the Fire triangle ("and the fire has all three again"), the raked strip (its question is in the opening, before
  the rake), the retardant step (the task is in the opening) and Brian's job ("choose a burning cell and drop one bucket
  on it", no filler).
- Every "Press 1", "Press Space" and "with ← → ↑ ↓" left Brian's words, prompts and hints. Question 3 no longer shows the
  challenge's 420 s ÷ 70 s beside a question about where to drop first.
- Watch runs: the wonder holds the burning pit for 5.5 s before the lid, about 9.5 s in all. The water and sand buckets
  play slowly (about 9 s). The strip and the retardant run 6 spreads 1.5 s apart (about 9.5 s). R plays each of these, and
  the wonder and the watch, again. The retardant opening dropped "a litre of water weighs one kilogram", which no later
  step used; the litre is still defined.

### Tests

- `node --test tools/test-lab-classroom-fire.mjs`: 20 of 20. `node tools/test-lab-brian-short.mjs`: 6 of 6.
- `node tools/run-browser-scenarios.mjs --scenarios lab-classroom-fire --jobs 2`: passed, 0 warnings, 0 errors.

### Changed assertions (one reason each)

1. The free test no longer says "Press Enter when you have tested enough settings": no key labels.
2. After Watch again the prompt is checked for "Press Enter to continue", not "R to watch again": the R button is the label.
3. The spread step's result is checked in two parts: the conclusion first, the speed behind "Tell me more".
4. Question 3's panel no longer shows "Spreads during the challenge": it had nothing to do with the question.
5. The scenario checks "A fire left alone reaches the road" where it checked "0.29 metres per second": the speed moved behind
   "Tell me more".

### Added tests

The wording rules over everything the lesson says, including each wrong try, the free test and the job; the length of the
wonder, the buckets, the strip and the retardant runs; and Watch again on each.

### Lines to re-record

None. `lab.brian.fire.intro` and `lab.brian.fire.explain` match the unchanged opening of "Three ways out" and the recap.

### Removed

The "large fire in real life" caveat, the "game's rule" and "fact about real wood" notes, the kilogram clause in the
retardant step. Nothing else.

## Strength

### Audit checked against the code

Confirmed as written: the maths words, "thickness counts twice", the step's own word defined behind "Tell me more",
"Too thin" forcing a key press, the repeated key labels, "Stiff" contradicting itself, and Density missing from the
notebook. Partly wrong:

- The audit says the dip numbers "come only after" in "Stiff". They do not: each bar's row already shows "dips X mm"
  live while the weights hang. What was true is that the carbon fibre bar dips 0.3 mm, under one pixel, so it cannot be
  seen to move. The run is now long enough to read the live numbers, and R plays it again.
- The audit says Brian's two rules never give a reason a learner can test. The reason ("a bump on the cable") was in
  the text; it is kept, behind "Tell me more", because it is not needed to do the task.
- The "millimetre is one thousandth of a metre" sentence stays behind "Tell me more" in the wonder: the unit is
  defined before the learner needs it to answer, and nothing in the step is lost.

### Changed

- "The sum" became "calculation", "worked line" or "panel". "Thickness counts twice" and "counts three times" became
  "squared" and "cubed", each defined where first used ("thickness multiplied by itself"; "thickness × thickness ×
  thickness, so doubling the thickness makes a bar eight times as stiff").
- "Strength" opens with the words it teaches: stress, newton and N/mm², the strength of a material, and the task, in
  three sentences. Load, bending for good and the gauge follow behind "Tell me more".
- "Too thin" opens on the carbon fibre arm already on the rig and asks its question first: "Will the arm hold, bend for
  good, or snap?" There is no forced key press and no "Go on" button. The car now comes onto the arm over 6 seconds
  and R plays it again. The step has no control for Show me to point at, so Show me does not apply to it.
- "Stiff" says the carbon fibre bar is the stiffer part although steel is the stiffer material, and its dip runs 7
  seconds with the live numbers. The brittle ram takes 6 seconds, the watch about 10, and R plays "Stiff", "Brittle"
  and "Too thin" again. "Thick enough" cut the safety line's reason to behind "Tell me more".
- Density is now a notebook word (`strength-density`), so it appears under "Words so far". The player's old six words
  keep their ids.
- Every "Press 1", "Press ↑", "Press Space", "press R" left Brian's words, prompts and hints. "Which bar bends for good
  first?" became "Which bar gives way first?" (carbon fibre snaps, it does not bend for good). Question 3's cards read
  "Steel, 80 mm, 18.8 kg" and its question is one sentence shorter.

### Tests

- `node --test tools/test-lab-classroom-strength.mjs`: 27 of 27. `node tools/test-lab-brian-short.mjs`: 6 of 6.
- `node tools/run-browser-scenarios.mjs --scenarios lab-classroom-strength --jobs 2`: passed, 0 warnings, 0 errors.

### Changed assertions (one reason each)

1. The notebook list gains `strength-density` first: the Density step defines a word.
2. The dips are read after 2 s, not 1 s: the weights now take 1.5 s to come on.
3. "Too thin" is checked on its opening question, the carbon fibre arm and the guess, not on "press 3 first": the key press is gone.
4. Show me is checked on every step that has a control; "Too thin" has none, and its hints are checked climbing with no pointer.
5. "Make the arm thicker, then hang the car again" and "Make the arm thicker until the handle reads 80 mm, then hang the
   car" replace the arrow and Space instructions; the same for the thinner direction: no key labels.
6. Question 1's wrong answer for carbon fibre says "gave way first, by bending for good": the question changed.
7. The prompts "The load on the bar is 0 kg. Hang 10 kg." and "Pick the card with your answer." replace their key labels.
8. The scenario picks the carbon fibre arm by a click in the free test, since "Too thin" no longer has a rack to click;
   it waits further into each long run for its pictures and expects `strength-density` in the notebook.

### Added tests

Kyle's wording rules over everything the lesson says; the step's own word defined in its opening; the length of the
watch, the dip, the ram and "Too thin", with R; Density as a notebook word; "Too thin" with nothing to press first and a
replay that is not a new attempt at the bench.

### Lines to re-record

None. `lab.brian.strength.intro` and `lab.brian.strength.explain` match the unchanged opening of the watch and the recap.

### Removed

The "press 3 first" note, the "Go on" button and the key press that forced carbon fibre in "Too thin"; the phrase "counts
twice" and "counts three times".

## Fuel

### Audit checked against the code

Confirmed as written: the hedges (including the force note, the 110% note and "timed at real speed"), the closing
electric car caveat that erased the rule, "the sum" for multiplications and divisions, words defined and not saved, the
repeated key labels, the 0.07 s gap that cannot be seen at real pace. Where the audit was partly wrong or left alone:

- The audit says Brian's job fails the player "for a difference the lesson says cannot be seen". The free test's line is
  about the stopwatch, and the job's rule is about the petrol carried (the lesson's point and the bench's goal), so the
  rule is unchanged. Only the words changed: the message now says "more petrol than this race needs" instead of "extra
  mass that the car carried for nothing", so the two lines no longer seem to contradict each other.
- The title "Fuel and weight" is set in `src/lab/classroom/classroom-lessons.js`, which this card must not touch, so it
  is unchanged. The scale's button and the step "Pouring by mass" keep "weigh", the ordinary word for using a scale.

### Changed

- Hedges removed: the force note, the 110% note, the job's opening ("In this game"), and "timed at real speed". The
  force is stated plainly ("The engine pushes this car with the same force, 10,617 N, whatever the tank holds").
- The last words of the lesson are the rule. The electric car sentences left the recap, and the free test's second
  paragraph now says every car in it burns petrol.
- "The sum" became "the panel", "the mass of the petrol in the panel" or "calculation"; "total mass = car with an empty
  tank + petrol" is the only sum left. Every "Press ↑", "Press 1", "Press Space" and "with ↓" left Brian's words, prompts
  and hints.
- Tasks that did not say what they were for now do: the speed step races the car in its opening, "Pouring by mass" says
  it shows how to work out the litres from the mass alone, the watch opens with what the learner will see, and the job
  opens with the task ("Pour the least petrol that lasts each race, and then race").
- Words saved to the notebook: Mass, Density, Speed, Acceleration and Force, each by the step that defines it. The
  player's old three words keep their ids.
- The wonder and the watch play their races at 0.4 of real speed (about 10 seconds; the board says "shown in slow
  motion"), so the 0.07 s gap is a visible gap. R plays them again. A failed race in Brian's job can be watched again
  with R. The races the player sets up keep real speed.
- Question 3's first card is shorter ("Faster at first, but the petrol runs out past half way"). The bench's force and
  stopwatch numbers are kept in a small cache, because the board asks for them on every frame.

### Tests

- `node --test tools/test-lab-classroom-fuel.mjs`: 27 of 27. `node tools/test-lab-brian-short.mjs`: 6 of 6.
- `node tools/run-browser-scenarios.mjs --scenarios lab-classroom-fuel --jobs 2`: passed, 0 warnings, 0 errors.

### Changed assertions (one reason each)

1. The notebook holds eight words, not three: five steps define words that were never saved.
2. The recap no longer holds the electric car sentences, and the test checks that it holds none: the lesson's last words keep the rule.
3. "Weigh each jug and compare the readings", "Now weigh the litre of water" and "Now weigh the water": no key labels.
4. "pour out 15 more litres and race again", "pour in 15 litres and race again": no key labels.
5. "Each pour in adds 3.7 kg" and "Each pour out removes 3.7 kg" replace "Each press of ↑ pours in 3.7 kg": no key labels, and still no "litres" under the cloth.
6. "Pour out until the gauge reads" and "so race", "so weigh it" replace "Press ↓ until" and "so press Space": no key labels.
7. The job's "extra mass" became "more petrol than this race needs": the wording no longer contradicts the free test.
8. The watch's result says "The same force speeds up every kilogram of the car, so with fewer kilograms the whole car accelerates faster": shorter, same claim.
9. The scenario waits 5 s into the wonder for its midway picture, and expects the five new notebook words and the new job wording.

### Added tests

Kyle's wording rules over everything the lesson says; the length of the wonder and the watch with R, the real pace of the
races the player sets up and R on a failed job race; the five notebook words.

### Lines to re-record (1)

- `lab.brian.fuel.explain` (`src/lab/lab-lines.js`, `tools/audio/catalog.json`): the recap no longer says "All of this
  belongs to petrol cars. An electric car carries batteries instead, and a battery has the same mass whether it is full
  or empty, so an electric car has no Fuel load to set." The line is not changed and not re-recorded here: the catalog
  must match the recording, and until it is re-recorded Brian's voice still says the caveat the screen no longer shows.

### Removed

The electric car caveat on the screen, the "In this game" and "real car" notes, "timed at real speed", and the keys in
every prompt and hint.

## Checks run once on all four lessons together

- `node tools/run-tests.mjs --tier lane --changed --since 00382d70b --jobs 4`: 38 of 38 suites passed, 0 failed
  (three suites left to the night). The laptop was busy with other sessions' work, so the run took 19 minutes.
- `npm run build`: passed.
- Browser scenarios, `--jobs 2`: `lab-classroom-rust`, `lab-classroom-fire`, `lab-classroom-strength` and
  `lab-classroom-fuel` passed with 0 warnings and 0 errors. The scenarios that open these lessons from other places,
  `lab-restore`, `lab-navigation` and `lab-classroom`, passed. `lab-walk` timed out once while the laptop was busy ("turning-arm
  approach", the Turning Arm and not one of these four lessons) and passed when rerun alone.
- Lab suites for the shared frame and the lesson titles (`test-lab-classroom`, `test-lab-classroom-page`,
  `test-lab-classroom-headings`, `test-lab-title-words`, `test-lab-radio`, `test-lab-brian-short`) pass.
- The other twelve `lab-classroom-*` scenarios open other lessons and none of the four lessons' files, so they were not run.
- Race fingerprints do not apply: no race code changed.

## Left open

- `lab.brian.fuel.explain` needs re-recording (see Fuel).
- The page frame's "Words so far" fold, steps leaving the page once done, and the Watch again button belong to LAB-PAGE.
  Each lesson here now offers R (`actions: ['replay']`) on its long runs, so the button appears wherever the frame shows it.

## After merging LAB-PAGE (integration/wasteland, `a9366a4b2`)

The merge into the lane had no conflicts: the four lesson scenarios kept both LAB-PAGE's `openFormulaPanel` and the new
wording and checks. No assertion was loosened.

- Rust's job: "The boat trailer" became "The mooring chain" (it lies in the sea water of the harbour all week); the garden
  gate is unchanged. One line each for what named the trailer: `rust-classroom.js` (the job, its results and a comment);
  `test-lab-classroom-rust.mjs` (the job's name and the first, second, final and second-visit texts) and
  `tools/scenarios/lab-classroom-rust.mjs` (comments and check labels) follow the new name because the thing in the job changed. The numbers are
  the same (84% bare, 0% with zinc).
- Four lesson suites (rust 20, fire 20, strength 27, fuel 27), `test-lab-classroom-page` 9 and `test-lab-brian-short` 6: all pass.
- All `tools/scenarios/lab-classroom*.mjs`, `--jobs 2`: 16 of 16 passed, 0 warnings, 0 errors.
- Lane tier (`--tier lane --changed --jobs 4`): 38 of 38 passed. `npm run build`: passed. `lab-walk`, run alone: passed.
- The three Rust pictures in `.evidence/rust/` were taken again on the new page, with the formula panel closed.
