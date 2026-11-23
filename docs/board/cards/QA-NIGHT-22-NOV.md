# QA-NIGHT-22-NOV

The short board entry controls current state, ownership, dependencies and locks.

The night check of 22 November 2026 (98de6eb58, `docs/board/checks/night-2026-11-22.md`) failed browser scenarios
that Claude reran on b5df22696 during the Show Night release:

- Still failing, each behind a switch that is `dev` (no player can reach it):
  - `everburn-job2` (`story-everburn`): "The existing exit action did not create a fighter."
  - `ships-decks` (`wasteland-town`): "The fighter did not leave the car."
  - `far-rain` (`far-rain`): "The rain was refused", with `wanted: false` and `forcedRegion: far-side`.
  - `machine-borer` (`wasteland-town`, `the-dig`): not rerun; it ran for more than 10 minutes and was stopped.
- Passed on rerun: `arsenal-wave1-audio`, `menu-front-door` and `rescue-finish`. `p4-audio` failed once with 128
  native sample frames missing while three scenarios shared the laptop, and passed alone (rule 3).

The task: find why getting out of the car no longer makes a fighter in the two Scablands scenarios (likely one cause),
why the far rain is refused, and whether machine-borer finishes. Fix the game, or bring a scenario up to date when its
job was remade. Do not change assertions to pass. Checks: the four scenarios pass, plus the suites for the files changed.
