# LAB-WALK

The short board entry controls current state, ownership, dependencies and locks.

Codex. Design: `docs/LAB.md` section 12.1. Switch `lab-2` (new, dev).

Build 12.1 in the hangar `src/lab/lab-scene.js` already draws: first-person
walking at 1.6 m (arrows or W/S walk, left/right turn, A/D step sideways,
mouse drag looks), collision with walls and machines, the four corner signs,
the floor prompt at each machine (open, locked with its reason, or passed),
Brian standing by the last machine used with his two questions, and the door
board listing every lesson. With `lab-2` off, the Lab is exactly as today.
Use the machine's existing lesson to open its bench for now; LAB-LESSON-FRAME
replaces the bench panels.

Checks: a test that walking cannot pass through a wall or machine; a test
that each machine's prompt matches its lesson's open/passed state; a browser
scenario that walks from the door to the weighing pad and opens it with E;
pictures of the door, a corner and a machine prompt. Lane tier and build.
Removed: nothing yet (the old glide camera goes when `lab-2` goes live).
