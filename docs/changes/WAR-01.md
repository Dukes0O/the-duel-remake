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
survive normalization. Rendering reads this progress without changing the
profile or browser storage.

## Tests first

Commit `b7e1feb` added the red acceptance tests before runtime work. They
failed because `src/warlords.js` did not exist, saves still used the legacy
defeated-ID array and territory cards had no shipped-fight check.

Focused checks now pass:

- `node --test tools/test-warlords.mjs tools/test-territory-ui.mjs tools/test-territory-screen.mjs tools/test-wasteland-career.mjs tools/test-progression.mjs`
- 19 test entries passed, 0 failed. The WAR-01 files ran 107 metadata, save,
  display and safety checks.
- Existing progression, named-player separation and Wasteland career tests
  pass with the new save shape.

No assertions changed after the red test commit. No browser check was run: the
current shipped-fight list is deliberately empty, and the Director will run
the required lane gate and build before merge. Race fingerprints are unchanged
because this card does not alter simulation or race setup.

## Removed

The normalized save no longer writes the legacy shared `warlords.defeated`
array. Migration reads it once and writes the per-warlord records instead. No
runtime asset or released fight path was removed.
