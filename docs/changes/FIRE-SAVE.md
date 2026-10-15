# FIRE-SAVE: H2 save fields, course closures, buyback and bucket repair

Card: FIRE-SAVE (Claude, SAVE lane, holds `save-shape`). Design:
`docs/HELI_FIRE.md` sections 7, 8 and 12.

Needs: HELI-FINISH code merged at 64198f94 (the main design session ruled
the pending H1 release, which waits on Kyle, is not a build dependency).

## What changed

- **First commit, the rollback rule.** `normalizeHeli` keeps keys it does
  not know, as a copy, so going back one release loses no H2 field. A
  stored `__proto__` key is skipped, and a known field that fails its
  checks (say `missions: 'garbage'`) is dropped, never copied. The `forest-fire` switch must not turn
  on until a release that already carries this commit is live (FIRE-FINISH).
- **New optional fields in `profile.heli`** (version stays 1): `missions`,
  `fire`, `burnt`, `scars`, `bucket`, each normalized only when present, so
  an H1 save keeps exactly its shape and `createHeli()` is unchanged.
  Counts use H1's limits; unknown courses, mission kinds and badges are
  dropped; percentages and seconds keep one decimal; at most 4 scars (the
  oldest goes); a burn or scar whose day is broken is dropped, not moved to
  day 0, so a loaded save reads the same as the stored one; damp steps 1 to 2; a fire holds at most 80 burning and burnt
  cells, a cell both burning and burnt counts as burnt, and a damp cell that
  is lit loses its damp.
- **Helpers in `src/heli/heli-save.js`**, each refusing with the switch off
  ("Forest fires are not available yet."): `setMissions`, `setFire`,
  `putOutFire` (in one new profile: 1,500 credits capped at the save's cap,
  the burnt cells kept as a scar dated today, the fire cleared, the fire
  counted and the firefighter badge with the first; the fire's id must
  match, so it never pays twice), `loseFire` (the course burns today and the
  fire leaves the save), `burnCourse` and `addScar` (never dated after
  today), `buyBack` (the whole price or nothing; "You need 450 more
  credits."), `damageBucket` (only worse), `repairBucket` (100, 250 or 600
  credits, takes what the player has and forgives the rest, like every H1
  repair). Readers `missionsOf`, `fireOf`, `bucketDamageOf`, `createMissions`
  and `heliHash` (32-bit FNV-1a, parts kept apart, pinned in the test so
  saved missions never shift).
- **`notePlayDay`** also forgets burns at 60 play days and scars at 40 when
  a new play day is noted; a save without those fields is untouched. This
  runs with the helicopter switch even while `forest-fire` is off: only
  entries that would show nothing are removed, so the save keeps every
  burn and scar that still means something.
- **Packet text:** section 12's `last` field drops the old `'smoke'` kind
  (Kyle: no smoke check).
- **`src/course-closures.js`** (new, outside `src/heli/`, imports nothing
  from it): `courseClosed`, `buybackPrice`, `burnStage` (closed, black,
  shoots, fireweed; a course bought back looks black until day 10),
  `burnSmoke` (days 0 to 2), `scarLooks`, `closureCard` (the menu's lines,
  days left, price, credits short, the race refusal text, and "Reopened
  after the fire." on the reopening day), `playDayOf`. Today is the
  helicopter's play day count. With the switch off nothing is closed or
  drawn burnt, whatever the save says.
- **Switch** `'forest-fire': 'dev'` in `src/feature-flags.js`. The packet
  calls it `forestFire`, but switch names must be lower case with hyphens;
  later cards use `forest-fire`, effective only with `helicopter` on (the
  hooks check both).
- **Fixture** `tools/fixtures/saves/11-heli-fire.json`, written in
  `createHeli()` order: a waiting call, a fire burning at Tremblant Woods, a
  course burnt on play day 4 (Panorama Ridge, so a burning fire and a closed
  course can sit in one save; the save checks shape, not which courses can
  burn), one scar, a dented bucket, and a second player with no H2 fields.

## Tests

- `node tools/test-heli-save.mjs`: 29 groups passed (13 new: unknown keys
  surviving, optional fields, normalizing, wrong-type fields dropped,
  fixture 11 round trip, records and the switch off, fire out once with its
  scar and badge, fire lost, bucket damage and repair, scars and burns,
  closures through the save helpers, the hash, no helper changes its input).
- `node tools/test-course-closures.mjs` (new): 9 groups passed (closed days
  0 to 9, buyback 10,000 to 1,000 then nothing, stages by day and after a
  buyback, smoke days, scars, the menu card, switch off, per player from
  fixture 11, damaged fields). It reads no `src/heli/` file.
- `node tools/test-heli-mode.mjs`: 142 checks passed.
- `node tools/test-save-fixtures.mjs`: 11 shapes, 366 checks passed; it now
  checks each H2 field is kept exactly when saved and never added.
- `node tools/test-feature-flags.mjs`, `test-arena-settlement.mjs`,
  `test-career-backup.mjs`, `test-heli-hooks.mjs`: passed.
- Lane tier (PowerShell, `--tier lane --changed --jobs 4 --keep-going`) on
  the lane tip after merging integration (27f5e2e1): 265 passed, 0 failed,
  0 not run in 1,242 s. The run before it had three failures, all fixed:
  the switch roster test and the preview flags did not know `forest-fire`,
  and a stray root `run-log.md` on integration (fixed there in c2c28be1).
- `npm run build`: passed.

## Changed assertions

- `tools/test-heli-save.mjs`: the H1 normalizing test fed `unknown:
  'dropped'` and expected it gone. The packet's rollback rule reverses
  that, so it now feeds `unknown: 'kept'` and expects it kept; a new group
  covers nested values, a save and load, `__proto__` and wrong versions.
- `tools/test-heli-mode.mjs`: the import guard lets helicopter rules files
  import `../course-closures.js` as well (the save prices a buyback from
  it; it imports nothing from the helicopter).
- `tools/test-wasteland-beta.mjs`: its full list of switches gains
  `'forest-fire': 'dev'`.
- `start-preview.bat` (not a test, but outside the card's files): the
  preview requests every development switch, so `forest-fire` joins its
  flag list after `helicopter`, as H1 did. Nobody held `circuit-registry`.
- `tools/test-feature-flags.mjs`: the switch count rises from 26 to 27 (the
  new `forest-fire` switch).
- `tools/test-save-fixtures.mjs`, `tools/test-arena-settlement.mjs`,
  `tools/test-career-backup.mjs`: the fixture roster rises from 10 to 11
  (fixture 11), as the packet says.

## Removed

Nothing. No earlier code or test is replaced; the only behaviour change to
H1 is that unknown keys are now kept instead of dropped.

## Review (rule 17)

One independent reviewer read the diff. Real faults found and fixed with
tests: the lane gate failed on the helicopter import guard; a known field
of the wrong type was copied by the unknown-key rule and crashed
`addScar`; a broken burn day read open raw but closed after loading; the
fire pay could be paid twice (now `putOutFire` checks the fire's id and
clears it in the same step). Also taken: newer fields are copied rather
than shared, burns and scars are never dated after today, and the packet's
`'smoke'` kind is gone.
