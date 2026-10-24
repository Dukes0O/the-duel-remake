# DEEP-SIRENA: the Sirena story rules (switch `the-deep`, dev)

THE_DEEP sections 6.2, 6.3, 6.6 and 10.1: the sonar, the lift bags, the order of the finds, what the
save records and what it pays. Pure and headless in `src/deep/deep-sirena.js`; nothing in the game calls it
yet (DEEP-SIRENA-VIEW does). Holds the `save-shape` lock.

## What was built

- **`createSirena(zone, deepSave, {enabled})`**: the state of one dive. Each find is placed at its trail point plus
  its sideways offset (positive left, as for pearls). Inert (nothing pings, lifts, records or pays) with the switch
  off, or in a zone without the six Sirena finds. Saved ids the zone does not know are ignored; a saved badge brings
  the sonar back with it.
- **`pingSonar(state, car, seconds)`**: silent until the badge is raised. One ping per 1.5 s of the dive clock, range
  150 m inclusive, the nearest find not yet raised, `sirena-car` only after the other five. Emits
  `{deepSonar: {blip, echoSeconds}}`: `blip` is `{find, distance, bearing, relative}` or `null` ("No echo"), and
  `echoSeconds` is 2 x distance / 1,500.
- **`stepLift(state, car, input, dt)`**: a lift starts when the car is within 4 m (horizontal) of an available find,
  under 3 km/h, and F is pressed (`input.lift`); 3 s, or 12 s for the car; driving off (past 4 m or over 3 km/h)
  cancels it. The badge is raised by stopping beside it for 1 s, with no F and no bag. Events `deepLift {find,
  seconds}`, `deepLiftCancel {find}`, `deepRaised {find}`. The car's picture is `{x, z, speed (mph), heading?}`,
  never changed.
- **`raiseFind(profile, id, {enabled})`** records `deep.raised` and pays the first time only: 100 a part (the badge
  is one of the five), 500 the car. The badge also records `deep.sonar`. Out of order (a part before the badge, the
  car before the other five), unknown ids and the switch off are refused with the profile returned as it was.
- **`recordCoastCup(profile, {enabled})`** (SIRENA-CAR calls it): 1,000 credits and `deep.coastCup`, once, only after
  the car is raised. Credits stop at 1,000,000,000 and a wallet past it is left alone.
- **Save** (`normalizeDeep`, three fields): `sonar` (true once given), `raised` (find ids, like the other id lists)
  and `coastCup` (true once finished). Each is checked only when present; an old save gains none; unknown keys stay.
- **Fixture** `tools/fixtures/saves/16-deep-sirena.json`: four players (all six raised and the cup with an unknown
  future key; halfway; an older Deep save without the new fields; no Deep at all).

Design calls with a recommended pick each are in the question file and the answers go on the card.

## Changed assertions (for Claude's written review, AGENTS rule 18; nothing is loosened)

- `tools/test-save-fixtures.mjs`: the pinned roster 17 to 18 (the new fixture); and one added check, that a saved
  `deep` field is kept exactly and an older save gains none (same shape as the existing `heli`, `drivingLessons` and
  `lab` checks).
- `tools/test-deep-save.mjs`: its fixture loop special-cased `09-deep.json` as the only Deep fixture and checked
  players 0 and 1 by position. It now treats 09 and 16 alike and checks every player against its own saved `deep`
  (equal when saved, no `deep` when not), which holds the old 09 check and is stricter for 16.
- `tools/test-deep-look.mjs`: five exact entries added to the approved-import list for the new test file (the Deep
  isolation check still refuses every other import).

## Checks (Linux cloud)

- `tools/test-deep-sirena.mjs` (13 tests): the position of a find on a straight trail and on all three real
  routes; no sonar until the badge, and the badge needing no sonar; the order of finds (nearest first, the car last);
  range 150 m and the 1.5 s cooldown at their edges; the echo time and bearings; lift start, 4 m and 3 km/h edges,
  3 s and 12 s at five step sizes, cancel by distance and by speed and a fresh restart; each reward once, in order,
  the cap and bad wallets; the same inputs give identical events; the switch off pays and records nothing; the three
  fields in the save. A scripted whole dive on each real route raises all six and pays 1,000. A few deliberate
  breakages (cooldown, range, lift time, lift range, pay, the car's order) were each caught.
- `node tools/test-save-fixtures.mjs` (the save checker): 18 shapes, 751 checks. `tools/test-deep-save.mjs`,
  `tools/test-deep-look.mjs`, `tools/test-career-backup.mjs` and `tools/test-arena-settlement.mjs` pass.
- Lane tier, build and the save review: see the end of this note.

## Removed

Nothing.
