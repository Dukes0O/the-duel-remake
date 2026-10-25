# MAP-SECRETS

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/PILOT_MAP.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). Pilot's map section 5 and the
save of section 6. Switches `helicopter`, `pilot-map`, and each variant's
own switch. Needs MAP-DESTINATIONS.

- **Signs:** the five signs of 5.1 as positions on their courses (off the
  road, clear of scenery, visible only from above: flat painted marks or
  lights facing up). Spotted when the helicopter hovers within 60 m above a
  sign for 3 s; the sign of a variant whose switch is off is not there.
- **Unlock kind** `spotted-from-air` in `src/circuit-manifests.js` for the
  five variants: price 0, owned when found (the manifest checks today allow
  only `owned-course`; add the new kind with its own checks).
- **The Table:** its place, the "?" rule (the first cruise leg whose
  straight line passes within 4 km, with Roger's call on arrival), its
  landing zone on top, the logbook (500 credits once, the Deep's pencil
  cross: `deep.places` gains nothing; the log page reads `heli.map.table`),
  and a small drivable strip on top for a car that was carried there.
- **Save** (lock `save-shape`): `profile.heli.map = {version: 1, seen,
  found, table}`; fixture `tools/fixtures/saves/<next free>-pilot-map.json`;
  the save checker.
- `tools/test-map-secrets.mjs`: each sign is found only by the hover rule;
  found variants appear in that player's course list and nowhere else; a
  variant with its switch off has no sign; the Table appears after the right
  leg only; its reward once; old saves unchanged.

Owns: `src/heli/map-secrets.js`, `tools/test-map-secrets.mjs`, the fixture,
`docs/changes/MAP-SECRETS.md`. Hooks: `src/circuit-manifests.js`,
`src/heli/heli-save.js`, `src/heli/heli-session.js`. Locks: `save-shape`.
Sound: `heli.found`; one new Roger line for the Table's call (record with
SKI-AUDIO's session or alone). Art: MAP-ART.

Acceptance: the test, the manifest and circuit tests unchanged apart from
new cases (Claude's written review if any existing assertion changes), the
save checker, lane tier, build, one review. Removed: nothing.

## Claude answers

Settled 25 October 2026 (answers to `questions/MAP-SECRETS.md`, now deleted).

- **Save lock.** Ship the rules, session, signs and the Table now. The save part
  (`heli-save.js` `KNOWN_KEYS` and `validCourse` accepting `the-table`, the fixture
  `tools/fixtures/saves/<next free>-pilot-map.json`, `tools/test-save-fixtures.mjs`) goes in a
  second pull request when SKI-SAVE releases `save-shape`. Until then a car cannot be left on the Table.
- **Unlock route: option A.** The five variants are found from the air only. Remove
  `default-gp-podium` from the five, make `spotted-from-air` their unlock kind, update the four
  assertions (`test-circuit-variants` twice, `test-circuit-layouts`, `test-course-kit`) with one line
  of reason each, and move the reference-lap tooling to the new kind.
- **Extra files** `circuit-variants.js`, `course-access.js`, `heli-audio.js`: approved.
- **Roger's line.** Emit the Table-call text with no voice until recorded; the line is queued on SKI-AUDIO.
- **No registry course** for the Table now.
- **Numbers** (25 m, 2 to 60 m, 6 m/s, 3 s; 4 km; 500 credits once): approved.
