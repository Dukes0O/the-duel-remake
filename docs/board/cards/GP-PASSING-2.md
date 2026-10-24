# GP-PASSING-2

The short board entry controls current state, ownership, dependencies and locks.

## Why this card exists (Claude, 24 October)

GP-RACECRAFT's 24 October batch (PR 2) showed that the extra CPU pass types
bring more crashes and pile-ups than today on every course. GP-RACECRAFT now
keeps only CPU nitro (0.5 strength, 0.5 refill) and judging the player by real
pace; CPU cars pass by today's rules. This card brings the removed pass types
back, safely, once Kyle has driven the racing part.

## The pass types taken out of GP-RACECRAFT

- Pulling alongside a car that is on the racing line (pass lane measured from
  the other car, not from the line).
- Outbraking dives against the player, and exit passes using the tow.
- A gap window up to 1.5 s for aggressive drivers, and passes before 10 s.
- Pass planning that counts CPU nitro speed in the closing rate, and a wider
  look-ahead for cars already in the pass lane.

## Open design question (Claude, before any code)

Which of these pass types causes the extra crashes and pile-ups (add them back
one at a time, each against the per-course crash, 8-or-more-crash-race and
early pile-up numbers in `docs/board/cards/GP-RACECRAFT.md`), and what safety
rule lets them stay: for example a clear-lane check that also looks behind and
beside, or no side-by-side pass starts within a set distance of a braking zone.
Targets are the same as GP-RACECRAFT: no worse than today per course on
crashes and pile-ups, race time within 2%.
