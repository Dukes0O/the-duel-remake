# FAR-RAIN, round 1 (Claude, 19 November 2026)

Rendered on the laptop's GPU by the `far-rain` scenario on the merged code (`integration/wasteland` plus pull request 54),
Hot Delivery's start, High. Pictures at the first drop, at ten seconds and at full rain, from the driver's seat and the
chase camera.

**Verdict: the sky passes; the rain itself does not yet read.** The grey sky, the dimmed light and the nearer horizon make
the place feel overcast and wet, and the chase camera's lens drop reads as a drop of water. But:

1. **The first drop cannot be seen.** The first-drop and ten-second pictures look the same as dry. The arrival is the point
   of the card, so the first drop must be noticed: about 25 to 35 px across at 1080 lines, near the middle third of the
   view, held for two or three seconds.
2. **The beads read as dirt or insects.** At full rain they are small dark specks against the sky. A bead of water is never
   darker than what is behind it: bright refracted sky in its upper half, a thin bright glint, a soft darker edge only at
   its lower rim. Most beads 8 to 16 px.
3. **No falling rain shows** at full rain, against the sky or the ground. Streaks light grey at about 0.25 to 0.35 opacity,
   1 to 2 px wide, denser near the eye.
4. **The near ground does not look wet.** The first 20 m stay dry brown. Wet ground keeps about 60 per cent of its dry
   colour and mirrors the sky at a low angle.
5. **The puddles read as frost or mist**: pale speckled patches. A puddle is dark, smooth and mirror-like with a clear
   edge, showing the grey sky and the containers, with no noise inside it.

The wiper reads as a dark blade; keep it. Round 2 is a change to the look table at the top of `src/render/rain-look.js`
plus the bead and puddle drawing.
