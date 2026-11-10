# QA-EVERBURN-SCREENS

From the full check of 6 November 2026 (`docs/changes/FIX-EVERBURN-CARD.md`). `tools/scenarios/everburn.mjs` fails two facts. The yard's gate buttons (BACK GATE, DRIVE THE SCABLANDS, `scablandsGateMarkup` in `src/story/ember-ui.js`) are built and tested but never reach the yard: connect them, or if the yard's own route replaced them, remove the unused markup and move the fact to what replaced it, with Claude's written review. The result line is connected (`src/screen-results.js`), but the fact asks for an `app.storyResultLine` that never existed: make it check the line on the real results screen, which proves more. Do this before `story-everburn` is switched on. Rule 4: 30 minutes, then a note.

## Also seen (Claude, 10 November 2026)

Job 6's defend step shows its opening line as the raw id "everburn-job-6-start". WW-BOSS gave the chase step real words through
`captionFor` in `src/arena/modes/world-job.js`; the other steps' line ids still have none.
- Job 6 starts the car inside the well's derrick (Claude, 10 November, after EVERBURN-WELL-ART drew the well).
