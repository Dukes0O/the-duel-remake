# QA-EVERBURN-SCREENS

From the full check of 6 November 2026 (`docs/changes/FIX-EVERBURN-CARD.md`). `tools/scenarios/everburn.mjs` fails two facts. The yard's scablands gate buttons (BACK GATE, DRIVE THE SCABLANDS, markup at the end of `src/story/ember-ui.js`) never reach the yard, and the app has no `storyResultLine` for `emberResultLine`. Connect them to the game, or if a later change replaced them, remove the unused markup and move the facts to what replaced it, with Claude's written review. Do this before `story-everburn` is switched on. Rule 4: 30 minutes, then a note.
