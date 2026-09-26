---
task: ARENA-01-UI
status: ready-to-merge
kind: feature
flag: scrapdome
player_facing: no
---

# Scrapdome entry, arena display and results (26 September 2026)

## Design

Settled in `docs/SCRAPDOME.md` sections 3 and 6. Entry only from the yard, for
a player who found the gate, while `scrapdome` is on; never the main menu. The
arena display replaces laps, route progress and race position. UFO rule in
the arena: a hop straight ahead (12 m plus 4 m per level) that must land on the
floor clear of cars and junk; no once-per-lap limit, only its recharge.
Computer drivers are named (GASKET, RIVET, SPROCKET) so callouts and the
scoreboard read naturally.

## What changed

- `src/screen-arena.js` (new): yard panel, display presentation, scoreboard,
  opponent marker labels, results and pause screens. `src/screen-arena.css`.
- `src/app.js`: `arenaAvailable`, `startArenaEvent` (the player's own car,
  upgrades, loadout, kit and crew; computer cars upgraded by difficulty),
  `returnToYard`; restart in an arena is a rematch; race settlement and the
  interrupted-race record never run for arena events; leaving clears the event.
- `src/screen-router.js`, `src/screen-yard-home.js`: SCRAPDOME yard button and
  panel, car-count choice, arena actions.
- `src/screen-hud.js`: scoreboard element and arena text; no GRAVEL TRACK
  message and no crush counter in arena events.
- `src/screen-results.js`: arena results and pause screens.
- `src/combat-hud.js`: opponent labels show names, a red HUNTING YOU tag and
  distance across the floor; the UFO slot says NO ROOM when a hop is blocked.
- `src/combat-weapons.js`, `src/wasteland-tuning.js`: the arena UFO hop for the
  player and computer cars (`arenaWallMargin`).
- `src/arena/arena-event.js`: driver names and the default field; callouts use
  names (YOU WRECKED GASKET, WRECKED BY RIVET).

## Behavior and test changes

No existing assertion changed. New `tools/test-arena-ui.mjs` (6 tests) and a
rewritten `tools/scenarios/scrapdome.mjs` that plays the real journey.

## Evidence

- Arena UI tests 6/6; arena event tests 10/10; replay fingerprints 162/162.
- Private browser `scrapdome` at 1280 by 720, High and Performance: menu
  WASTELAND button, yard, SCRAPDOME, three cars, fight (scoreboard, names,
  HUNTING YOU, no GRAVEL TRACK), results, REMATCH, pause, BACK TO THE YARD; no
  race record touched; frames mean 16.67 ms, 95th percentile 16.8 ms with four
  cars; 0 warnings, 0 errors. Captures reviewed and deleted.
- Full tier and build: recorded in the merge commit.
