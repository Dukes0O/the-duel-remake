# SKIN-SAVE: the save fields for skins, dirt and the wildlife count

Card: SKIN-SAVE (Claude, SAVE lane, holds `save-shape`). Design:
`docs/HELI_WILDLIFE.md` section 10. Switches: `wildlife` and `heli-skins`
(both dev). Nothing new is visible or playable; no engine, screen or menu
changes.

## What changed

- **`src/heli/heli-save.js`**: the helicopter record may now hold `skins`,
  `dirt` and `survey`, and the mission record may hold `wildlifeCounts` and
  `cameraFlights`. Every one is optional and appears only when the saved
  record already has it, so a save from before this card reads back byte for
  byte as it was written and is not rewritten by loading. `createHeli()`,
  `createMissions()`, `MISSION_KINDS`, `BADGES` and every helper are
  unchanged. New exports: `SKIN_KINDS`, `DIRT_KINDS`, `DIRT_MAX`,
  `WILDLIFE_COUNTS`. The three new helicopter keys are added to the list of
  keys this game knows, so a stored value is checked and cleaned, never
  copied raw as a newer game's key would be.
- **`src/feature-flags.js`**: two new development switches, `wildlife` and
  `heli-skins`.
- **`tools/fixtures/saves/13-heli-skins.json`**: three players: one with two
  skins owned (one worn, one fresh), dirt of every kind, a finished count
  today and the two new mission counts; one with an H4 rescue record and no
  H3 field; one plain H1 helicopter.
- **`tools/test-heli-save.mjs`**: eight new cases (fixture round trip and
  byte match, optional fields, skins, dirt, survey and counts, wrong types,
  storing through `setMissions`, unknown keys).

## Save fields (version stays 1)

| Field | Where | Default (when absent) | Normalisation |
|---|---|---|---|
| `skins` | `profile.heli` | absent | Kept only when it is an object, then always `{owned, worn, fresh}`. `owned`: unknown skins, duplicates and non-text dropped, order kept, so the first earned stays first (`fire`, `medevac`, `rescue`, `wildlife`, `supply`, `tv`; `stock` is never owned). `worn`: `stock` unless it is an owned skin. `fresh`: owned, not the one worn, no duplicates. A missing or wrong-type list reads as empty. |
| `dirt` | `profile.heli` | absent | Kept only when it is an object, then always `{dust, mud, soot, salt}` in that order, each a whole number 0 to 100 (`DIRT_MAX`). A fraction, text, NaN or a missing kind reads as 0; a number outside the range is clamped; an unknown kind is dropped. |
| `survey` | `profile.heli` | absent | Kept only when it is an object, then `{day, done}`: `day` a whole number 0 to 1,000,000 else 0; `done` true only when it is `true`, else false. |
| `wildlifeCounts`, `cameraFlights` | `profile.heli.missions` | absent | Whole numbers 0 to 1,000,000 (H1's limit), after the older fields; a non-whole or wrong-type value is dropped, never zeroed. |

A `skins`, `dirt` or `survey` that is not an object (text, a number, a list,
null) is dropped, as `bucket` is. Nothing here throws or touches other
progress. Keys inside these records that the game does not know are dropped.

Open choices the packet left, made here for the rules card to read:

- `survey.done` is a plain yes or no, and `survey.day` is the play day number
  of that count (the same count as `playDay.count`), so the board can tell a
  count finished today from an old one.
- The four dirt levels are stored as they come, each up to 100. The packet
  says the drawn grime is their sum, at most 100; keeping that cap is the
  rules and view cards' job (SKIN-RULES), not the save's.

## Switch name

The packet writes the switch as `heliSkins`. The switch catalogue only
accepts lower case names with hyphens (`src/feature-flags.js` `validName`),
and a name like `heliSkins` would stop the game starting. The switch is
therefore `heli-skins`. The later skin cards (SKIN-RULES, SKIN-HOOKS and
the others) must use `heli-skins`.

## Existing save checks

- Every older fixture round-trips unchanged (`test-save-fixtures.mjs`
  checks all 15, including the new one).
- Roster counts rise from 14 to 15 in the three suites that count fixture
  files: `tools/test-save-fixtures.mjs` line 10, `tools/test-arena-settlement.mjs`
  line 129, `tools/test-career-backup.mjs` line 40. Counts only; no assertion
  was weakened.
- Switch inventories gain two rows: `tools/test-feature-flags.mjs` (switch
  count 29 to 31 on line 23, `wildlife` and `heli-skins` added to the
  development list on line 24, description on line 28) and
  `tools/test-wasteland-beta.mjs` (two rows in the exact switch table at
  lines 40 and 41).
- `start-preview.bat` line 11: both switches added to `PREVIEW_FLAGS`, as
  `tools/test-preview-launcher.mjs` requires for every dev switch. Nothing
  visible yet, so the preview plays as before.

## Changed assertions

None weakened. Only the counts and the switch rows above grow, each for the
one new fixture or the two new switches.

## Checks

`test-heli-save` (43 groups), `test-save-fixtures` (15 shapes, 554 checks),
`test-feature-flags` (91), `test-preview-launcher` (23). Lane tier on e337f2fb
(`--changed --jobs 4 --keep-going`): 284 passed, 0 failed, 0 not run, 2144 s.
`npm run build`: built, only the usual large-file notice.

## Removed

Nothing replaced; no old code, test or document is removed.
