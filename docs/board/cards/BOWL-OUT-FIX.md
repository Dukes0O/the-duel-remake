# BOWL-OUT-FIX

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (physics and camera). Two faults from Claude's second hand drive of BOWL-OUT-SIM (20 November 2026,
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
