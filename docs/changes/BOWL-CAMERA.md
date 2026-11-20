# BOWL-CAMERA: a steady show camera in the Bowl

- **What changed:** `src/bowl/bowl-camera.js` (new, no graphics) stands the camera behind the way the truck travels (its
  world path, not the lap or the nose): at most 120 degrees a second, every change eased over 0.4 s, changes under 8
  degrees ignored, still under 5 mph, in a donut and while backing up; back and up in the air; over the wall, fence,
  Spine, stands and crowd; a 90 degree swing over 2 s when an event ends; sudden truck jumps eased out. One hook in
  `src/render3d.js` (chase branch), behind `titan-bowl`. Settled: 12 m back and 5.8 m up (the Titan's own; the design's
  8.7 m is the car's), 17.3 m and 8 m at 10 m up. The result card's 2 s wait is BOWL-HUD's.
- **Checks:** `tools/test-bowl-camera.mjs` (new, 69 checks, seven drives in the real game). Hand drive in visible Chrome
  (ports 5193/5196, memory saves): before, the view jumped across the Spine; after, it turns with the truck. The traced
  real camera stayed under 0.99 m a frame and 98 degrees a second; the end swing took 2.0 s.
- **Found:** a truck meeting the stand wall from outside is thrown 3.5 m in one step (BOWL-WALLS's area); one that crashes
  over the wall lands inside the stands, where no camera can show it (BOWL-OUT-SIM).
- **Changed assertions:** none. **Removed:** nothing; the lap-line chase camera stays on every other course.
