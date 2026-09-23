---
task: FND-11
status: merged
kind: save-safety
flag: career-backup
player_facing: yes
---

# FND-11 — Career backup

## What changed

- The Players panel offers **Export career** and **Import career** under the `career-backup` development switch. The export is a versioned JSON file of the raw career and settings values in localStorage. It includes every current `the-duel-` and `duel_` key, including legacy profiles, records, and full ghost samples. Import checks the envelope and known save shapes before changing storage.
- Import saves and verifies a full pre-import copy in IndexedDB. It then replaces the game's localStorage keys, verifies the written values, and restores the original values if a write fails. Unrelated origin keys remain untouched. A failed backup blocks import.
- The browser entry checks for the existing legacy player and race-settings migration **before** constructing `App`. If migration is needed, it saves and verifies a raw IndexedDB copy first. A failed backup blocks startup before the migration can write. The error screen offers a raw export.
- The backup module exposes `backupBeforeMigration` for future schema changes and `restoreCareerBackup` for recovery tooling. New migrations must await that gate before writing.

## Checks

- `node tools/test-career-backup.mjs`: seven FND-10 historical save shapes round-trip byte for byte, including archived record metadata, full ghost samples, and an unknown future namespaced key. It checks migration ordering, invalid core profile values, reordered file keys, failed backup verification, quota rollback, recovery, and unrelated origin keys.
- `node tools/browser-harness.mjs scenario career-backup`: private QA port and disposable Chrome profile with memory-only localStorage. The production Players UI shows both controls, downloads an export, rejects malformed import, imports a valid file, and leaves a verified pre-import copy in real IndexedDB. Two screenshots and the report are in `.qa-dist/browser-output/`.
- `node tools/browser-harness.mjs scenario career-backup-failure`: a synthetic legacy save and blocked IndexedDB stop startup before any player migration write. The screen gives a next step and its export button produces the untouched legacy data. Screenshot inspected for readable layout and contrast.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going`: 152 passed, 0 failed.
- `npm run build` passes.
- Review commit `4ec2815` rejects leaderboard and ghost rows that the real
  loaders would discard. Invalid car and ghost sample-time fixtures fail
  before import writes. Integration commits `89fb708` and `4ec2815` passed
  all 145 merge-gate suites in 209.99 seconds, the production build, private
  High/Performance browser smoke, and both career browser scenarios. Browser
  checks reported zero warnings and zero errors.

## Storage and release notes

- The `career-backup` switch remains `dev`. QA can open the controls with `?flags=career-backup`; Release Manager controls promotion.
- IndexedDB backups are stored separately from localStorage, without a retention cap. This avoids silently deleting recovery copies. Browser quota or storage eviction can still prevent a new backup. In that case migration/import stops before changing the current save.
- The import and export file can grow with unbounded player, record, and ghost archives. This does not solve FND-10's unmet 4 MB decimal localStorage budget. A later lossless archive move to IndexedDB can reuse this backup gate, but requires its own migration and rollback design.
- Export covers current localStorage career data. There is no gallery data in this build; when gallery storage is added to IndexedDB, its export needs a new archive version.
