# BOWL-REX-FIX

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (physics and camera). Three faults from Claude's keyboard drive of the merged tow fight
(`6c320374a`, Easy, two wins in 82 s and 140 s, 20 November 2026). Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 10.
Tested and merged under AGENTS rule 23.

## What to build

1. **The back box on Easy.** About a second after the cable goes tight the beast braces, the pull stops counting, and the
   truck is dragged up against the beast with the ring a third full. The box needed three tired spells in each fight. The
   design says that on Easy the throttle alone still wins the back box in 4 seconds: the pull keeps counting through the
   brace on Easy, and on Medium and Hard a jerk or nitro restarts it as designed.
2. **The pull ring cannot be seen while pulling,** because the box is behind the truck and off screen. Show the same ring
   on the screen's strip beside the goal ("KEEP PULLING") whenever the box is off screen.
3. **The fall is not in the picture.** For the ten seconds after the third box the camera follows the truck as it drives
   off. Turn the camera to hold the falling beast and the truck together for those ten seconds.

## Files and locks

`src/bowl/bowl-rex.js`, `src/bowl/bowl-hook.js`, `src/bowl/bowl-hud.js`, `src/bowl/bowl-camera.js`,
`tools/test-bowl-rex.mjs`, `tools/test-bowl-camera.mjs`. Locks: `bowl-screens`.

## Checks

1. `tools/test-bowl-rex.mjs`: on Easy, a driver holding only the throttle takes the back box within one tired spell, in 4 to
   5 seconds of tight cable; on Hard the same driver does not.
2. `tools/test-bowl-camera.mjs`: during the ten seconds of the fall, the beast and the truck are both inside the picture.
3. Laptop only, Claude runs with the next batch drive.

## Sound cues

None new.
