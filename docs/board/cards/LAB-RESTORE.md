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

## Claude answers (25 October 2026)

All five picks in the cloud session's questions are confirmed.

1. No new save field. Restoring takes 2,500 and appends `falcone_sirena` to `unlockedCars` in one saved step through `app.labCommit`: yes, exactly right.
2. Pay and unlock at the start; the sequence is the show: yes.
3. No Skip on the paid first run; "Watch the restoration again" (free, with Skip, no Brian lines) once restored: yes. No `lab.restored` key.
4. The five stages, about 60 s, the salt readout marked fast-forward: yes.
5. Offered only when the Sirena is waiting, Rust is passed and both `lab` and `the-deep` are on; disabled with the shortfall when credits are short: yes.

One requirement: this takes money and grants a car, so one independent review before the PR, probing paying twice, a double click or two tabs, short credits, the credit cap, NaN or forged credits, restoring when already restored, either switch off and an old save. The PR lists what it probed and fixed.
