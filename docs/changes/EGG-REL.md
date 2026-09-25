---
task: EGG-REL
status: ready-to-merge
kind: release
flag: wasteland2, hidden-road
player_facing: yes
---

# Release the Wasteland as a Mad Max easter egg (25 September 2026)

## Design

Kyle's direction (SPEC 0.12): nothing new on the main menu beyond Mad Max Duel;
the Wasteland is found while racing Mad Max Duel. Review of BETA-01 found three
gaps against that: an EXPERIMENTAL button and panel on the menu, a Hidden Road
present in every race mode on Pacific Canyon, and Wasteland rules (crew, armor,
loadouts, on foot, raiders) switched on for every Mad Max Duel before the gate
was found, against 0.2 and Q9. Choice: one small module decides access, the
race reads the switch through it, and menus ask about the current player.
Reverse by setting both switches back to `dev`.

## What changed

- `src/wasteland-access.js` (new): `wastelandUnlocked`, `raceFeatureFlags`
  (the race's answer is fixed at race start) and `hiddenRoadInRace`.
- `src/app.js`: the Duel and the sound engine get the race view of the switches;
  shops, the yard and race start options ask `wastelandUnlocked()`.
- `src/game.js`: the Hidden Road is built only for Mad Max Duel or the gate visit.
  A Duel built without explicit switches now uses the race view too, so a
  headless race defaults to the live rules unless its player found the gate.
- `src/audio.js`: the sound engine's default switches assume no discovery; the
  app passes the race view.
- `src/progression.js`: the garage hint counts Mad Max Duel finishes only.
- `src/screen-router.js`, `src/screen-menu.js`, `src/style.css`: Experimental
  button, panel and styles removed; menu on-foot camera setting removed (C key
  still switches it on foot); menu shops use `app.wastelandUnlocked()`.
- `src/feature-flags.js`: `wasteland2` and `hidden-road` are `on`.

## Removed

- `src/experimental-ui.js`, `tools/scenarios/experimental.mjs`, the Experimental
  entry in `tools/scenarios/screen-modals.mjs`, Experimental styles.

## Behavior and test changes

Before discovery, Mad Max Duel has the live rules, as on `master`. Ordinary
races have no turnoff. All replay fingerprints are unchanged.

Changed assertions, each because the rule it checked was changed on purpose:

- `tools/test-feature-flags.mjs`, `tools/test-wasteland-beta.mjs`,
  `tools/test-combat-armor.mjs`, `tools/test-hidden-road.mjs`: the switch state
  is now `on`, not `beta`. The Experimental panel checks went with the panel.
  Generic beta, QA and override checks are unchanged.
- `tools/test-hidden-road.mjs`, `-journey`, `-departure`, `-discovery`,
  `tools/test-yard-home.mjs`: the road is driven in Mad Max Duel (with
  `wasteland2` off, the pre-discovery rules), not Rival Duel or Time Trial.
  The ordinary-race road fingerprint still uses Rival Duel against the same
  stored baseline. A new check shows the road does not change Mad Max driving.
- `tools/test-hidden-road-departure.mjs`: the saved ghost fixture comes from a
  Time Trial, the only mode that saves ghosts. Mad Max Duel issues no radar
  tickets, so "pending fines are discarded" became "no fine is pending".
- `tools/test-hidden-road-discovery.mjs`: hint finishes are Mad Max Duels;
  Rival Duel and Time Trial finishes are now excluded cases.
- `tools/test-audio.mjs`: the routing baseline passes explicit all-off switches.
  Before, it relied on the default being off.
- `tools/scenarios/wasteland-beta.mjs`: no opt-in step. The journey starts from
  Mad Max Duel, waits for its scene, checks the menu shows no Wasteland
  settings, and checks the pre-discovery race has the road without the new rules.
- `tools/scenarios/hidden-road-discovery.mjs`: the final switch-off step was
  removed. The released game has no switch-off state; per-player isolation is
  still checked. `hidden-road.mjs` and `hidden-road-arrival.mjs` start Mad Max Duel.
- `tools/test-wasteland-easter-egg.mjs` (new): access rules, road only in Mad
  Max Duel, live rules before discovery, hint counting.

## Evidence

- Full tier on the working tree: 271 of 271 passed in 388 s; production build passed.
- Browser, private memory-only QA: smoke passed (0 warnings, 0 errors).
  `wasteland-beta` passed: menu with no Wasteland settings → Mad Max Duel
  before discovery (road present, new rules off) → keyboard departure → gate
  invitation → Enter → yard → menu (WASTELAND button, dotted road) → Mad Max
  Duel with the Wasteland rules. `hidden-road-discovery` passed (hints, Turn
  back, reload, phone layout, second player sees nothing, direct visit).
  Captures reviewed, then deleted with `.evidence/`.
