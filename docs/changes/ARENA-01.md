---
task: ARENA-01
status: ready-to-merge
kind: feature
flag: scrapdome
player_facing: no
---

# Scrapdome foundation: venue, event, teams, pilot and brains (26 September 2026)

## Design

Settled in `docs/SCRAPDOME.md` (sections 1 to 7) and SPEC 0.13 before code.
Key choices: positions stay track-relative on a ring venue; venues are not
courses, so none reaches the circuit picker; one `state.arena` object selects
arena rules; a teams module keeps races exactly player against computer; the
pilot and brain are separate. Reverse by leaving `scrapdome` at dev (nothing
calls `startArenaEvent` yet) or removing `src/arena/`.

## What changed

- New: `src/arena/venues.js`, `arena-event.js`, `arena-floor.js`,
  `arena-pilot.js`, `arena-brains.js`, `src/combat-teams.js`.
- `src/game.js`: `startArenaEvent`, `_loadArena`, an arena branch in `step`,
  `stageDef` returns the venue in an event, and `_resetStageDriving` extracted
  unchanged from `_loadStage` (162 replay fingerprints unchanged).
- `src/course.js`: a `scrapdome` layout (floor 18 m, walls at 21 m, three
  ramps, six junk cars). Titan Monster Arena and every course are unchanged.
- Combat asks the teams module only inside an arena event: projectile targets
  and owners (`combat-projectiles.js`, `combat-weapons.js`), computer aim
  (`combat-ai.js`), ram owner (`sim-contacts.js`), protection and damage notes
  (`combat-armor.js`). Outside an event the owners are still `player`/`cpu`.
- `sim-driving.js`: free heading and a dirt floor limit in arena events;
  `sim-crash.js`: no boundary resets there; `onfoot-transition.js`: no
  getting out in arena events yet.
- `src/feature-flags.js`: `scrapdome: 'dev'`.
- `src/generated-shortcut-presets.js`: source fingerprint only, because
  `course.js` changed; all 15 saved layouts are byte-identical and match a
  fresh solve (`--verify-solvers`, 241 checks).

## Behavior and test changes

- `tools/test-feature-flags.mjs`, `tools/test-wasteland-beta.mjs`: the switch
  list now includes `scrapdome: 'dev'` and production keeps it off.
- New `tools/test-arena-event.mjs` (10 tests) and
  `tools/scenarios/scrapdome.mjs`.

## Evidence

- Arena tests 10/10: venue validity, switch and field checks, full rounds on
  Easy, Medium and Hard repeatable from seed with every car on the floor and
  the hunter cap held, computer cars wrecking each other, wreck credit, spawn
  protection and farthest respawn, sudden death, race teams unchanged, floor
  speeds, driving guard rails.
- Driving measurements are in `docs/SCRAPDOME.md` section 8.
- Private browser `scrapdome`: a fight drew and played at High (313 draw
  calls) and Performance (185), 0 warnings, 0 errors; captures reviewed and
  deleted.
- Full tier and build: recorded in the merge commit.
