---
task: LAB-BRIAN-SHORT
status: done
flag: lab-classroom
player_facing: yes
---

# LAB-BRIAN-SHORT: Brian says three sentences at a time

Claude, 9 November 2026. Card `docs/board/cards/LAB-BRIAN-SHORT.md`, from the audit of 9 November (item L2). The change is to
the classroom lessons that are already live under `lab-classroom`; it adds no new switch, no save field and no game event.

## What changed

- **Three sentences at a time.** Brian's newest words are cut to an opening of at most three sentences. When a text has more, a
  "Tell me more" button (key T) sits under his words and opens the rest, drawn as paragraphs of three sentences. The rest stays
  in the page's text while hidden, so the browser checks that read Brian's words still find every word.
- **Earlier steps fold.** Every earlier step stays on the page, as Kyle asked on 4 November, drawn as its heading and first
  sentence (its other words stay in the page's text, hidden). A click on the heading opens the step in full, and a second click folds it. Opening or folding a step does not move
  the page. Only the current step is open by default.
- **The mark.** `src/lab/classroom/brian-text.js` (new) holds the rule: `MORE` ends an opening, `splitSay` gives the opening and
  the rest, and a text with no mark is cut after three sentences, so a text that a lesson builds from parts never shows more.
- **The lessons.** Fourteen of the sixteen lessons had openings of more than three sentences or more than 60 words (100 of 236
  steps). Each now has a mark, and in some steps whole sentences changed places so that the opening holds the new word's
  definition, the question and what to do. No sentence was cut or reworded: a word count of each lesson file against the commit
  before shows the same words. G-force and Grip needed no change. Some long result texts also carry a mark.
- **Sound.** "Tell me more" and a step's heading play the existing `lab.tick`.
- **The rule for authors** is in `docs/lab-lesson-authoring.md`, section "Classroom lessons: three sentences at a time".

Lesson rules, numbers, challenges, keys, notebook words and saves are unchanged.

## Checks

- New test `tools/test-lab-brian-short.mjs`, 6 of 6: every step of all sixteen lessons opens with at most three sentences and at
  most 60 words, a longer step has one mark with words behind it, and the screen's cut agrees with the mark.
- `node --test tools/test-lab-classroom*.mjs tools/test-lab-brian-short.mjs`: 319 of 319. No assertion in an existing test
  changed. Three existing tests match two sentences as one piece of text (Pendulums π before the formula, Projectile metres per
  second, Ski wax suction), and the marks were placed so that those tests pass as written.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`, from PowerShell): 42 passed, 0 failed, 0 not run, on the
  final code. Replay fingerprints unchanged (297 checks). `npm run build` passes.
- Browser checks: all 23 `lab-*` scenarios pass on the final code (`--jobs 3`). The first run failed four (Fire, Projectile,
  Lift, and `lab-view`, which plays Lift): they read earlier steps' headings and words from the page's text. The frame was
  changed, not the checks: a folded step keeps its other words in the page, hidden, and the fold arrow is drawn by the styles.
- Look: `docs/board/looks/lab-classroom/look-1.jpg` with its review note. Pendulums was played start to finish by
  the `lab-classroom` browser check at 1920 by 1000 and its pictures were read, with pictures from Fire, Braking and Strength. No frame check (rule 9: a text panel).

## Not checked

- The in-app browser pane was hidden during this work and does not animate a hidden page, so the lesson was seen through the
  browser checks' pictures and not by hand in a visible window. The M key, the button and the click on a heading were exercised
  by a temporary browser check, which was removed afterwards.
- Result texts that a lesson builds while it runs are not walked by the new test. The screen's own cut covers them.
- In a few steps the sentence that says what to press waits behind "Tell me more" because it refers to the sentence before it
  (Headings `word-heading`, Launch `word-speed`, Fire `word-retardant`, Braking `watch`). The "Your move" bar says the same thing.

## Read by hand after the merge (Claude, 9 November)

Claude played Pendulums from the first step to the recap in a visible browser at 1920 by 1000, on the test page with saves in
memory, and opened Downforce. The lesson reads as the card asks. Two faults showed and are fixed in a second commit:

- **The key is T, not M.** M switches the game's sound off. With M, a press when no more words were waiting switched the
  sound off. One line of this card's new test names the key and changed with it; nothing is loosened.
- **After "Show me" the question stays in the opening.** The frame puts "That is how it is done." before the step's words, which
  pushed the question behind "Tell me more" (Pendulums, the short string). That sentence is no longer counted as one of the
  three. The new test covers it.

The "Not checked" line about a visible window no longer applies to Pendulums. The other fifteen lessons were seen through
the browser checks' pictures; LAB-ROUND-NUMBERS looks at one board in each lesson it changes.

## Removed

Nothing was removed from the lessons. The card allows removing text that says the same thing twice; this work found none in
the steps it marked and did not search the result texts for it.
The classroom page no longer draws every earlier step in full. No file was replaced.
