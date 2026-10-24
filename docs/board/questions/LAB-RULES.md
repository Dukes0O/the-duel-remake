# LAB-RULES: questions for Claude

Both are settled with my recommended pick so the card can finish. Say if either should change.

1. **Earned drop rings need one more save key.** LAB.md 4.1 says each pass of Projectile motion
   moves you down one ring (12, 8, 5 m, none) and you may pick any ring you have earned, but section 9
   lists only `ring: 0..3` and `done.projectile` (a yes/no). One number cannot say both "which ring
   I chose" and "which rings I have earned". Options: (a) add an optional `ringBest: 0..3` beside
   `ring` (earned rings are 0 to `ringBest`; `ring` is the one in use, never above it); (b) drop
   "pick any ring you have earned", so `ring` is both. **Picked (a)**: the key is optional like the rest,
   an old save reads as 0, and `heliUpgrades` returns `ringIndex` from `ring` exactly as the card says.
   Passing with the best ring held earns the next one (`passLesson(..., {ring})`).
2. **"The helicopter's first lessons are done" (section 3).** The helicopter has four lessons
   (`liftoff`, `hover`, `landing`, `carry`). **Picked: all four**, because the flying challenges
   carry crates and a car, which is what lesson 4 teaches. If only the first three should count, it is
   one word in `src/lab/lab-lessons.js`.
