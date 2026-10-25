# RESCUE-AUTOPILOT

Split from RESCUE-HOOKS (Claude, 16 October). Design: `docs/HELI_RESCUE.md`
sections 5.5 and 7 ("Autopilot") and 11 (`tools/test-heli-mode.mjs` extended).

- Autopilot goals for rescues: fly to the search area's centre, the debris
  area or the cliff spot, stopping in a hover 40 m above the obstacles, and to
  the handover circle. Searching, setting the rescuer down and landing stay
  the pilot's. H1's obstacle height, bank limit and hand-back rule hold; with
  people on the line it also holds 20 m/s (already in RESCUE-HOOKS).
- Summit Run as a destination the helicopter can fly to: its landing zone and
  pad, as RESCUE-ENGINE's destination data (2,860 m, legs 160/150/90) says.
  With the `rescue` switch off, every existing destination, leg and test
  fingerprint is unchanged.

Owned files to be named at start (the autopilot and mode files under
`src/heli/`), tests in `tools/test-heli-mode.mjs` and the autopilot suite.

Also (from RESCUE-HOOKS, 16 October): the car recovery job shows on the board
but has no Take button. Wire taking it and flying it as an H1 car carry from
the hoist site to the landing zone, paying through RESCUE-ENGINE's
`finishRecovery` once.
