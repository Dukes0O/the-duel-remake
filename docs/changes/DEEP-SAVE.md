# DEEP-SAVE

Design settled before source: THE_DEEP 10.1 is authoritative. Deep fields stay
optional; untouched legacy saves gain no Deep object. No history is inferred.
Duel and Time Trial completed Pacific Canyon races count independently of
Wasteland, at most ten, using existing settlement duplicate protection.
Hints at five and ten stop after discovery. The first garage hint exposes one
150-credit kit shared by all cars. The switch gates progress, hints and buying;
stored Deep data survives loading while off. No new cue belongs to this card.

## Checks

Meaningful acceptance: tools/test-deep-save.mjs passes 17 memory-only groups,
including actual App Duel/TT settlements, reload/duplicate protection, named
players and denied-write kit rollback. All eight old fixtures match the actual
874bc0e3 normalizer byte for byte. The existing fixture suite passes nine shapes
and 286 first-load/round-trip checks; progression 27 and App integration 146 pass.
The existing storage model passes at 3.52 MB under 4 MB.

One existing assertion changed: test-save-fixtures roster 8 to 9, specifically
for required 09-deep.json, under the Director's committed grant. Every historical
preservation and wallet assertion is unchanged. Fixture 09 is checked separately.
App wiring is under the committed 61a3c9c9 narrow grant; no main or new TT callback.
The kit uses the existing failed-save rollback, leaving credits and kit unchanged.
Fresh save guardian and ordinary review cleared the initial owned source. Final
App addendum and lane/build follow reconciliation of actual Panorama source.

## Removed

No replaced runtime, assets or tests. No scratch output retained.

## Deferred

Actual browser, frames, balance and full checks belong to the night shift.
