# WASTE-TRUCKS-FIT

The short board entry controls current state, ownership, dependencies and locks.

Claude's card, first in line: the night check of 26 November 2026 failed on two things the Workshop's big trucks
(CAR-DRIVE-WASTE, behind `wasteland-cars`) bring. Both are full-tier failures, which the standing list cannot hold, so
they are news every night until this card closes.

1. **The Longhaul goes through a wall.** `test-arena-shove`, SETTLED WALL pinned/player-attacker/side1/20 mph: with the
   Longhaul pinned against a solid wall, a push from any of 19 cars moves it 1.87 m outward, through the wall. Every
   other car stays solid. Likely the wall-settle rule against the Longhaul's larger hull (1.593 m half-width, 3.469 m
   half-length, six wheels). Fix the rule, not the check.
2. **The trucks cannot follow the driving instructor's line on narrow courses.** `test-lesson-instructor-any-car`:
   the Longhaul fails (contact or reset) at Panorama Ridge (corner, gears), Kogane Pass (corner) and Harbour Lights
   (line), on casual and pro; the Bully once at Ardennes Forest (corner, casual). Decide in writing: either the lessons
   offer only cars that fit the course (say so in a plain sentence when a truck is chosen), or the instructor's line
   allows for a wide vehicle. Then make the suite prove what was decided; never loosen its "clean" rule.

**Checks:** `test-arena-shove`, all four shards of `test-lesson-instructor-any-car`, the rule 23 set, the build.

## Claude answers

**27 November 2026.** Kyle ruled that the Workshop's work machines do not race the courses (`docs/board/decisions.md`).
A course race and every arena event but a Wasteland outing now refuse them, and `test-lesson-instructor-any-car` and
`test-arena-shove` check the cars those offer, so item 2 is closed and the night's two suites pass. What is left of this
card is item 1 inside the Wasteland: the Longhaul pushed against a wall on an outing must stay on its side of it. Prove
it there, with a check on a Wasteland job.
