# TOWN-STORE

## Changed

- Added an IndexedDB town store with one current record per town and rolling copies: the three latest saves and one save per real week for up to eight weeks.
- Added town mayors and a local career pointer. Town writes finish before the pointer changes. The town record and its rolling copy use one IndexedDB transaction.
- Added complete career export, import and restore support for town records. Import replaces same-id town history so old copies cannot override the imported town.
- Added town file backup and restore helpers. Restore validates the file before saving it. Browsers with File System Access can write to a chosen file; other browsers download a JSON file.
- Damaged newest copies fall back to the next good copy with a plain message. Town writes do not change scrap or other career fields.

## Checks

- `node tools/test-town-store.mjs`: passed. Covers byte-preserved careers without towns, failed and atomic writes, damaged-copy fallback, complete career export/import over an existing town, and a Year 30 save under 5 MB.
- `npm run build`: passed. Vite reported its existing dynamic-import and large-chunk warnings.
- Lane tier: not run by instruction; Claude runs it.
- Browser and look checks: Claude should check a complete career export/import with a town, a corrupt newest town copy fallback message, and file backup/restore. No race fingerprint or world signature applies.
- Independent save review: review found recovery edge cases. Imported towns now replace stale rolling copies, town plus rolling copy save atomically, and career restore rolls back both stores on failure. A new town pointer is reserved before its database write and rolled back if that write fails. Saves, imports and restores share one lock, using the browser lock where available, to protect concurrent pointers. Final review confirmed these faults are resolved and found no remaining concrete save-safety issue.
- Changed assertions: none. Added card-specific assertions only.

## Removed

Nothing. No existing save path or test was removed.
