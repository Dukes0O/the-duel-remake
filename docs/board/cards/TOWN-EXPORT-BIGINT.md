# TOWN-EXPORT-BIGINT

Found by the TOWN-HAUL-JOB cloud session on 19 November 2026 and reproduced there: `exportTown` in `src/town/town-store.js`
throws "Do not know how to serialize a BigInt" for every town, so the town screen's BACK UP cannot write a file. A town holds
BigInt fields (the town's own records keep them; the QA hook in `src/town/town-entry.js` already turns them into strings to read
a stored record).

## What done looks like

- BACK UP writes a file for any town, and the matching restore reads it back to a town that is equal to the one saved,
  BigInt fields included (they come back as BigInt, not as strings).
- A test exports and restores a town with BigInt fields and compares the two field by field, and a test reads a backup file
  written before this card if one can exist; say in the change note whether any could.
- No change to how towns are stored in the browser's own database; only the backup file's encoding.

## Checks

The new test, the town store's own suites, and every suite in `tools/` that names `exportTown` or the restore.

Saves are touched: one independent review of the export and restore path.
