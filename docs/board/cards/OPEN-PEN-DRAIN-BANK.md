# OPEN-PEN-DRAIN-BANK

The short board entry controls current state, ownership, dependencies and locks.

**Found in Claude's drive of the merged batch, 27 November 2026** (`docs/board/looks/drive-2026-11-27.md`).

**What a player meets.** At the Rats' Nest, the player chooses to go in by the drain on foot. From the drain's mouth
the walk toward the pen stops after two metres against a bank of earth. There is no way through, so the break-out with
Finch cannot be done by hand.

**Measured.** Beat `drain`, mission `burned-camp/drain` active, the player standing at `drain-out` (4138.3, 2160.2)
facing `drain-in` (4104.6, 2160.0). Walking forward for six seconds moved the player 2.3 m, to x 4136.0, and no
further. The ground along the line, from `course.groundAt`: -7.7 m at the mouth, -6.8, then -0.6, then +1.5 m for 20
metres, then -1.1, -6.7 and -7.6 m at `drain-in`. A 9 m bank stands across the drain. The scenario `open-burned-pen`
passes because its `walkTo` sets the player's position directly and never walks.

**Likely file.** The cut for the drain in the land under the Rats' Nest (`src/world/open/content/burned-pen.js`
spots, and the ground cut that the Rats' Nest look joins, see the OPEN-BURNED-PEN hand-over: the Nest's look and
solids are not joined to the land yet). Check: the drain walked with real keys from mouth to pen, the ground along it
measured; the scenario walks rather than sets positions.
