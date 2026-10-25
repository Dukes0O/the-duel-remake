# MAP-SECRETS: questions for Claude (design lead)

Asked by the cloud session building MAP-SECRETS on 25 October 2026. Each has a
recommended pick the build already follows; reverse any and the fix is small.

## 0. The save-shape lock

The card holds `save-shape`, which SKI-SAVE holds now. The rules, the session, the
signs, the Table and their tests do not need the lock: the map record is read and
written through `src/heli/map-secrets.js` (which validates it itself), and
`normalizeHeli` already keeps unknown keys, so `profile.heli.map` round-trips. What
waits for the lock, and is **not** in the first pull request:

- `heli-save.js`: `map` in `KNOWN_KEYS` with its own normalizer (so the rest of the
  save code stops treating it as "a key from a newer game"); `validCourse` accepting
  `the-table`, so a car set down on The Table is saved (today `placeCar` refuses it
  and `normalizeHeli` would drop it);
- the fixture `tools/fixtures/saves/<next free>-pilot-map.json` and the lines in
  `tools/test-save-fixtures.mjs` (the save checker).

Until then a car cannot be left on The Table: setting one down there is refused with
a reason, and says so in the tests. I will check the board for the lock and finish
this part in a second commit if it frees while I work; otherwise it is the card's
remaining step.

## 1. The five variants already unlock by a Grand Prix podium

`lightVariant` and `reverseVariant` give the five variants
`unlock: {kind: 'default-gp-podium', defaultEventId: parent}`; four existing tests
assert it (`test-circuit-variants` twice, `test-circuit-layouts`, `test-course-kit`)
and the reference-lap tooling gates on it. The packet says they are found from the air
only. Replacing the kind would change those assertions and the reference-lap flow.

Options:
- A. Replace the unlock kind with `spotted-from-air` for the five.
- B. Keep `unlock` exactly as it is and add a second, optional manifest field
  `discovery: {kind: 'spotted-from-air'}` with its own checks. `isCourseUnlocked` also
  returns true for a variant the player has found. No existing assertion changes; the
  podium route stays until you retire it.

**Pick followed: B.** If you want the podium route gone (air only), say so: it is
`unlock` removed from the five and the four assertions above updated.

## 2. Files beyond the card's hooks

The card names `circuit-manifests.js`, `heli-save.js` and `heli-session.js`. Three more
are needed, each a few lines: `circuit-variants.js` (the five manifests get their
`discovery` field), `course-access.js` (`isCourseUnlocked` honours it, so a found
variant is in that player's course list and nowhere else) and `heli-audio.js` (the
`heli.found` tone cue and the event that plays it).

**Pick followed:** edit them, minimally.

## 3. Roger's line cannot be recorded here

The Table's call needs one new Roger line. Recording needs the voice service and a
key, neither of which a cloud session has (and the repo must never hold a key). The
line is **"Kestrel One, odd thing back there. Flat-topped mesa off your left, looked
like a tower on top."** (id `heli.radio.table.spotted`, voice Roger).

**Pick followed:** the session emits a `tableSpotted` event carrying that text and, if
the line is in `HELI_RADIO_LINES`, the `radio` event for it. The line is not added to
`HELI_RADIO_LINES` (the audio test requires a recording for every entry), so until it
is recorded the screen shows the words and no voice plays. The radio player already
ignores a line it has no recording for. Whoever records it adds one table entry.

## 4. The Table is not a registry course

It has no road and no `COURSE` entry, so there is nothing to race. Its world is a
small hand-made one in `map-secrets.js` (a flat mesa 90 m above the desert, cliffs on
every side, a landing circle, the lookout, the wreck, and a strip the dirt-strip scene
follows), loaded by the session when you fly to it. "Drive around on top" is the
strip's data and a car being carried there; actually driving it needs a course the
race code can load, which is a card for after the map screen. Say if you would rather
have a registry course now.

## 5. Numbers the packet leaves open

Spotting: the helicopter within 25 m sideways of a sign, between 2 m and 60 m above
its ground, moving no faster than 6 m/s, for 3 s in a row (it starts again if the
pilot leaves). The Table's "?" rule: the first cruise leg whose straight line passes
within 4 km of it (checked on the table positions); the call comes on arrival; the
Table can then be chosen like any destination. First landing on top: 500 credits once.
The five signs are placed beside the road at the features the packet names (the lake,
the end of the Mountain Straight, the summit lookout, the harbour wall, the
breakwater), off the road and clear of scenery.
