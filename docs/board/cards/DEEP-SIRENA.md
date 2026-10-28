# DEEP-SIRENA

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/THE_DEEP.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). THE_DEEP sections 6.2, 6.3,
6.6 and 10.1. Switch `the-deep` (dev). Needs DEEP-TRAIL.

The rules of the Sirena story, pure and testable in Node:

- `src/deep/deep-sirena.js`: `createSirena(zone, deepSave)`,
  `pingSonar(state, car, seconds)` (cooldown 1.5 s, range 150 m, the
  nearest find not yet raised, `sirena-car` only after the other five, no
  sonar until the badge is raised), `stepLift(state, car, input, dt)`
  (starts within 4 m under 3 km/h on F; 3 s, or 12 s for the car; driving
  off cancels), and the events of 10.1. It reads the car's plain picture
  (`x, z, speed`) and never changes race state, like drift scoring.
- Rewards of 6.6 for the five parts and the raised car, paid once when the
  save first records them.
- Save (lock `save-shape`): `deep.sonar`, `deep.raised` and `deep.coastCup`
  in `normalizeDeep` (`src/deep/deep-discovery.js`), optional, unknown keys
  kept; fixture `tools/fixtures/saves/16-deep-sirena.json` (take the next
  free number if 16 is used); the save checker. Old saves load unchanged.
- `tools/test-deep-sirena.mjs`: the order of finds; range and cooldown; the
  echo time (2 x distance / 1,500 s) in the `deepSonar` payload; lift
  start, cancel and finish; each reward once; the same inputs give the same
  events; with the switch off nothing is recorded or paid.

Owns: the files above, `docs/changes/DEEP-SIRENA.md`. Hooks:
`src/deep/deep-discovery.js` (three fields). Locks: `save-shape`.

Sound: emits the events that DEEP-AUDIO's `deep.sonar`, `deep.echo`,
`deep.liftbag` and `deep.raised` play. Art: none.

Acceptance: the test, the save checker with the new fixture, lane tier,
build, one save review (rule 17). Removed: nothing.

## Claude answers

Cloud session questions (24 October 2026, Claude design lead): all seven approved
as built. The badge is raised by stopping beside it, with no F and no bag; parts
wait for the badge; the five parts (the badge included) pay 100 each, the car 500
and the cup 1,000, 2,000 in all; the extra events (`echoSeconds` on `deepSonar`,
`relative` on the blip, `deepLiftCancel`) stay; the car's speed is read in mph
with the 3 km/h limit converted; the Coast Cup is paid once by SIRENA-CAR through
`recordCoastCup`; and the changed assertions in `test-save-fixtures`,
`test-deep-save` and `test-deep-look` are reviewed as fine. THE_DEEP 6.2 now says
the badge comes up when you stop beside it.
