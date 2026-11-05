# LAB-TARGETS

Claude, 4 November 2026. Kyle: "there is no visible target on the pendulum lesson when flying the car... no targets at
all to arrive at and no indication where to land." He was right: the Pendulums challenge scored against a real spot 500 m
away and drew nothing there, with no arrow and no map mark.

## What changed

- The challenges' targets are named by `challengeTargets` in `src/lab/lab-challenges.js`, and the session's view carries them with
  a bearing and distance to the nearest.
- **In the world:** each target has the ski pads' tall light column and a ring the size that counts. Orange marks a place, and blue
  marks the lake to fill the bucket from. The column goes out within 40 m, as a ski pad's does, and the ring stays.
- **On the instruments:** a line under the compass, such as "SET THE CAR DOWN HERE 045° 480 m".
- **On the pilot's map:** a flag for each target, in the ski pads' manner.
- **By challenge:** Pendulums has its drop spot. Projectile and Fire show the lake while the bucket is empty, then the unhit buoys or the
  practice fire. Air and altitude starts with the arrow on Summit Run and shows the landing ring once there. The goal lines say
  all this in sentences.
- **Lift and weight** hovers over the home pad, which is in plain sight. **Headings** has no light on purpose, because finding its smoke by
  heading alone is that lesson.

No rule changed: the same spots and radii are scored as before.

## Removed

Nothing. The "within 25 m" figure leaves the goal line, because the ring now shows it.

## Changed assertions (Claude's review, rule 18)

`tools/test-lab-challenges.mjs`: the retry reason for a wrong place moves to the new sentence, with the same check. Added: a test of every
challenge's targets. `tools/scenarios/lab-classroom.mjs`: added a check that the target and its line show. Nothing is loosened.
