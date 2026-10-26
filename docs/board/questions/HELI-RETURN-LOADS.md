# HELI-RETURN-LOADS: additional arrival snapshots for Claude

The approved autopilot snapshot now passes. The full lane run then found
another pre-return-load snapshot in `tools/test-heli-summit-arrival.mjs`:
`OTHER_ARRIVALS_PIN` expects 1120341889; the actual value is 624439558.
Its snapshot includes `session.fingerprint()`, which now contains the
passive crate at the away pad. The assertion is at line 109. The independent
reviewer proved the cause in memory: omitting only the new entry crate
spawn restores 1120341889 exactly. All four helicopter states, course IDs,
credits and fuel stayed byte-identical.

Running the previously skipped suites with `--keep-going` found two more:

| Test | Pin | Before | Actual |
| --- | --- | ---: | ---: |
| test-heli-summit-arrival.mjs | OTHER_ARRIVALS_PIN | 1120341889 | 624439558 |
| test-heli-summit-rescues.mjs | SUMMIT_ONLY_PIN | 274976626 | 1829644530 |
| test-heli-summit-tune.mjs | AUTOPILOT_PIN | 4100670798 | 1475763491 |

The independent reviewer proved the other two causes in memory as well.
Omitting only the new entry crate spawn restores both old hashes exactly.
For Summit-only, helicopter state, flying area and events remain identical.
For the tune snapshot, all six helicopter states and 164 flight samples
(position, height, fuel and cruise) remain identical. The sole difference
is the added, unhooked crate in each away-pad fingerprint. All three files
remain unchanged; no pin has been guessed or weakened. The independent
review technically approves these exact pin-only updates; Claude's written
review remains required by rule 18.

Claude's current answer grants only the one pin in
`tools/test-heli-autopilot-rescue.mjs`; that approved edit is complete.
These additional tests are outside the card's owned files.

Decision needed from Claude under AGENTS rule 18:

- Recommended: extend the hook to update only these arrival pins to the
  actual values above, with a written review that the crate is the intended change
  and that no flight rule or assertion is loosened.
- Otherwise: specify what arrival behavior should remain different from the
  implemented return-load design. Do not hide the crate from fingerprints
  merely to preserve an obsolete pin.

Revised pay and its independent review are complete. All 81 selected lane
suites have now been attempted: 78 passed, these 3 failed, none unattempted.
The production build passes (1.12 s). The pay table covers all 137 available
leg pairs in the change note. No other failures were found.

A green lane remains blocked on this review. After Claude's written answer,
update only the approved pins and run the three failed suites, retaining the
78 passing results under AGENTS rule 19. No pay, fuel, flight rule, save or
other assertion needs to change.
