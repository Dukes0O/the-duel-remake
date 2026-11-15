# Tunnel trial, round 1: a 100 m bore through the west scarp, and open air under two decks

Sheet: `round-1.jpg` (top row: the low mouth, inside, the high mouth, the ground above; bottom row:
the Girder Bridge from the bed, the Pipe from the bed, the bore half cut with its closed face, the
chase camera inside). Pictures from the real game in a visible browser window on the QA page with
memory-only saves, Performance, taken 15 November 2026 with scenario
`tools/scenarios/tunnel-trial.mjs`. Codex built the trial; Claude judged it, and drove it by hand
in real time (`tools/hand-drive.mjs`).

## Verdict (Claude): the trial passes. Go for the boring machine, with one rule added.

Against the pass list in `docs/MACHINES.md` section 11:

- **It looks like a tunnel from both ends.** From the foot of the scarp the mouth is a clean
  round opening in the rock, the bore is lit inside, and the far mouth is a dot of daylight
  through 100 m of hill. Driving it in real time: dark, then the disc of light grows, then the
  plain. That is the feeling the machine is for.
- **Nobody falls through.** A Falcone and a Titan drive it both ways on its floor (floor error 0
  and 0.71 m in the browser, inside the 1 m allowed); walls, crown, joints, bends and a closed
  face hold in Codex's tests.
- **A car on the hill above is not affected** (test, and the picture from above).
- **The frame time holds:** 18.1 to 18.2 ms at the 95th share in all twelve views, with other
  jobs running. This is not a counted frame check; none is asked of a thing no player can reach.
- **The save stays small:** a tube is 131 bytes. No tunnel is saved yet.

**What the drive showed that the pictures did not.** At the upper end the bore comes up under
level ground, and its crown breaks the surface for some 30 m before the mouth: from above it is a
long pale spindle lying on the plain, and from beside the mouth a pipe on the ground. A tunnel
cannot end in level ground. **The rule added: a tunnel begins and ends in a face.** A mouth is
made only where the ground rises the bore's full height within 12 m (a scarp, a mesa's side, the
Ridge, or the end wall of a cutting dug first with the excavator). Where there is not that much
cover, the machine stops and says so.

## The method, settled

One rule of floors for decks and tunnels (an actor stands on the highest floor not more than
0.6 m above its feet). The ground is cut only at a mouth, never along the bore, so a tunnel costs
the same to draw however long it grows; the scene follows the tunnel as it is cut. A real cut of
the ground's mesh is not needed and was not built.

## Open air under the decks (the land's own gain, no switch)

From the river bed the Girder Bridge now stands on its piers and the Pipe on its posts, with sky
beneath; a car drives the bed under both. This cures the dead end recorded in slice 2b.

## Short of right, for the machine's own card

- The lining is a plain tube lit by the sun through the rock; it needs rock, rings, lamps and
  darkness. The mouth needs its portal. Both are Claude's to draw.
- For the first second after the car is set down outside the mouth, neither car nor mouth showed
  in two of Claude's pictures; from the same place a moment later both did. Not explained.
- The trial tunnel exists only when a scenario sets it. Nothing of it is on the land.
