# LAB-ROUND-NUMBERS

From the audit of 9 November 2026 (`docs/board/audit-2026-11-09.md`, item L4). Kyle said yes
to this card on 9 November.

The Lab went metric on 4 November by converting miles per hour, so the wind tunnel runs at
"161 kilometres per hour" and other lessons use 80, 97, 113 and 241. A child sees "twice the
speed, four times the push" far more easily at 100 and 200.

## Settled design (Claude)

- **Round numbers a player sets or reads:** speeds in steps of 10 km/h with the taught
  examples at 50, 100, 150 and 200; distances, weights and angles in round steps where the
  lesson's own sums allow it.
- **Results are worked out, never typed.** Each result on a board comes from the lesson's
  formula with the new inputs, so the picture, Brian's words and the physics panel agree.
- **Challenges and saves do not change.** A challenge's pass mark stays where it is in the
  game's own units; only the lesson before it changes.
- **One picture to check and fix:** in Downforce's opening step an arrow labelled "push"
  points up and away while the words say the air pushes the car down.
- Look through all sixteen classroom lessons, not only Downforce and Braking.

## Files

`src/lab/lessons/*-classroom.js` and their board files, tests. Needs LAB-BRIAN-SHORT first,
because both cards change the same lesson files.

## Checks

- New test: every speed a classroom lesson shows or lets the player set is a multiple of
  10 km/h.
- Lesson numbers pinned in tests are re-recorded with a one-line reason each in the change
  note (a deliberate change).
- Every `lab-*` browser scenario.
- Laptop only: Claude looks at Downforce's opening step and one changed board in each lesson
  that moved.

## Removed

The converted numbers and any sentence that explains an odd number.
