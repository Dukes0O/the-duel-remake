# LAB-TUNE-VIEW

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/LAB.md`; this card names the slice, files and acceptance.

Codex (needs the screen). LAB section 5. Switch `lab-tuning` (dev). Needs
LAB-TUNE.

- A **Tune** page for each car in the garage: one row per opened setting,
  five steps from -2 to +2 with the two ends named as in 5.1 ("Less wing"
  and "More wing"), Reset, and one plain line under each saying the trade.
- The Time Trial results card: the stock lap and, with tuning, "Tuned lap:
  1.4% faster than your stock lap. Bonus 400." (or how far off it was).
- The pit board in a Grand Prix offers fuel when the half tank is running.
- Browser scenario: set a wing step, run a Time Trial lap, see the line.

Owns: `src/lab/tune-view.js`, `src/lab/tune-ui.css`, the scenario,
`docs/changes/LAB-TUNE-VIEW.md`. Hooks: `src/screen-garage.js`, the
results screen, the pit board. Locks: none.
Sound: existing interface sounds. Art: none.

Acceptance: the scenario; the screens never change race state; lane tier,
build, one review. Removed: nothing.
