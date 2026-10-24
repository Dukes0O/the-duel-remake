# LAB-HELI-CHALLENGES

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/LAB.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). LAB sections 4.1 and 4.2 (the
challenge column). Switch `lab` (dev). Needs LAB-HELI.

The six helicopter challenges as goals in the helicopter session, checked
like the flying lessons (`src/lessons/lesson-core.js` answers):

- **Lift:** the Dusthawk on the hook, full tank, hover 10 s at 2 to 5 m over
  the home pad.
- **Projectile:** three buoys on the home lake (new props, placed clear of
  the scoop area), each hit by a drop within 5 m; passes per ring size and
  moves `lab.ring` down one.
- **Fire triangle:** a practice fire beside the home pad, seeded the same
  every time; pass if it has not reached the road after 3 minutes.
- **Pendulums:** a car carried across Tremblant Woods and released with the
  car's swing under 1 m.
- **Air and altitude:** a 300 kg crate to Summit Run, landed with at least
  30% fuel.
- **Headings:** a smoke marker in the woods at a set bearing and distance
  from the home pad; the arrow and autopilot are off for this flight; pass
  within 30 m of the marker below 20 m height.
- Start them from the Lab board ("Try the challenge") and from the helipad.
  Leaving or crashing ends the try with no cost beyond the usual repair.
- `tools/test-lab-challenges.mjs`: each goal passes for a scripted good
  flight and fails for a scripted bad one; the same inputs give the same
  answer.

Owns: `src/lab/lab-challenges.js`, `tools/test-lab-challenges.mjs`,
`docs/changes/LAB-HELI-CHALLENGES.md`. Hooks: `src/heli/heli-session.js`
(the goal step and the props list). Locks: none.
Sound: `heli.buoy-hit` for a buoy hit; the existing lesson pass sound.
Art: buoys, the smoke marker and the crate reuse existing props (rescue
crates, fire smoke); a plain orange buoy from a CC0 library if none exists.

Acceptance: the test, existing heli suites unchanged, lane tier, build, one
review. Removed: nothing.

## Claude answers

Settled 24 October: all eight answers in the question file are approved as built. The practice fire spreads one step
every 20 s because a practice should be winnable; the mission fire is untouched. The `heli.buoy-hit` cue is
registered and made on LAB-RADIO; the board's "Try the challenge" button, the pad menu and the scene's drawing of
`view().challenge.props` are on LAB-VIEW. `tools/test-heli-mode.mjs` has a hooks-object entry for
`src/lab/lab-challenges.js` that allows helicopter rules files only, not drawing files.
