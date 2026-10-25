# LAB-VIEW

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/LAB.md`; this card names the slice, files and acceptance.

Codex (needs the screen). LAB sections 2, 3, 4 and 8. Switch `lab` (dev).
Needs LAB-RULES, LAB-BENCHES, LAB-ART and LAB-RADIO.

- **Entry:** a Lab tab in the garage and a Lab door on the helipad's board;
  no main-menu button.
- **Board:** the shared lesson board (`src/lessons/lesson-board.js`) with
  the four groups; each lesson shows open, done ("Retake") or "Opens ...".
- **Benches:** the Lab room with the camera moving to each bench; the
  bench's controls and Run button; its result readout; Brian's lines with a
  caption strip; "Try the challenge" when the bench's goal is met.
- **Workshop challenges** on the bench (strength hook arm, rust
  protection, launch target) and the **G-force lap** (any owned course, a
  g readout, pass at 2 g in three different corners without leaving the
  road), using the race's own numbers read-only.
- **Shop:** each opened upgrade with its price, Buy, owned marks; the ring
  and cable choices.
- Browser scenario (private port, memory-only storage): open the Lab from
  the garage, run the lift bench, pass a workshop challenge, buy an
  upgrade.

Owns: `src/lab/lab-view.js`, `src/lab/lab-ui.css`, the scenario,
`docs/changes/LAB-VIEW.md`. Hooks: `src/screen-garage.js` (the tab),
`src/heli/heli-ui.js` (the door; one line, Claude's file: say so in the
change note), `src/app.js`, `src/render3d.js` (the Lab scene). Locks:
`busy-game-files`.
Sound: the bench cues named in LAB-BENCHES; Brian's lines.
Art: LAB-ART.

Acceptance: the scenario; screens never change race or helicopter state
except through the Lab's own save calls; lane tier, build, one review.
Removed: nothing.

## Carried from LAB-HELI (Claude, 24 October)

- Pass `labEnabled: flags.enabled('lab')` to `createHeliSession` in `src/app.js` so the Lab upgrades act in the game.
- The fire view's litre bar divides by a fixed 600 (`heli-fire-view.js`); use the bucket's own `holds` so the bigger bucket fills the bar.
- Draw the pad actions the session offers (`loadBucket('water'|'retardant')`, `chooseLine(15|25)`).

## Carried from LAB-HELI-CHALLENGES (Claude, 24 October)

- Draw "Try the challenge" on the Lab board and the pad menu from the session's `challengeBoard()`, `startChallenge(id)` and `stopChallenge()`.
- Draw `view().challenge.props` in the scene (buoys, the smoke marker, the crate, the practice fire grid) and show `view().challenge.briefing`.
