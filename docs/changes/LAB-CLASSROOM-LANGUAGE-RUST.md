# LAB-CLASSROOM-LANGUAGE: Rust

The Rust lesson rewritten to Kyle's standard (`docs/board/cards/LAB-CLASSROOM-LANGUAGE.md`). The rules, challenge, rewards, save
and notebook ids are unchanged, and every number still comes from the rust bench (`jarAfter`) and the challenge's own 10% line.

## What changed

- Every sentence is rewritten as a teacher would say it, in whole sentences. The Sirena is a car, named each time, and "she" and
  "her" are gone from the code and the screen.
- "% rust" is defined before the first number appears: a percentage is a number of parts out of every 100, so 50% rust is half of
  the nail. Rate, oxygen, steel, electrons and corrode are each defined where they first appear.
- Why rust needs water and oxygen, why salt water is faster (rusting works like a very slow battery, and salt helps the water carry
  electric charge) and why zinc protects steel (zinc gives up its electrons more easily, so the zinc corrodes instead of the iron)
  are all explained in simple language.
- The lesson says plainly that the straight-line rate is a simplification: real rust is less regular, real nails rust far more
  slowly, and the game's rates are fast so that a week shows a clear result. The formula panel says "in this game" beside each rule.
- The physics panel shows rust = rate × days, how much faster salt water is, coat left = 100% − 5% a day × days, rust under the coat
  = rate × (days − 20), and the test for clean. The worked line changes on each press of the day dial, the protection switch and the
  jar buttons, and follows the calendar while it runs. A sum above 100% says that it stops at 100%.
- The three word steps gain the day dial and stay open after the first run; their closing words name the days of the run they describe.
- New step "Test your own settings": the jar, the days (up to 30, past the coat's last day) and the protection. Only different
  settings count, three open Continue, and the table keeps the results. It comes last in part 3, after the coat's own test, so that it
  does not give away how long the coat lasts.
- The pictures now show the mechanism: a graph of rust day by day with a dashed line for what the sum predicts; a close-up of oxygen
  coming down through water to steel; two tanks with few and many charged particles; arrows for electrons going from the zinc into
  the steel; each jar's daily rate. Each jar's reading uses the calendar's whole day, so it agrees with the sum.
- The questions and their answers read as sentences together, and no answer is shown in the panel or on the board before the pick.
  On the 3-day question the player works out the sum, which reads "= ?" until the run.
- The challenge card is reworded. The challenge itself is still the Lab's parts panel, which this change does not touch.
- The scenario runs at 1920 by 1000.

## Removed

- All of the old wording, including the fragment labels such as "About 6%: like fresh water" and "Job done".
- The unused `low: 'calendar'` value, and the plain table that stood under the word steps, which the close-ups replace.
- The jobs' fragments ("Dunked in the sea at every launch."), replaced by the sentence and the clause each needs.

## Changed assertions (for Claude's review, rule 18)

- `tools/test-lab-classroom-rust.mjs`: every assertion on wording moves to the new sentence and keeps its numbers (0, 14, 84, 36, 60, 24,
  65, 50, 12, 2, 10, 6, 20, 25, 8 and 100). The card labels for the 3-day question become "About 6%", "About 36%" and "About 84%",
  with the same three values. No check of behaviour is loosened or removed.
- `setDays` in the suite may press up to 40 times instead of 10, because the free test's dial reaches 30. The 7-day dial is unchanged.
- Added: the sums follow the dial, the switch and the jar at once and come out on a calculator for every jar, protection and day from 1
  to 30, and they agree with the bench; the word steps stay open and their closing words stay true; the free test, including
  that the same setting does not count twice; Show me on the free test; the mouse on the jar buttons; the panel gives no answer away
  on questions 1 and 2.
- `tools/scenarios/lab-classroom-rust.mjs`: wording moves with the lesson. It adds checks that the sums follow the controls, a walk through
  the free test, and that each question is fully visible.

## Proposed voice lines

Nothing is recorded in this lane. For Claude to record at the merge, in `src/lab/lab-lines.js`:

- `lab.brian.rust.intro`: "Four steel nails will now sit in jars for a week. One is in dry air, one is in fresh water, one is in salt water, and one has a zinc coat and is in salt water."
- `lab.brian.rust.explain`: "Iron rusts when water and oxygen both reach it, and salt water makes the rust form six times as fast, because salt helps the water carry electric charge. A zinc coat corrodes first and protects the steel under it."
- `lab.brian.rust.pass`: "You have chosen the right protection for each part. That is how you keep metal from rusting away."

## Review

One independent review. Real faults, all fixed with a test where one fits:

- The panel gave away how long the coat lasts on Zinc coat, Watch and the coat's question, and showed the dial's old days beside a question
  about a week. Those steps now show only that the rust stays at 0% while the coat lasts, and the question's own 7 days.
- The worked sum and the graph gave the answer to the 3-day question, so the sum reads "= ?" and the graph stays empty until the run. The
  job's verdict on clean now waits for its run, because the verdict is the choice the job asks for.
- A hint said to press ↓ from a dial reading 1 or 2. It is now right from every setting.
- Show me on the free test reran the same setting for ever. It now tries a setting not yet tested and says which, and a test finishes the
  step with Show me alone.
- The 3-day intro carried the dial's number, so a revisit changed it on each press. The number is now only in the prompt and the panel.
- Colons that skipped a verb in the panel and on the board are now sentences or plain labels.

Also checked against the first batch's list: a line said during a run or while a question is open no longer stands as the step's result on
the page, Continue waits for the run to end on a step done again, rust and steel are defined in the first step that names them, charged
particles are explained before the picture names them, and "clean" is not used in its special sense before Brian's job.

## Checks

- `node tools/test-lab-classroom-rust.mjs`: 17 of 17.
- Source check with the patterns of `tools/test-lab-classroom-page.mjs`: no she, her, mph, decides or "air takes" in either lesson file, and
  every step after the first shows formulas. Claude adds `rust` to that suite's list at the merge.
- Browser walkthrough `lab-classroom-rust` at 1920 by 1000: passes, 36 pictures, no warnings or errors. The pictures were read over three
  runs. The first found graph labels on top of each other, words too dark to read, the jar buttons touching the Space label, bits of
  zinc drifting outside the water and a prompt with a colon before a sentence; all are fixed. The third read the screens the review changed.
- The lane tier and build are left for the merge, as the brief says. No frame check: the classroom is a 2D board.
