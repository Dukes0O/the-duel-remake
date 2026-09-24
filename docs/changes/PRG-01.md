# PRG-01 — versioned Wasteland profile and migration

## Change

- New and loaded profiles now contain the version 1 `wasteland` shape from SPEC section 3.8. Existing bought `profile.weapons.levels` move into `profile.wasteland.weapons.levels` without reducing any level. The old root weapon field is removed when the normalized profile is saved. Credits, upgrades, records, history and other established profile fields keep their existing rules.
- The Armory, purchases and race startup read the nested weapon levels. Weapon purchases still use the same prices and caps. Future version numbers are kept opaque; the browser entry first makes a verified backup, then blocks an older build from writing that future format. Direct profile saves also refuse an unsupported future version.
- The existing startup backup gate runs before App construction. It now detects both an old profile with no Wasteland object and a lingering root weapon field. An unavailable or unverified IndexedDB backup stops migration without changing stored data. No real player save was read or written during development.

## Checks

- `node --test tools/test-wasteland-profile.mjs`: 6/6. Covers defaults, legacy levels, other fields, malformed version 1 fields, unsupported future formats, backup order and failure, App race setup, Armory display and a saved purchase.
- `node tools/test-career-backup.mjs`: seven historical fixtures, import, backup, recovery and rollback passed.
- `node tools/test-save-fixtures.mjs`: seven historical shapes and 247 checks passed.
- `node tools/test-weapon-upgrades.mjs`: purchases, caps, combat levels and records passed.
- `node tools/test-career-budget.mjs`: origin budget and restart/archive checks passed.
- `node tools/test-progression.mjs`: 27/27.
- `node tools/test-progression-integration.mjs`: 141 assertions.
- `npm run build`: passed with the existing large-renderer-chunk warning.

The historical weapon fixture itself is unchanged. Its assertions now inspect the same levels under `wasteland.weapons`; the weapon purchase assertions also point to that field. The backup test's up-to-date profile fixture now includes the new schema. No reward assertion or replay fingerprint changed. Browser checks were skipped because the focused App and Armory checks cover the touched user path; integration owns the release checks.
