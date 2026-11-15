# QA-ROUND-SOLID-HEADING

Found by Codex on 15 November 2026 while building the dead trees along the dry river (SCABLANDS-LAND, lane `dead-trees`).

A car that passes 2 m from the centre of a round trunk 0.9 m across, without touching it, is slowed as if it had hit: with
seed 1989, tree `tree:0:-1:0`, a car moving north from 5 m south of the trunk to 5 m north of it, 2 m east of its centre,
went from 10 mph to 4.7 mph. The shared collision sweep turns the car's envelope into the solid thing's own heading before
testing an ellipse. A round thing has no heading that matters, so the answer must not change with it. The same fault would
touch every round solid that carries a seeded heading (boulders, posts, poles).

The trees avoid it for now by giving their trunks' solid shapes a heading of 0. That is a way round, not the cure.

## What done looks like

- For an ellipse whose two half-widths are equal, the sweep gives the same answer at every heading of the solid thing. For an
  ellipse that is not round, the car's envelope and the ellipse are tested in one frame, correctly.
- A test drives a car past a round post at 1.5 m, 2 m and 3 m with the post's heading at 0, 45 and 90 degrees: touched or not
  touched is the same at every heading.
- Replay fingerprints do not move (no race has a solid thing of this kind). If one moves, stop and say which.
- The trees' trunks get their seeded heading back, and their passing test is run at three headings.

## Checks

`node tools/test-scablands-solid.mjs`, `node tools/test-scablands-things.mjs`, both replay suites, the lane tier.
