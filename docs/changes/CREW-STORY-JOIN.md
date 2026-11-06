# CREW-STORY-JOIN

## Changed

- Cinder and Jax can be admitted by their existing story unlock when the driver is below their rank. Their existing rank unlocks remain unchanged.
- The Armory enables the matching pick button for an admitted story unlock.
- No save fields or save writes changed.

## Who a driver may pick

- `src/crew.js`: `crewAdmitted` determines rank and story admission. `availableCrew` filters the roster through it; `selectedCrewId` validates the saved selection through it; `selectCrew` validates a requested pick through it and keeps the existing scrap charge for unowned members in a discovered-gate career.
- `src/crew-ui.js`: `crewCard` determines whether the pick button is enabled and whether it asks the player to hire. It now presents the existing Cinder and Jax story unlocks as pickable.
- `src/app.js`: the two `selectedCrewId` call sites pass the selected member into a race or world job. They use the shared rule above and have no separate eligibility check.

## Checks

- `node tools/test-crew-story-join.mjs`: passed. The fixed-seed field is pinned to what integration gave before this change.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going` and `npm run build`: see `docs/board/run-log.md` for the merge.
- Review: Claude read the diff. `crewAdmitted` is the only rule, it is read only through `availableCrew`, `selectedCrewId` and `selectCrew`, and no computer field reads it. Nothing is written to a save that was not written before. The Codex job that wrote this stopped when the laptop ran out of memory, so Claude finished the test and committed it.
- Browser and look checks: Claude to inspect the Cinder and Jax cards in the crew panel at rank 1, with and without the story unlock. Browser checks are not available in this lane.
- Changed assertions: none.
- Race fingerprints: no simulation rule or computer crew selection changed. The focused test compares a fixed-seed computer field against integration's.

## Removed

- None.
