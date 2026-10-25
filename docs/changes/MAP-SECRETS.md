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
  `secretFound`, `tableSpotted`, `tableFound` and `carNotKept` on the flight panel.
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

See "Checks run" below.

## Not done here

- **The save part** (second pull request, when SKI-SAVE releases `save-shape`):
  `heli-save.js` gets `map` in `KNOWN_KEYS` with its own normalizer, and `validCourse`
  accepts `the-table` so a car set down there is saved; the fixture
  `tools/fixtures/saves/<next free>-pilot-map.json` and its lines in
  `tools/test-save-fixtures.mjs`. Until then the record round-trips as an unknown key
  (tested) and a car released on the Table is refused with `carNotKept`.
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
