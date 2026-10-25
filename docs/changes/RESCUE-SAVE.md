# RESCUE-SAVE: the mission fields for rescues, counts and the rescue badge

Card: RESCUE-SAVE (Claude, SAVE lane, holds `save-shape`). Design:
`docs/HELI_RESCUE.md` section 10. Switch: `rescue` (dev). Nothing new is
visible or playable; no engine, screen or menu changes.

## What changed

- **`src/heli/heli-save.js`**: the `profile.heli.missions` record may now
  hold the H4 fields below. Every one is optional and appears only when the
  saved record already has it, so a save from before this card reads back
  byte for byte as it was written and is not rewritten until a rescue field
  changes. `createMissions()` and `createHeli()` are unchanged, and
  `MISSION_KINDS` and `BADGES` keep their values (the mission engine reads
  them to decide what it offers, so storing a rescue field offers nothing).
  New exports: `RESCUE_KINDS`, `RESCUE_STAGES`, `RESCUE_BADGES`,
  `RESCUE_COUNTS`, `WRECK_DAYS`.
- **`src/feature-flags.js`**: new development switch `rescue`.
- **`tools/fixtures/saves/12-heli-rescue.json`**: three players: one with a
  rescue in hand, a waiting call, a wreck job, the counts and both badges;
  one with an H2 mission record and no H4 field; one plain H1 helicopter.
- **`tools/test-heli-save.mjs`**: six new cases (fixture round trip and
  byte match, optional fields, normalisation, wrong types, storing through
  `setMissions`, wreck ageing).

## Save fields (all inside `profile.heli.missions`; version stays 1)

| Field | Default (when absent) | Normalisation |
|---|---|---|
| `last` | `null` | now also `hiker`, `avalanche`, `hoist`, `supply`; any other kind reads as `null` |
| `call` | `null` | kind may now be a rescue kind; new optional `flights` (whole number, 0 to 1,000,000), kept only when the stored call has a whole number there, otherwise absent |
| `rescue` | absent | `null` or `{kind, id, courseId, seed, clockSeconds, stage, crates, condition}`. Unknown kind (a fire is not a rescue), stage, course or a bad id: the whole record reads as `null`. `seed` 0 to 4,294,967,295 else 0. `clockSeconds` 0 to 1,000,000, one decimal. `stage` is `fly`, `found`, `hold` or `carry`. `crates` is always three entries, each 0 (at the pad), 1 (on the line) or 2 (delivered); a missing, short or bad entry is 0, a number is clamped; a long list is cut to three. `condition` is 0 unhurt, 1 hurt, 2 badly hurt; a whole number outside the range is clamped, anything else is 0. `bumps` is not a field and is dropped (Kyle, 15 October). |
| `hoists`, `searches`, `supplies`, `rescued` | absent | whole numbers, 0 to 1,000,000 (H1's limit); a non-whole value is dropped |
| `badges` | `[]` | now `firefighter` and `rescue`; duplicates and unknown badges dropped |
| `wreck` | absent | `null` or `{courseId, carId, x, z, day}`. Known course and car, `day` a whole number 0 to 1,000,000, `x` and `z` real numbers within 100,000 m (one decimal). Anything else reads as `null`. |

Wrong-type values never throw and never touch other progress: a bad
`rescue` or `wreck` becomes `null`, a bad count is left out.

`notePlayDay` also removes a wreck (sets `wreck` to `null`) when a new play
day is noted and the wreck is more than 3 play days old (`WRECK_DAYS`); a
wreck on day 5 is still there on day 8 and goes on day 9. A save with no
`missions`, or a record with no `wreck`, gains nothing.

## Existing save checks

- Every older fixture round-trips unchanged (`test-save-fixtures.mjs`
  checks all 14, including the new one).
- Roster counts rise from 13 to 14 in the three suites that count fixture
  files, as FIRE-SAVE did: `tools/test-save-fixtures.mjs` line 10,
  `tools/test-arena-settlement.mjs` line 129, `tools/test-career-backup.mjs`
  line 40. Counts only; no assertion was weakened.
- Switch inventories gain one row for `rescue`: `tools/test-feature-flags.mjs`
  (switch count 28 to 29 on line 23, `rescue` added to the development list on
  line 24, description on line 28) and `tools/test-wasteland-beta.mjs` (one
  row in the exact switch table at line 39).

## Changed assertions

None weakened. Only the counts and the switch rows above grow by one, each
for the one new fixture or switch.

## Checks

Light suites (all pass): `test-heli-save` (35 groups), `test-save-fixtures`
(14 shapes, 495 checks), `test-feature-flags`, `test-wasteland-beta`,
`test-arena-settlement`, `test-career-backup`, `test-course-closures`,
`test-medals`, `test-deep-save`, `test-release-tremblant`,
`test-grand-prix-podiums`, `test-heli-missions`, `test-heli-fire-session`,
`test-repo-hygiene`.

## Removed

Nothing replaced; no old code, test or document is removed. The packet's
`bumps` for a rescue in hand is not stored (RESCUE-HURT's pay-by-condition
reads `condition`).

## Preview launcher row (Claude)

`start-preview.bat` now requests the new `rescue` dev switch, as
`tools/test-preview-launcher.mjs` requires for every dev switch (it failed the
first lane run). The switch adds nothing visible yet, so the preview is
unchanged in play.
