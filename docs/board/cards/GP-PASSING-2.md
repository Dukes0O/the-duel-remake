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

## Claude's design (24 October 2026)

Claude in the cloud (runs without graphics). Switch `cpu-racecraft` (dev).
Needs GP-RACECRAFT (merged with CPU nitro and real player pace only).
Board entry when it starts: owner `claude-cloud`, lane SIM, status ready,
locks `busy-game-files`.

**What the code shows** (`src/race-field-driver.js` on `cloud/gp-racecraft`):

- The "crowded" check for a pass lane looks from about 4 m behind the
  passing car to 30 m past the car being passed. A car already coming up
  that lane faster from further back is not seen, so a racer can pull out
  across it. Real drivers check the mirror first.
- A dive is chosen 8 to 110 m before the braking zone, and the diving car
  brakes later. The car ahead only gives room to a car that is already more
  than a third alongside at that moment; a diver that arrives at the turn-in
  point still behind its door gets turned into. In real racing the passing
  car must be alongside by the turn-in point, or it backs out.
- Passes before 10 s and the wider gap window put cars side by side in the
  first corners of lap 1, where the field is still packed: the early
  pile-ups.

**The design: four pass types, each with its own safety rule, added one at a
time.** Each is a row in one table, `PASS_TYPES` in
`src/race-field-driver.js`, on or off, so a type that fails stays off.

| Order | Pass type | Safety rule |
| --- | --- | --- |
| 1 | **Alongside a car on the racing line** (the pass lane measured from that car, not from the line) | **Mirror check:** the lane is clear only if no car in it is closing from behind within 2 s (from minus closing speed x 2 s to 30 m past the car being passed). **Commit point:** a side-by-side pass must be at least half alongside 60 m before the next braking zone, or it backs out into the following place |
| 2 | **Exit pass with the tow** | Only on the straight after a corner, only when the passing car left the corner at least 3 mph faster; then the rules of row 1 |
| 3 | **Outbraking dive** (against computer cars and the player) | **Alongside by turn-in:** start a dive only if, at the closing rate, the diver will be at least half alongside before the other car's turn-in point, and its planned corner speed is at most 3% over the corner's own speed. If it is not half alongside 20 m before turn-in, it gives up and brakes to follow. The car on the outside of a half-alongside diver leaves a car's width |
| 4 | **Wider window** (1.5 s for aggressive drivers) | Straights only, never on lap 1 before the first braking zone is passed |

No pass of any type starts in the first 10 s of a race, as today.

**The nitro start (added 24 October, after the nitro-and-pace batch).** With
CPU nitro at half strength and real-pace passing, a player who nitros off the
line still leads after lap 1 in 17 of 20 races on Panorama Ridge and 19 of 20
on Pacific Canyon (today 19 and 20). The fix is a start rule, not more
passing, so it adds no side-by-side moves:

- **Step A, nitro arms after the first corner.** Every car's nitro, the
  player's and the computer's, stays locked from the start until that car
  has passed the apex of the first braking zone on lap 1; the HUD shows
  "NITRO ARMED" then. True to real racing: Formula 1 keeps its overtaking aid
  (DRS) switched off for the first two laps after a start, so the start is
  decided by driving. Tested first, on its own, before pass type 1.
- **Step B, only if step A leaves the nitro leader above 5 of 20 on a course:**
  on lap 1 a computer car defends with nitro on a straight when the player is
  within 1 s behind (today's defend rule uses 0.5 s), still at half strength.
- **Gates:** the nitro player leads after lap 1 in at most 5 of 20 races on
  every course, with crashes, 8-or-more-crash races and early pile-ups no
  worse than the nitro-and-pace build, and race time within 2% of it. If both
  steps fail, record the table and carry on with the pass types.

**How to build it:** one bounded attempt per type, in the order above, each
30 minutes of building and one 20-race batch on the three courses
(`racecraft-rate.mjs --races 20 --jobs 4 --check`). Gating per course, as in
GP-RACECRAFT: crashes, races with 8 or more crashes and early pile-ups no
worse than the switch-off figures (mean crashes at most 10% above, pile-ups
at most off plus one), race time within 2%. A type that passes stays on;
one that fails is switched off with its table in the change note, and the
next type is tried on top of the passing ones. Report-only: CPU passes per
race, slower player passed, nitro leader after lap 1. To tell the types
apart, the batch counts which pass type, if any, each crashing car was in
during the 3 s before contact (`racecraft-rate.mjs`, a report column).

**Acceptance:** at least one type passes and stays on, or all four tables
are recorded and the card stops; switch off byte-identical (field results,
replays, random draws); `test-race-field.mjs` unchanged apart from new
cases; lane tier, build, one review of the code and numbers. Sound: none
new. Art: none. The preview for Kyle (`tools/preview-flags.mjs`) carries
whatever passes.
