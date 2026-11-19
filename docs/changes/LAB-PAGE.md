---
task: LAB-PAGE
status: review
kind: feature
flag: lab-classroom
player_facing: yes
---

# LAB-PAGE: the formula panel starts closed, and Brian's page keeps only the words (19 November 2026)

Card `docs/board/cards/LAB-PAGE.md`; rules in `docs/LAB.md` 13.2. Built in lane `lab-formula-closed`, on top of the earlier
work of 9 November (the panel starts closed, the sixteen Lab scenarios taught to open it) and a merge of `integration/wasteland`.

## What changes for the player, in every classroom lesson

- The formula panel starts closed. F or "Show the physics" opens it, and the choice lasts for that lesson only (it used to
  last until the game was reloaded and started open on a wide screen).
- The step being worked on is at the top of Brian's page, in full, and the page shows from its top.
- Below Brian's newest words sits one fold, "Words so far (n)", closed until it is clicked. It holds the steps that defined a
  word, each as its heading and first sentence; a click on a word opens it in full.
- Steps that only gave an instruction, ran a test or asked a question (and their answers) leave the page once done. The recap
  and its key ideas are untouched.
- Backspace (Previous step) still works and shows that step in full at the top, with the words before it in the fold.
- Watch again (R): every watch or run step that animates already offered it, except Suspension, where the button did nothing.
  Suspension's Wonder and Watch steps now start over (the rig back on its first setting, the readings cleared). A step that
  cannot restart shows no button. Pacing stays with each lesson's card.

## Files

- `src/lab/classroom/classroom-ui.js`: formula choice and fold state kept per lesson; the page is the step now, Brian's words and
  the fold (`paintPage`, `showNewest`).
- `src/lab/classroom/classroom-frame.js`: `definesWord(step)` and a `word` mark on each page row. A step defines a word when it has
  `word` or `words`, or is named `word-...`.
- `src/lab/classroom/classroom.css`: the fold's look; the step rows use the class `lc-steps`.
- `src/lab/lessons/suspension-classroom.js`: Watch again for Wonder and Watch (the one lesson file touched, because the card
  names its dead button).
- `tools/scenarios/lab-classroom*.mjs` (all sixteen): open the panel with F where a lesson first needs it (`openFormulaPanel`
  in `lab-classroom.mjs`); the pendulum scenario also checks the page, the fold, Previous step and Watch again.
- `tools/test-lab-classroom-page.mjs`: three new tests (below).

## Tests

- `node --test tools/test-lab-brian-short.mjs tools/test-lab-classroom-page.mjs`: 15 of 15 (three new: the word mark in all
  sixteen lessons; the page rows and Previous step; every Watch again button changes what the lesson shows).
- Lab browser scenarios, all sixteen `lab-classroom*`, `--jobs 2`: 16 of 16 passed, 0 warnings, 0 errors.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`): 44 of 44 passed. Three suites picked by name only
  ("Left to the night": test-arena-shove, test-convoy-tanker-art, test-first-person-polish) are not related to this change.
- `npm run build`: passes.
- Not done: no frame check (not needed: no scene or race code changed), no hand play by Kyle or Claude.

## Changed assertions (each with one reason)

- `lab-classroom-fire.mjs`: earlier words were "Why did the lid work?,Fuel,Heat,Oxygen" on the page; now the step now is
  "Oxygen" and the closed fold holds "Fuel,Heat". Reason: the opening question is not a word and leaves the page.
- `lab-classroom-gforce.mjs`: "at least 12 rows kept" is now one row at the top and four words in the closed fold. Reason: only
  word steps stay.
- `lab-classroom-lift.mjs`: "The collective lever" and "Newton's third law" are looked for in the fold, not the page rows.
  Reason: words moved to the fold.
- `lab-classroom-suspension.mjs`: "at least 12 rows kept" is now exactly five words in the fold. Reason: only word steps stay.
- Merge of integration: in `lab-classroom-braking.mjs`, `-lift.mjs`, `-wax.mjs` integration's newer wording and coordinates
  were kept and the call that opens the panel added. No assertion loosened.

## Removed

- The module-level formula choice in `classroom-ui.js` (it lasted until reload) and the old rule that opened the panel by
  default at 1500 px wide.
- The old page that kept every step: the rows for instruction, test and question steps no longer reach the screen
  (the session still records them, for Previous step).
