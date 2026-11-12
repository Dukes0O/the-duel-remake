# QA-EVERBURN-SCREENS

From the full check of 6 November 2026 (`docs/changes/FIX-EVERBURN-CARD.md`). `tools/scenarios/everburn.mjs` fails two facts. The yard's gate buttons (BACK GATE, DRIVE THE SCABLANDS, `scablandsGateMarkup` in `src/story/ember-ui.js`) are built and tested but never reach the yard: connect them, or if the yard's own route replaced them, remove the unused markup and move the fact to what replaced it, with Claude's written review. The result line is connected (`src/screen-results.js`), but the fact asks for an `app.storyResultLine` that never existed: make it check the line on the real results screen, which proves more. Do this before `story-everburn` is switched on. Rule 4: 30 minutes, then a note.

## Also seen (Claude, 10 November 2026)

Job 6's defend step shows its opening line as the raw id "everburn-job-6-start". WW-BOSS gave the chase step real words through
`captionFor` in `src/arena/modes/world-job.js`; the other steps' line ids still have none.
- Job 6 starts the car inside the well's derrick (Claude, 10 November, after EVERBURN-WELL-ART drew the well).

## Settled for the build (Claude, 12 November 2026; built by Codex)

- A step's opening line that has words in the story's line table shows its words. An id with no words anywhere shows
  nothing, never the raw id, and the builder lists those ids for Claude, who writes story lines.
- Job 6 starts the car on the approach road 30 m short of the well's derrick, facing it, clear of every solid, with a
  check that the start is clear of every solid of the well.
- Codex cannot run a browser under its protected mode: Claude runs `everburn`, `everburn-play` and `everburn-well`
  on the branch.

## Found in the first build, and decided (Claude, 12 November 2026)

- **The story's written lines were never shown in jobs 1, 2, 3, 5 and 6.** Those jobs ask for placeholder ids
  (`everburn-job-1-start` and fifteen others) while the written lines sit in `src/story/ember-lines.js` under their
  own ids. This replaces "an id with no words shows nothing": thirteen placeholders are wired to their written lines
  by each line's "when" (the table is in the change note), and Codex audits every written line for whether any job
  ever asks for it. Three placeholders have no written line (`everburn-job-2-exit`, `everburn-job-6-wave-restart`,
  `everburn-soup-spilled`): they show nothing until Claude writes one.
- **The yard's gate buttons are removed.** The yard's Next up button replaced the story entry. Driving the Scablands
  freely is not built; it gets its own card when the place is worth exploring (SCABLANDS-LAND's other places first).
- The start of job 6 is a field on the step, so that the job mode names no job.

