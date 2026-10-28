# LESSONS-V2-RULES

The short board entry controls current state, ownership, dependencies and locks.

Build `docs/DRIVING_LESSONS.md` section 14 (14.3, 14.4, 14.6, 14.8, 14.9) in
`src/lessons/drive-lessons.js` and its tests. Read 14.1 for why: Kyle found
lessons too short, unexplained, and judged on rules he could not see.

- The section table (14.3) replaces the single-corner rows. Measure each row
  in the Falcone and the Jesko; trim or extend by whole corners to stay inside
  30 to 75 s; record the times in the change note.
- Each corner is brake, lift or flat from the instructor's plan, with its
  brake point, target corner speed and cones.
- The four steps (Watch me, Follow me, Your turn, Beat me) with 14.4's pass
  rules. Watch me returns the instructor's inputs to replay on the player's car
  (lesson 1 also returns the late clip: braking 25 m late at the first brake
  corner, cut where it slides wide or leaves the road).
- Per-corner checks and the result rows (14.6), including the one-sentence
  advice for the worst corner.
- `best` and the gold mark (14.9); old passes stay passed.
- Remove the old single-corner rows, the try 1 and try 2 stages, the
  three-in-a-row streak and their tests.
- Proofs in Node on the new sections, as before: lesson 1's late clip
  screeches at least 0.5 s or leaves the road; lesson 2's middle-of-the-road
  run is at least 0.3 s slower than the instructor; lesson 4's dry-board brake
  screeches or leaves the road and the winter instructor is faster; a scripted
  driver at 100% of the line's speed beats the instructor; a clean run faster
  than the instructor passes Your turn even with a brake zone missed.

No drawing or screen work (LESSONS-V2-VIEW). Changed assertions reviewed by
Claude in the change note. Lane tier and build.
