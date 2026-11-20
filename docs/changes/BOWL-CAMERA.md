# BOWL-CAMERA: a steady show camera in the Bowl

- **What changed:** `src/bowl/bowl-camera.js` (new, no graphics) stands the camera behind the way the truck travels, read
  from its world path, not the lap or the nose. It turns at most 120 degrees a second with every change eased over 0.4 s,
  ignores changes under 8 degrees, holds still under 5 mph, in a slow tight circle (a donut) and while backing up, draws
  back in the air, rises over the wall, fence, Spine and stands, and swings 90 degrees round the truck over 2 s when an
  event ends; a new go, or a frame drawn by another camera, starts it afresh. One hook in `src/render3d.js` (the chase
  branch), behind `titan-bowl`; the old sightline push is skipped then.
- **Settled while building:** 12 m back and 5.8 m up on the ground (the Titan's own chase distance; the design's 8.7 m is
  the car's), 17.3 m and 8 m at 10 m up. The result card's 2 s wait and the Scrapasaurus wait are BOWL-HUD's.
- **Checks:** `tools/test-bowl-camera.mjs` (new, 69 checks: seven drives in the real game, round the Spine's end, over the
  Spine, a turn round, a donut, a flip off the Big Jump, over the wall and back, the end of the Car Crush).
- **Changed assertions:** none. **Removed:** nothing; the lap-line chase camera stays for every other course.
