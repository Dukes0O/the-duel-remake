---
task: MAP-DESTINATIONS
status: review
kind: feature
flag: pilot-map
player_facing: yes
---

# The pilot's map in the helicopter: destinations, legs, pads, sea, jobs, scouting (24 October 2026)

Card `docs/board/cards/MAP-DESTINATIONS.md`, design `docs/PILOT_MAP.md` sections 3
and 4. Behind `pilot-map` (dev), and only with the helicopter on. With the switch
off, or the new `pilotMapEnabled` option left out, **every helicopter table and
answer is exactly what it was** (pinned below). Nothing is wired into the game's
screens yet: `src/app.js` does not pass `pilotMapEnabled`, and the map screen and
cockpit key are MAP-VIEW.

## What it adds

- **Destinations** (`src/heli/heli-jobs.js`): `destinationsFor({pilotMap: true})`
  returns every course place, named by its course id (the stadium is `titan-arena`),
  except those in `LEFT_OFF`. The four original destinations keep their very
  records. `isDestination`, `bearing` (by where a place is *drawn*) and `legFuelKg`
  take the same option.
- **Landing zones:** the existing search, run on all 20 places, finds a zone on 19.
  **Ardennes Forest is left off** (`LEFT_OFF` in `pilot-map-data.js`): no clear,
  level 12 m circle beside its start. The test checks the search really fails there.
- **Legs and refusals:** the map's legs (`legFuelKgMap`); the six old legs keep their
  table numbers. A leg beyond the tank (Harbour Lights to Cloudbreak Skyway, 510 kg)
  is refused with the existing `cruiseRefused` event and radio line. Arrivals are 1.5
  km out on the side toward where you came from, facing the pad.
- **Fuel pads:** Harbour Lights 1.8, Pacific Canyon 2.0, Alpine Serpent 2.2 credits a
  kg, for a helicopter on the ground inside the landing circle, like the home pump.
  The free first tank stays the home pad's. `buyFuel` (heli-save.js) takes an
  optional `pricePerKg`.
- **The sea:** on a course that draws an ocean (it has a coast section: Eifel Crown,
  Cloudbreak Skyway, High Country, Pacific Canyon, Harbor & Highlands, Neon Docks and
  Azure Riviera) the ground is never below the surface (-15 m), and
  touching it, however gently, is a `crash` with cause `sea`, the usual repair bill,
  no `touchdown`.
- **Jobs:** with the map on, `dayJobs(day, {pilotMap: true, owned})` draws the day's
  three from the original routes (pays kept) and every other ordered pair of owned
  destinations whose legs each fit a tank, paid 300 / 450 / 600 / 800 by distance
  (under 5, 5 to under 12, 12 to under 20, beyond). Nothing owned gives the old board.
- **Scouting:** `view().scout` is `{courseId, corners: [{number, name, label, x, z}]}`
  over a course you own (the game's own corner detection and names), else `null`.
  The view also lists `destinations`.
- **The helicopter's ground on the other courses** (`heli-ground.js`, a file the card
  does not list; Claude approved, question 1): `heightAt` gave `renderedGroundHeight`
  only `{x, z}`, which throws on every course that is not an authored circuit (14 of
  the 20 places). It now also passes `s` and `off` from `course.nearest`.

## Settled in writing (Claude answers on the card)

1. The ground fix above, proved by a test pin: 10,614 heights of the six authored
   circuits are byte for byte as before, and every place answers finite heights.
2. `buyFuel`'s `pricePerKg` (one independent review: see below).
3. Base altitudes for the new destinations (`PLACE_ALTITUDES` in `pilot-map-data.js`);
   Summit stays the highest.

Also settled here: destinations by course id; bearings by drawn position; Summit Run
still needs its own switch; the pay boundaries (5 km to 450, 12 km to 600, 20 km to
800); owning only the original three adds their reverse routes; a course bought in
the menu while a job is in hand can change the board (the job in hand is looked up on
today's board); scouting needs the course owned (only Pacific Canyon is free by
default).

## Tests

New `tools/test-map-destinations.mjs`, 487 checks. **Switch off:** 100 days of jobs, the
legs, bearings, job titles and tables hashed against the helicopter files of the
commit before this card (loaded by hand and hashed; the numbers are pinned in the
test); a flight with the option off or left out is identical; no `scout` or
`destinations` in the view. **On:** the destination table; a landing zone for each,
Ardennes failing for real; bearings between every pair; the six circuits' ground
unchanged; the legs and a refusal and an arrival flown in a session; the three pad
prices, a partial purchase, the free first tank, no pump elsewhere or in the air; the
sea crash against a land landing as control; the jobs; scouting. **Money:** `buyFuel`
with no price, nonsense prices and 1.5 equals the old result for a spread of cases;
dear prices, rounding up, partial purchases never over the wallet. I broke the code
four ways to see the test fail (no sea crash, flat pad prices, a changed pay table,
the switch leaking) and each was caught. Every existing `test-heli-*` suite passes
unchanged.

## Changed assertions (none loosened; each needs Claude's written review, rule 18)

- `tools/test-heli-mode.mjs`: two allow-lists grow. The "imports only helicopter rules"
  list gains `./pilot-map-data.js` (a helicopter file that does not start with
  `heli-`) and `../track-analysis.js` (the session's corner detection for scouting).
  Permissions only.

## Not done here

- `src/app.js` passing `pilotMapEnabled`, the map screen, the cockpit key and the
  controls help (MAP-VIEW). With the option left out the helicopter is as it was.
- The Table (air only) and the secret variants (MAP-SECRETS).

## Independent review of the `buyFuel` change

REVIEW_PLACEHOLDER

## Checks

CHECKS_PLACEHOLDER

## Removed

Nothing.
