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

## Scope after looking through all sixteen (Claude, 9 November)

- **Changed: Braking, Downforce, G-force and Fuel.** These four hold their speeds in the game's
  miles per hour and show the converted number (80, 97, 113, 161, 241 km/h).
- **Left as it is: Launch.** Its dial steps in whole metres per second (13 to 24 m/s), which is
  the unit of its sums, and shows the km/h beside it (65, 72). A dial in tens of km/h would
  leave four settings where the lesson needs twelve. A later card may show that dial in m/s.
- **Already round:** Headings (50 m/s, 180 km/h), Projectile (5, 10, 15, 20 m/s), Pendulums,
  Strength, Rust, Fire, Lift, Altitude, Ski wax, Grip and Suspension show no converted speed.
- The new test is one check in each changed lesson's own test file, not one shared file.

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

## Claude's review of the changed assertions (rule 18)

Two tests compared a lesson's numbers with a bench run at the same speed. A bench snaps a speed to its own steps of 10 mph, so
that comparison cannot hold for a dial in km/h. Each test now compares the lesson with the rule the bench runs on at the exact
speed, and also checks that the bench equals that rule on its own steps. Nothing is loosened; the lists are in
`docs/changes/LAB-ROUND-NUMBERS.md`.

## Result (Claude, 9 November 2026)

Done; see `docs/changes/LAB-ROUND-NUMBERS.md`. Braking teaches with 100 and 200 km/h, because the rounded stops from 50 and
100 do not multiply out to four times on the page.

## Removed

The converted numbers and any sentence that explains an odd number.
