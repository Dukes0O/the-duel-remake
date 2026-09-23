---
task: FND-10
status: review
kind: save
flag: none
player_facing: no
---

FND-10 remains incomplete. The modeled career now fits under 4 MB of
localStorage, but active player and record data can still grow past that
limit. No player, record, or ghost cap was added.

## Storage design

Seven synthetic historical save fixtures cover a single profile, player
list, drivers, courses, race settings, weapons, and current plus archived
records and ghosts. They load from memory-only storage without loss.

At startup, before `App` can load or normalize a career, the game reads the
raw localStorage records and ghosts. If old-layout records or ghosts are
present, it writes and verifies an FND-11 recovery backup. It then writes
the archives to IndexedDB and reads them back. A small localStorage pointer
is written before the old arrays are trimmed. If a later write fails, the
old localStorage values and archive view are restored. On an interrupted
move, the pointer lets the next startup recheck and finish the move. A
missing or damaged pointed-to archive blocks startup and leaves local data
and any prior backup untouched for recovery.

Current players, current leaderboard records, active ghosts, and settings
remain in localStorage. The loaders combine them with the IndexedDB
archives for the game. Saving current records keeps the archive in
IndexedDB. Complete career export uses format v2 and includes both stores;
v1 export refuses an archive pointer. Import checks both stores, writes
and verifies the new IndexedDB archive before replacing localStorage, and
keeps a verified recovery copy of the previous career. Invalid or duplicate
archive rows fail before import changes the career.

## Evidence

- `node tools/test-save-fixtures.mjs`: seven historical shapes and 246
  first-load and round-trip checks pass. The v1 fixture proves
  `awardedWins` moves to `settledResults`. The record fixture checks full
  metadata and ghost samples.
- `node tools/test-career-archives.mjs`: current and archived rows survive
  migration, save, restart, complete export, import, and recovery. It covers
  a pointer-first interrupted move, malformed archive rows, blocked
  IndexedDB, and localStorage quota rollback.
- `node tools/test-storage-budget.mjs`: an eight-player model with 60 history
  rows, 128 bests and 128 keys in each settled collection per player, 192
  current and 96 archived leaderboard rows, 200 legacy shared bests, four
  archived ghosts, current preferences, and the full 1,250,000-byte active
  ghost reservation uses **3.45 MB / 4.00 MB** of localStorage after the
  archive move. MB is decimal: 4 MB is 4,000,000 bytes, about 3.81 MiB.
  The model counts all localStorage keys and values as UTF-16 bytes;
  IndexedDB backups and archives are outside this localStorage budget.
- `node tools/browser-harness.mjs scenario career-archive`: private Chrome
  profile and memory-only localStorage passed. The browser retained one
  current and one archived leaderboard row and ghost, and the UI downloaded
  a v2 file with every archived ghost sample. No browser errors.
- `node tools/browser-harness.mjs scenario career-archive-missing`: a missing
  pointed-to archive leaves the raw save untouched, stops startup, gives
  recovery guidance, and refuses a partial export.
- `npm run test:lane`: 153 suites passed, none failed. `npm run build`
  completed.

## Remaining hard-bound risk

The same test proves that 64 fully populated active players alone use
**5.52 MB** of localStorage. Player count, personal bests, settled keys,
and leaderboard rows have no production limit. Browser quota varies and
IndexedDB may be blocked. A literal hard 4 MB maximum cannot be claimed
until active growth has a lossless storage path. Moving live players and
records would require an async save API and careful load and recovery work;
silently trimming careers would violate the spec. This change is safe to
review as a partial FND-10 step, but FND-10 stays open.
