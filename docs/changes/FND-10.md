---
task: FND-10
status: review
kind: save
flag: none
player_facing: yes
---

FND-10 now keeps the game-controlled localStorage origin below **4,000,000
UTF-16 bytes**, counting every physical key and value. Player count, records,
history, and archives are not capped or trimmed to meet this limit. The
complete career lives in IndexedDB; localStorage holds a small pointer and a
bounded write-ahead journal. A synchronous save is accepted only after its
journal edit is durable. IndexedDB then receives and verifies the full
snapshot. If that flush fails, the journal replays on restart. If the journal
cannot fit, the write throws before changing the in-memory save and the game
shows a persistent save-failure banner.

## Migration and recovery

The seven historical synthetic fixtures cover the single profile, player
list, drivers, courses, race settings, weapons, and records plus ghosts.
Migration first verifies an FND-11 IndexedDB backup. New migrations move
current and old-layout rows directly into one complete IndexedDB snapshot,
avoiding another localStorage write when the old origin is near quota. If an
earlier FND-10 archive move already ran, the origin migration reads its
pointer and folds those archived rows into the same snapshot. It verifies
that snapshot, writes the pointer, then removes the physical game keys. A crash before the
pointer leaves the original local career to retry; a crash after the pointer
is completed from the verified snapshot. Missing or invalid pointed-to data
blocks startup and leaves recovery data in place.
The startup gate checks again after installing the virtual store, so an
imported older profile also gets a verified backup before App normalizes it.

Current and archived rows load through the synchronous Storage facade, so
the game's save and load calls keep their existing API. Complete export
includes both stores and retains the prior v1/v2 career file formats. Import
validates the file, writes a verified pre-import recovery copy, then switches
the primary snapshot with a local marker. On a failed or interrupted switch,
the prior snapshot is restored or selected on restart. Unrelated origin keys
remain physical and count toward the budget.

## Evidence

- `node tools/test-save-fixtures.mjs`: seven historical shapes and 246
  first-load and round-trip checks, including v1 `awardedWins` migration and
  full record metadata plus ghost samples.
- `node tools/test-career-archives.mjs`: old-layout rows survive the first
  archive migration, interrupted moves, and failure rollback.
- `node tools/test-career-budget.mjs`: 64 fully populated players occupy
  **5,515,688** raw UTF-16 bytes and **230** physical bytes after the origin
  move, including an unrelated key. A synchronous maximum-size future ghost
  journal peaks at **2,500,604 / 4,000,000** bytes. The test covers restart
  after failed IndexedDB flush, import rollback after failed and corrupted
  IndexedDB writes, direct and interrupted archive migration, v2 archive
  export/import, unknown future and legacy game-key round trips through v1
  and v2 files, and unrelated-key and oversized-write limits.
- `node tools/test-storage-budget.mjs`: the earlier eight-player archive
  model uses 3.45 MB after the archive-only move. Its 64-player active-only
  boundary is 5.52 MB before the origin move, **132** physical bytes after,
  and **2,500,506** with the maximum future ghost journal write.
- Private Chrome scenarios `career-archive`, `career-backup`,
  `career-archive-missing`, `career-backup-failure`, and
  `career-origin-missing` pass with disposable
  tab-only saves. The archive scenario verifies that the UI's v2 export
  retains every historical ghost sample. The blocked paths leave legacy
  data intact and refuse incomplete export.
- `npm run build` passed. The exact-state `npm run test:lane` gate passed
  **154/154 suites, zero failures**, in 469.43 seconds.

## Limits

The 4 MB measure is decimal and applies to physical localStorage, not
IndexedDB. Browsers can impose a lower quota; a failed physical write is
reported before the game treats that write as saved. A full journal or
unavailable IndexedDB may stop new saves, but never triggers a silent cap or
deletion. IndexedDB usage remains unbounded and depends on available device
storage. A single new value too large for the bounded journal fails
visibly; migration and validated import can still store it in IndexedDB.
The physical budget covers writes routed through the game's facade;
another script with a saved reference to native localStorage could write
outside it. Existing careers can temporarily exceed 4 MB before their
verified migration finishes.
