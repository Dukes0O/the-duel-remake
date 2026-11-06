# TOWN-STORE

## Changed

- Added an IndexedDB town store with one current record per town and rolling copies: the three latest saves and one save per real week for up to eight weeks.
- Added town mayors and a local career pointer. Town writes finish before the pointer changes. The town record and its rolling copy use one IndexedDB transaction.
- Added complete career export, import and restore support for town records. Import replaces same-id town history so old copies cannot override the imported town.
- Added town file backup and restore helpers. Restore validates the file before saving it. Browsers with File System Access can write to a chosen file; other browsers download a JSON file.
- Damaged newest copies fall back to the next good copy with a plain message. Town writes do not change scrap or other career fields.
- Town replacement first commits a recovery record and the replacement together. Rolling copies are removed only afterward. Career import and restore keep that recovery record until the career has changed; the next town load repairs an interrupted restore and tells the player, "An unfinished town restore was found. The previous town has been put back."
- Career backup loads town storage dynamically only when a town pointer exists. If town storage fails, it still verifies and saves the career bytes, and records: "The town could not be read. The career was backed up without it." Complete exports still fail when a town cannot be read.

## Checks

- `node tools/test-town-store.mjs`: passed. Covers crash recovery after each install boundary, byte-preserved careers without towns, failed and atomic writes, damaged-copy fallback, complete career export/import over an existing town, and a Year 30 town under 5 MB through store export and import.
- `node tools/test-town-apprentices.mjs`: passed (16 checks).
- `node tools/test-career-backup.mjs`: passed, including no static town import, no town loader call for an old career, and a town-store rejection that still produces a verified byte-exact migration backup with a plain warning.
- `node tools/test-save-fixtures.mjs`: passed (26 historical shapes, 1 forged, 1,123 checks).
- `npm.cmd run build`: passed. Vite reported its existing dynamic-import and large-chunk warnings. `npm run build` was blocked by this PowerShell's script policy before it started; the Windows npm command shim ran the same build successfully.
- Lane tier: not run by instruction; Claude runs it.
- Lane tier: not run by instruction; Claude runs it.
- Browser and look checks: Claude should check town recovery after an interrupted career restore, the recovery sentence, a complete career export/import with a town, the town-storage warning in a migration backup, corrupt newest-copy fallback, and file backup/restore. Chrome and visual checks were not run in this lane.
- Changed assertions: added only. No existing assertion or tolerance was changed. No race fingerprint or world signature applies.

## Removed

Removed the static town-store import from career backup so town code stays unloaded when the career has no town pointer. No existing save data or user-facing save path was removed.
