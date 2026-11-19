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
