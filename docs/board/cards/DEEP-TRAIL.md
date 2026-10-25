# DEEP-TRAIL

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/THE_DEEP.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). Rewritten 24 October 2026 for
the story (THE_DEEP sections 4, 6 and 10.1). Switch `the-deep` (dev).
DEEP-ZONE is done, so this starts now.

Author the Kelp Coast as zone data and give the game its first real dive.

- `src/deep/zones/kelp-coast.js`: `defineZone` data for `kelp-coast` on
  `pacific-canyon`. A closed loop of 3 to 4 km from the bottom of the
  existing Pacific ramp and back. The first trail point is the ramp's end
  (the journey's existing check: 120 m ramp, end depth 8 m). Places in
  order: Ramp Shallows (5 to 10 m deep, open sand and seagrass), The Kelp
  Forest (10 to 20 m, `kelp` near 1), The Drop-off (the trail runs along
  the lip at about 25 m with deep water on the seaward side; `rock` high).
  Width 14 to 20 m; no bend tighter than a 25 m radius, so every car can
  drive it at the sea-floor speed cap.
- Two gullies made with the trail's own depths: a 25 to 40 m stretch about
  3 m deeper with a lip on each side, one in the Shallows and one in the
  Kelp Forest, so the slow fall gives a long float.
- Three pearls `kelp-1` to `kelp-3` (one per place; `kelp-3` on a rock at
  the Drop-off lip), creature spots for the seven Kelp Coast creatures
  (section 6.4), and the six finds of 10.1 in story order (the badge within
  40 m of the ramp's foot; `sirena-car` on the ledge, `below: 3`).
- `src/deep/deep-zone.js`: the optional `finds` field of 10.1, checked like
  pearls (ids unique, `trailIndex` in bounds, `offset` and `below` finite,
  `below` from 0 to 10). A zone without it loads exactly as before.
- `src/main.js`: one line passing the Kelp Coast provider to `App`
  (`deepProviders`), so a dive reaches the zone. Hook only.
- `tools/test-deep-kelp-coast.mjs`: the zone loads; loop length, depths,
  widths and bend radii in range; every trail point passes the cove's
  existing dry-terrain check (no land above the water within the trail's
  width); pearl, spot and find counts and ids; the journey dives into
  `kelp-coast` and drives back up the ramp; a Node drive on the sea-floor
  surface completes a full loop without leaving the trail.

Owns: the files above, `docs/changes/DEEP-TRAIL.md`. Hooks: `src/main.js`
(one line), `src/deep/deep-zone.js` (the `finds` field). Locks: none.

Sound: no new cue (place titles use the existing `deepPlace` event).
Art: none new; DEEP-WATER's look reads the trail's `kelp`, `grass` and
`rock` fields.

Acceptance: the test above; Pacific Canyon replays and fingerprints exact
with the ramp unused and with the switch off (lane guards); `test-deep-zone`
unchanged apart from new `finds` cases; lane tier and build. List in the
change note any suite the cloud could not run. Removed: nothing (the
test-only `test-kelp` zone stays in its test, which checks the format).

## Claude answers - the builder's four picks, 24 October

All four approved. (1) The trail is 6 m wide at the ramp's end and 14 to 20 m
elsewhere. (2) Keep the 55 degree V at the foot of the ramp. (3) The returning
forest stretch has no title card. (4) Leave the drop beyond the lip to the look,
and DEEP-SIRENA-VIEW now says the seaward side of the lip must read as a real
drop into dark water, because the Sirena rests on a ledge just below it.
