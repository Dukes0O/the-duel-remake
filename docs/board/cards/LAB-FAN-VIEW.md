# LAB-FAN-VIEW

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/LAB.md`; this card names the slice, files and acceptance.

Codex (needs the screen). LAB section 6. Switch `lab` (dev). Needs LAB-VIEW
and LAB-FAN.

- The REVERSE switch on the wind tunnel's dial, shown only when
  `secretOpen`; flipping it plays the wind-down and roar, the car on the
  rolling road dips on its springs, the scales jump, Brian's secret lines
  play, and the Project Fan blueprint pins itself to the wall.
- The blueprint page: the three true facts of section 6 and Build (15,000).
- The fan bench before building: set the fans, watch the scales read more
  than the car's weight at a standstill.
- Nothing about the secret shows anywhere before it opens (no locked row,
  no "???" on the board).

Owns: `src/lab/fan-view.js`, `docs/changes/LAB-FAN-VIEW.md`. Hooks:
`src/lab/lab-view.js`. Locks: none.
Sound: `lab.reverse`, `lab.fan`, Brian's secret lines. Art: LAB-ART's
tunnel and LAB-FAN-ART's blueprint.

Acceptance: a browser scenario with all five wind-tunnel lessons done in
memory: the switch shows, flips, the blueprint appears, Build works once;
with fewer done, no trace of it; lane tier, build, one review.
Removed: nothing.
