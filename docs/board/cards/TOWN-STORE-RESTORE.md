# TOWN-STORE-RESTORE

Left by TOWN-EXPORT-BIGINT (19 November 2026). The town backup file now round-trips exactly (version 2, BigInt fields tagged
as `serializeTown` does). Its independent review found three older gaps in `importTown` (`src/town/town-store.js`) that matter
only once a player can restore a file, which no screen offers yet:

- it does not check `town.version` or run `migrateTownData`, so an older town restored into a newer game is not migrated;
- it bypasses `saveTown`'s career pointer and save lock;
- a one-key object `{"$townBigInt":"9"}` comes back as `9n` (shared with `serializeTown` and the career file; no town field has
  that shape).

## What done looks like

Before any screen offers RESTORE: `importTown` migrates, goes through the same save path and lock as `saveTown`, and a test
restores a version 1 town and an older-version town into a fresh store and checks the career pointer. Saves are touched:
one independent review.
