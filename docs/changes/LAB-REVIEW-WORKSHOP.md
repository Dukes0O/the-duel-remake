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
