---
task: MAP-SECRETS
status: review
kind: feature
flag: pilot-map
player_facing: yes
---

# The pilot's map secrets: five signs, the Table and the map record (25 October 2026)

Card `docs/board/cards/MAP-SECRETS.md`, design `docs/PILOT_MAP.md` section 5 (settled
points under "Settled by MAP-SECRETS"). Behind `pilot-map` (dev), and only with the
helicopter on; each variant also needs its own switch. With `pilotMapEnabled` off, or
`secretCourses` left out, no sign, no Table and no `secrets` key in the view; the
helicopter tables, legs and answers are what they were (the pinned hashes in
`test-map-destinations` still hold).

**This is part one.** The card holds `save-shape`, which SKI-SAVE holds now (Claude's
answer on the card: ship the rest now, the save part in a second pull request). Left for
that pull request, listed under "Not done here".

## What it adds

- `src/heli/map-secrets.js` (new, rules only, no graphics): the five signs
  (`SECRET_SIGNS`, ids equal to the variants' course ids, with the rule that places
  them, `signClear`); the hover rule (`SPOT`: 25 m, 2 to 60 m up, at most 6 m/s, 3 s in
  a row) and its state machine (`createSpotter`, `stepSpotter`); the map record
  `profile.heli.map = {version: 1, seen, found, table}` with `createMap`,
  `normalizeMap` (a malformed record reads as nothing found), `mapOf`, `noteFound`,
  `noteSeen`; the Table (`legPassesTable`: the leg's straight line within 4 km of it,
  `claimTable`: 500 credits once, capped at the wallet limit); and `createTableWorld`,
  the hand-made world (a mesa 90 m over the desert with a 130 m flat top and a cliff
  band, an 8 m wide oval dirt strip, the lookout tower and the wreck as obstacles).
- `src/heli/heli-session.js`: option `secretCourses` (the ids whose switches are on);
  the spotter steps with the flight (`secretFound` event, saved at once); a dynamic
  `table` flag makes the Table a destination once seen; `loadWorld('the-table')`
  returns the hand-made world; the call on arrival after a qualifying cruise leg
  (`tableSpotted` with the words, and a `radio` event for `heli.radio.table.spotted`);
  the first touchdown in the circle gives `tableFound` (500 credits, `table: true`);
  `view().secrets = {signs, spotting, found, table}` (only with the map on) for the
  art and the map screen; `courseSite` takes `table` so the Table has an arrival point
  toward every place. `places` became a lookup by call (`placesNow()`), since the
  destination table grows when the Table is seen.
- `src/heli/heli-jobs.js`: `destinationsFor`, `legFuelKg` (and so `bearing` and
  `isDestination`) take `table`, which adds `the-table` (name, 1,100 m, drawn at the
  table point) to the pilot-map destinations; `nameOf` names it.
- Unlock kind **`spotted-from-air`** (price 0, parent = the default Grand Prix event):
  `src/circuit-manifests.js` accepts it with the checks the podium kind already has;
  `src/circuit-variants.js` gives the five variants this kind (Claude: option A, air
  only); `src/course-access.js` owns a variant when its parent is owned and
  `profile.heli.map.found` lists it (read inline, no import of heli code), and words
  the requirement "Found from the air: look for its sign from the helicopter over
  <parent>."; `src/course-access-ui.js` keeps the Team Room button for these variants
  (`requirement.kind !== 'owned-course'` instead of `=== 'default-gp-podium'`).
- Sounds and words: `heli.found` (three rising tones, interface bus) for `secretFound`
  and `tableFound` in `src/heli/heli-audio.js`; `src/heli/heli-ui.js` shows the words of
  `secretFound`, `tableSpotted` and `tableFound` on the flight panel.
- Reference-lap tooling: `tools/build-reference-laps.mjs` and `tools/track-review.mjs`
  put a found variant into the profile's map record (as a player's save would) instead
  of a podium.

Files beyond the card's three hooks (`circuit-manifests.js`, `heli-save.js`,
`heli-session.js`), all approved on the card: `circuit-variants.js`, `course-access.js`,
`heli-audio.js`. Two more, one or two lines each, needed to keep behaviour whole:
`course-access-ui.js` (without it the five variants lose their Team Room entry) and
`heli-ui.js` (without it the words of a find are never shown). `heli-save.js` is
untouched: it is the save part.

## Settled in writing (Claude answers on the card)

Option A for the unlock route, the three extra files, Roger's line as text only until
recorded (id `heli.radio.table.spotted`, queued on SKI-AUDIO), no registry course for the
Table, all numbers as proposed. The sign positions follow the rule in `signClear`: off the
road by a road half width and 6 m, out of the water, no scenery within 8 m. Slopes do not
matter: the paint is not a landing (Panorama Ridge has no flat circle clear of its road).

## Tests

`tools/test-map-secrets.mjs` (235 checks):

- the five signs: each is a registered variant with the new unlock kind, price 0, dev; each
  stands clear (`signClear`) and off the road; none of two on one course is within one hover;
- the hover rule at every edge: 25 m sideways, 2 and 60 m up, 6 m/s, 3 s, on the ground,
  the climb counting in the speed, leaving starting the count again;
- the map record: new, old save (no record), malformed records, unknown and repeated names,
  noting twice, the Table landed on counting as seen, survival through `normalizeProfile`;
- the course list: a found variant is open for that player and no other, only the one found,
  not without owning the parent, a hand-written list naming other courses opens nothing, a
  podium on the parent no longer opens it, it cannot be bought, and the words of the
  requirement; the registry accepts the kind and refuses a price, an unknown parent, itself
  and an unknown kind;
- the Table: which legs pass (16 of the 190 between course places, each within 4 km), the
  logbook's 500 credits once and the wallet limit, the mesa's heights, the strip, the tower
  and the wreck;
- in the helicopter (real flights from the pad): flying over a sign at speed finds nothing;
  a hover finds it once, saves it, takes it off the view and puts the course in that
  player's list; a hover at 90 m, a switched-off variant, another course's sign and the map
  off find nothing and write nothing; the call after the right leg only, once, with the
  words and the radio line; the Table as a destination only once seen; the leg there, the
  landing in the circle on top, the logbook paid once, a second landing paid nothing; a car
  carried up cannot be left and stays where the save has it.
- Break-the-code checks (each made the test fail, then reverted): the speed limit removed,
  the height limit raised, a found sign still in the view, a sign shown with its switch off,
  the call without the "seen" check, the call on every leg, the car left on the Table, a
  find opening every secret course, the logbook paid twice.

## Changed assertions (none loosened; each needs Claude's written review, rule 18)

The five variants change from "top three in the parent Grand Prix" to "found from the air"
(Claude's answer on the card). One line each:

- `tools/test-circuit-variants.mjs` (two): the lighting and reverse variants' `unlock` is
  `{kind: 'spotted-from-air', defaultEventId: parent}`; the test title says "access found
  from the air".
- `tools/test-circuit-layouts.mjs` (three): the branch that checks the five approved
  children, its failure message, the exact `unlock` it asserts, and the filter for "original
  definitions" now use the new kind; the same five ids, price 0 and release order are asserted.
- `tools/test-reference-laps.mjs`: the loop over variants takes the `spotted-from-air` ones
  and checks the fixture put them in the pilot's found list (before: the parent podium).
- `tools/test-circuit-variants.mjs` (the same test, found by the lane tier): a podium on the parent
  no longer opens a variant (asserted), and a found record does (and not without owning the parent).
- `tools/test-heli-mode.mjs`: the import allow-list for `heli-session.js` gains `./map-secrets.js`
  (a pure-rules helicopter file), as MAP-DESTINATIONS added `./pilot-map-data.js`.
- `tools/test-heli-audio.mjs`: the exact list of tone cues gains `heli.found`, and the bus
  table gains its entry (a pure addition).
- `tools/test-course-kit.mjs` needed **no change**: the registry still accepts the podium
  kind, which its fixtures use.

## Independent review (rule 17: money and saved progress)

A fresh reviewer given only the diff and tests found no defect in the 500-credit payment
(once, only on a non-crash touchdown inside the circle), the unlock (one find opens only its
own course, the parent must be owned), the hover rule (any frame rate, cannot fire twice) or
the lazy `table` flag. Its low-severity notes were taken: the course list reads the record only
at `version: 1` like the session does; a find over a course the player does not own says the
course joins the list once the parent is owned (tested); the Team Room browser scenarios
(`tools/scenarios/team-room.mjs`, `team-room-photos.mjs`, laptop only, not run here) now also
put the found variants in the fixture profile. Not taken: a map record of another version is
read as empty and rewritten as version 1 (no other version exists; the save part decides).

## Checks

Run once in the cloud (Linux, no graphics), on the branch merged with the current
`integration/wasteland` (clean merge):

- `npm run build`: passes.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going` (465 suites):
  the two that my change moved (`test-circuit-variants`, `test-heli-mode`) failed and are
  fixed above, and pass; `test-map-secrets` (235), `test-map-destinations`, `test-pilot-map`,
  `test-heli-audio`, `test-course-access` and `test-reference-laps` (408) pass. The rest of
  the failures are not mine: `test-course-kit` (asserts `win32`; its other seven tests pass),
  `test-earned-cars-ui`, `test-drive-through`, `test-full-check`, `test-medals`,
  `test-salt-flats`, `test-salt-flats-art`, `test-p4-kits`, `test-tanker-valve-source`,
  `test-vesper-art` (laptop, art library or Blender) and `test-compact-binaries` (this cloud
  clone's signed commit headers); `test-lab-radio` and `test-drift-trial` fail the same way on
  a clean checkout of `origin/integration/wasteland`.
- Not run: browser scenarios (the Team Room scenarios were edited, not run), frame checks
  (nothing is drawn yet).

## Not done here

- **The save part** (second pull request, when SKI-SAVE releases `save-shape`):
  `heli-save.js` gets `map` in `KNOWN_KEYS` with its own normalizer, and `validCourse`
  accepts `the-table` so a car set down there is saved; the fixture
  `tools/fixtures/saves/<next free>-pilot-map.json` and its lines in
  `tools/test-save-fixtures.mjs`. Until then the record round-trips as an unknown key
  (tested); part two (below) made a car at the Table keepable.
- Nothing is wired into the screens: `src/app.js` passes neither `pilotMapEnabled` nor
  `secretCourses` (MAP-VIEW wires both: `secretCourses` = the secret ids whose switches
  are on), and the renderer does not draw the Table or the signs. MAP-VIEW should draw the
  Table from `createTableWorld()` (the session loads it, not `app.duel.course`) and the
  signs from `view().secrets.signs`; the art is MAP-ART.
- Roger's recording (SKI-AUDIO): add one `HELI_RADIO_LINES` entry for
  `heli.radio.table.spotted`; the text is `TABLE_CALL.text`.
- The Deep's log page reading `heli.map.table` is the Deep's card; the flag is set and saved.

## Removed

- The "top three in the parent Grand Prix" route to the five variants (their unlock kind
  was `default-gp-podium`); the registry still accepts that kind for future variants.

# Part two: the save (25 October 2026)

`save-shape` came free when SKI-SAVE merged; Claude asked for this on the same card. Branch
`cloud/map-secrets` restarted from the merged `integration/wasteland` (part one is merged as PR 29).

## What changed

- `src/heli/heli-save.js`: `map` is a known key with its own normalizer (`normalizeMapRecord`): version 1 only,
  repeated and unusable names dropped, at most 128 names a list, a later game's names and keys kept as they are,
  `__proto__` never; a record with a later version (a number, text, fraction or huge number above 1) is kept exactly
  and read as empty. New: `MAP_SAVE_VERSION`, `mapRecordOf`, `mapBlocked`, `writeMapRecord` (refuses a write over a later
  record or a later helicopter, as the ski record does). `validPlace` (a registry course, or `the-table`) is used for a
  car's place (`carsAt`, `placeCar`) and nowhere else: calls, rescues, jobs and scars still need registry courses.
- `src/heli/map-secrets.js` no longer keeps its own copy of the record's rules: `mapOf`, `noteFound`, `noteSeen` and
  `claimTable` read and write through the save's functions and return `{ok: false, reason, profile}` over a record they
  must not write over. A later game's names mean nothing here (they are not dropped, as the first part's filter did).
- `src/heli/heli-session.js`: a find, a sighting or the logbook that cannot be saved is not announced or paid; a car
  released in the Table's circle is saved there and `delivered` (the part-one refusal `carNotKept` is gone).
- Fixture `tools/fixtures/saves/20-pilot-map.json` (three players: a full record with a later game's name and key and a
  car at the Table; an older helicopter with none; a record at version 2) and `tools/test-save-fixtures.mjs`: the
  roster count 19 to 20 and one check (a saved `map` is kept exactly, an older helicopter gains none). No other assertion
  changed.

## Tests

`tools/test-map-secrets.mjs` is now 282 checks. New: a saved record comes back exactly twice over; an older save gains
none; a car at the Table survives save and load; a scar on the Table is dropped; a car at a made-up place is dropped;
1,000 names cut to 128; `__proto__` names and keys; a record at version 2, `"2"`, 2.5 and 1e30 kept exactly and every
write over it refused (find, sighting, logbook, the logbook pays 0); a later helicopter refused; a hover over such a
record finds nothing, silently. The first part's malformed-record tests now go through the profile. Break-the-code checks:
the `map` line in `normalizeHeli` removed, `validCourse` for cars, the 128 cut removed, later helicopter / later record
not refused, a later record not kept, `__proto__` allowed: each makes a test fail.

Changed assertion (reviewed reason): `tools/test-map-secrets.mjs` (own test, part one's): a malformed or unknown-named record no
longer "drops unknown names"; names a later game wrote are kept, as for the ski record. And the car at the Table is now
delivered instead of refused.

## Independent save review

A fresh reviewer attacked the record as a hostile save editor (versions 2, "2", 2.5, 1e30, Infinity, NaN, null and the rest;
a frozen profile; wallets of every bad kind; `__proto__`, `constructor` and nested keys; aliasing; idempotence through JSON and
`normalizeProfile`; every other reader of `carsAt`). It found no way to pay twice or to write over a later record, and no leak of
`the-table` beyond a car's place. Its notes: (1) a full list (128 names) silently took no new name while the session still
announced the find: fixed, `noteFound`, `noteSeen` and `claimTable` now return `ok: false` ("The map record is full.") and
nothing is announced or paid (tested); (2) `src/app.js:1693` words a car's place from a table that lacks the Table, so the home
board would say "is at the-table": cosmetic, left for MAP-VIEW (busy-game-files lock); (3) a car left on the Table can be fetched
only while the Table is a destination (the pilot-map switch on and the Table seen), so turning the switch off, or a later game's
map record, strands an air-only car there until it is back: accepted while the switch is a dev switch, and worth a rule before
`pilot-map` goes on for everyone; (4) pre-existing and not changed: a wallet of 1e30 is cut to the cap.

## Not done here

- The Deep's log page reading `map.table`, the map screen and the art (MAP-VIEW, MAP-ART). `src/app.js:1693` words a car's
  place by name and would show the raw id `the-table` for a car left on the Table: MAP-VIEW should name it.

## Removed

- The part-one refusal `carNotKept` (event, panel text, test) and the filter that dropped a later game's names.
