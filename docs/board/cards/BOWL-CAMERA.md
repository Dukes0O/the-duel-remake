# BOWL-CAMERA

The short board entry controls current state, ownership, dependencies and locks.

A steady camera for the Bowl. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 5. Kyle, 20 November 2026: "the camera
changes angle in jerks during events". Claude's card: it is judged by feel.

**The cause, found by hand:** `src/render3d.js` stands the chase camera behind the truck along the line of the lap. When
the truck crosses the end of the Spine or turns round, its place on the lap jumps and the camera jumps with it; near a
wall or outside the arena the truck leaves the picture.

## What to build

1. **`src/bowl/bowl-camera.js`:** a function from the truck's recent path to a camera pose, with no graphics in it, so that
   it can be checked without a screen. It stands behind the truck along the way the truck is travelling (not the lap, not
   the nose), turns at no more than 120 degrees a second, ignores changes under 8 degrees, and holds its angle under 5 mph.
   In the air it draws back and up with height (8.7 m behind on the ground, 14 m at 10 m up) and never tips with a flip.
   Every change is eased over at least 0.4 seconds. It rises over a wall, the fence or the stands when one is between it
   and the truck (as `src/world-job-camera.js` does over machines). It follows the truck into the stands and outside.
2. **The end of every event:** the truck rolls to a stop, the camera swings a quarter of the way round it over two seconds,
   and only then does the result card come up. The Scrapasaurus's fall waits for the truck to stand on it, or 12 seconds.
3. One hook in `src/render3d.js` for a Bowl event, in the place where a world job's camera is chosen.

## Files and locks

`src/bowl/bowl-camera.js` (new), `tools/test-bowl-camera.mjs` (new), one hook in `src/render3d.js`. The result card's
two second wait is BOWL-HUD's (`src/bowl/bowl-screens.js`). Lock: `busy-game-files`.

## Checks

1. `tools/test-bowl-camera.mjs`: over recorded drives (round the end of the Spine, a turn round on the spot, a donut, a
   double flip off the Big Jump, over the wall and back through a gate) the camera never turns faster than 120 degrees a
   second, never moves more than 1.5 m between two frames, and always has the truck within the middle half of the picture.
2. Laptop only: Claude drives each event by hand in a visible window (`tools/hand-drive.mjs`) and watches for a jerk.

## Sound cues

None: this card adds no game event.
