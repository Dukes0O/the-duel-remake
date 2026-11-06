# TOWN-APPRENTICES

## Changed

- Added pure town apprentice APIs to start and update a teaching session from a recorded machine demo, save learned rate and accuracy, gate delegation by learned job kind, improve skill through use, and allow a skilled apprentice to teach another person.
- Added stepped delegated work through the existing work-order path. Each returned progress step carries the accuracy for the ground edit.
- Exported the APIs from the town module entry point. Town apprenticeship records and the Book entry are stored on the town object.
- Settled the missing live-demo callback as recorded on the card under "Codex decided (Claude to review)."

## Checks

- `node tools/test-town-apprentices.mjs`: passed, 16 checks.
- `npm.cmd run build`: passed. Vite reported existing dynamic-import and large-chunk warnings.
- Lane tier: not run, as requested; Claude runs it.
- Browser/look checks: not run, as requested. Claude should open the game with `wasteland-town` still in its development state, confirm the existing town screen and controls are unchanged, and verify no new apprentice UI appears without a connected machine-demo caller. The module-level teaching, delegation and accuracy paths are covered by the card test.
- Changed assertions: none in existing tests. New floating-point checks use a small tolerance for measured accuracy.
- Race fingerprints: not applicable; race simulation and replay files were not changed.

## Removed

- No existing files or behavior were removed.
