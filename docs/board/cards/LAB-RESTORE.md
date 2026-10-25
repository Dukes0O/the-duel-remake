# LAB-RESTORE

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/LAB.md`; this card names the slice, files and acceptance.

Codex (needs the screen). LAB section 7 and THE_DEEP 6.2. Switches `lab` and
`the-deep` (both dev). Needs LAB-VIEW and SIRENA-CAR.

- On the Rust bench, when `sirenaState(profile)` is `waiting` and the Rust
  lesson is done: **Restore the Sirena** (2,500 credits).
- The sequence, about a minute: the crusted Sirena in a freshwater tank
  (the salt readout falls over fast-forwarded weeks), the electric current
  with fizzing bubbles, stripping, rebuilding, the red paint and the white
  stripe going on. Skippable after the first time it is watched.
- On finishing, `falcone_sirena` joins `unlockedCars`, Brian's two restore
  lines play, and the garage card says it waits at Pacific Canyon.
- `tools/test-lab-restore.mjs`: offered only in that state, paid once, the
  car owned after; with either switch off nothing shows.

Owns: `src/lab/restore.js`, `tools/test-lab-restore.mjs`,
`docs/changes/LAB-RESTORE.md`. Hooks: `src/lab/lab-view.js`. Locks: none.
Sound: `lab.fizz`, Brian's restore lines. Art: SIRENA-ART's wreck and car.

Acceptance: the test, a scenario step, lane tier, build, one review.
Removed: nothing.
