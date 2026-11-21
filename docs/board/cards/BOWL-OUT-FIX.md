# BOWL-OUT-FIX

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 21 November 2026: Sol builds all the Bowl fix cards; none needs heavy physics).
lane `ba9617c55`). Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), sections 3, 5 and 8.

## What to build

1. **The gate guides turn a truck in.** Today a truck that meets a guide with no steering is thrown back out (Pit Gate, near
   side: 21 to 8 mph and rolled back into the car park), or knocked onto the other diagonal and creeps in at 5 to 7 mph, and
   a truck aimed 4 m past the middle bounces off the guide (19 to 11 mph). A guide is a scrape by the wall rules: the truck
   slides along it into the tunnel, keeping most of its speed.
2. **The camera never sits inside a wall and never loses the truck at the gates.** At a gate mouth, in the tunnels and after
   a guide bounce, the camera today is inside the stand back or above the terraces looking at the crowd. When the stands lie
   between the camera and the truck, the camera comes in low behind the truck, under the tunnel roof, until the truck is
   out on the floor or in the car park.

## Files and locks

`src/bowl/bowl-outside.js`, the gate-guide contact in `src/sim-contacts.js` (the hook BOWL-OUT-SIM already uses), `src/bowl/bowl-camera.js`,
`tools/test-bowl-out.mjs`, `tools/test-bowl-camera.mjs`. Locks: `bowl-floor`.

## Checks

1. `tools/test-bowl-out.mjs`: from both sides of both gates, a truck at 20 mph and 45 degrees off line with no steering goes
   in at 15 mph or more; one aimed 4 m off the middle goes in too.
2. `tools/test-bowl-camera.mjs`: through each mouth and tunnel, in both directions, the truck is never hidden for more than
   0.2 s and the camera is never inside a solid; every existing limit is unchanged.
3. Laptop only, Claude runs: by hand through both gates, steered and not steered.

## Sound cues

None new: the guide uses the wall scrape's existing cue.

Behind `titan-bowl`. Builder's checks, then the lane tier and `npm run build`, recorded in `docs/changes/BOWL-OUT-FIX.md`
with a Removed line. Memory-only saves. No new dependency, network request or key.

## From BOWL-OUT-LOOK (Claude, 20 November 2026)

- The drawn stands now stand where the rules put them. `bowlSolidTop` in `src/bowl/bowl-camera.js` still copies the old
  drawn sizes (a 6.2 m podium, rows 3 m higher, the back 1.5 m further out), so the camera rises over stands that are
  no longer there. Read the sizes from `BOWL_STAND` in `src/bowl/bowl-stadium.js` (or `terraceHeight` in
  `src/bowl/bowl-outside.js`) instead, and leave the gates' openings open: the tunnel is 8 m wide with a ceiling at
  4.8 m from the fifth row (28.2 m out) to the stand back, and the first four rows and the walkway are cut away over it.
- Seen in the hand drive at both gates: from the mouth in the stand back to the floor the camera is above the terraces
  and the truck is hidden for about two seconds.

## Added from Batch drive 2 of the merged game at `fb02d3233` (20 November 2026; pictures in `.evidence/2026-11-20/batch-2/` of the integration folder)

3. **The arena wall can be driven over on the ground.** At about 40 mph and a steep angle (lap 133 to 143 m) the truck rode
   up the wall onto the stands with no ramp, in Freestyle and in the Scrapasaurus fight (`n5-free-wall-control.jpg`).
   BOWL-OUT-SIM's own check says a truck on the floor cannot cross the wall on the ground anywhere but the gates. The way out
   is a jump, and only a jump: that is what makes it a find (decisions, 20 November). Check: from every 5 m of the wall's
   length, a truck driven at 20 to 60 mph at 30 to 90 degrees to the wall, wheels on the floor, stays inside.
