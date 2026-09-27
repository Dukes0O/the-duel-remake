---
task: WAR-01
status: ready-to-merge
kind: feature
flag: wasteland2
player_facing: yes
---

# Warlord ladder and territory-map entry (26 September 2026)

## Settled implementation

The ladder follows `docs/SCRAPDOME.md` section 5. Eight immutable warlord
records reuse the existing territory IDs, course assignments and venue
assignments. The catalog names only the three rewards already settled by
Claude. It has no poster or card-image fields.

The shipped-fight list is empty in WAR-01. A full hold therefore says
`WARLORD FIGHT COMING LATER` and exposes no launch control or reward. The map
can show `FIGHT`, or `DEFEATED · <REWARD> EARNED` and `REMATCH`, only when the
fight's implementation adds its ID to that list. This leaves the ladder behind
the existing Wasteland access and avoids a fake launch before WAR-02a.

Each named player's Wasteland save now has one additive record per warlord:
`{defeated, wins, losses}`. The old defeated-ID array migrates into those
records. Unknown fields on known records and unknown future warlord records
survive normalization. An unknown ID found only in the old defeated array is
also retained as a defeated per-ID record. Rendering reads this progress
without changing the profile or browser storage.

The migration preflight now treats the old defeated-ID array and any missing
or malformed known warlord record as a save migration. The game must create
and verify a byte-for-byte backup before it can persist the new shape. Career
exports that contain the old array remain valid. Warlord armor-kit purchase
rules and the Armory now read the per-ID records.

## Tests first

Commit `b7e1feb` added the red acceptance tests before runtime work. They
failed because `src/warlords.js` did not exist, saves still used the legacy
defeated-ID array and territory cards had no shipped-fight check.

Commit `d844915` added the save and armor compatibility regressions before
their fix. They failed in the intended places: the migration gate returned
false for the old array, normalization dropped an unknown legacy ID, armor
purchase threw while reading the removed array and the Armory left Warlord
plating locked after a per-ID defeat.

Focused checks now pass:

- `node --test tools/test-warlords.mjs tools/test-territory-ui.mjs tools/test-territory-screen.mjs tools/test-wasteland-career.mjs tools/test-progression.mjs`
- 19 test entries passed, 0 failed. The WAR-01 files ran 107 metadata, save,
  display and safety checks.
- Existing progression, named-player separation and Wasteland career tests
  pass with the new save shape.
- `node --test tools/test-warlords.mjs tools/test-armor-kits.mjs`: 9 test
  entries passed, 0 failed; 86 warlord metadata and save checks ran.
- `node tools/test-career-backup.mjs`: all seven historical fixtures,
  migration backup checks, export validation, recovery and quota rollback
  passed.
- `node --test tools/test-wasteland-profile.mjs tools/test-progression.mjs tools/test-territory-ui.mjs tools/test-territory-screen.mjs tools/test-wasteland-career.mjs`:
  21 test entries passed, 0 failed; the progression runner reported 27 checks
  and the territory UI reported 22 display and safety checks.

No existing assertion was weakened. No browser check was run in this focused
save fix; the Director will run the required private High and Performance map
review, lane gate and build before merge. Race fingerprints are unchanged
because this card does not alter simulation or race setup.

## Removed

The normalized save no longer writes the legacy shared `warlords.defeated`
array. Migration reads it once, after a verified backup, and writes the
per-warlord records instead. The removed array read in armor-kit logic and UI
was replaced by a shared per-ID defeat check. No runtime asset or released
fight path was removed.
