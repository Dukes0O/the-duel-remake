# DRIVE-LESSON-4: questions (cloud session; carried on with the recommended pick)

1. **Approach speed 40 mph (`cruiseMph`).** The Beaver Kink is curved, and the controller refuses to brake on a
   curved road, so a faster approach left no straight to brake on before the ice. The instructor cruises at 40 mph
   to the cone (36/38 mph at the gate), brakes on the straight after the Kink and is finished 6 m before the ice.
   Options: this, or move the ice (a course change). Recommended: this. Taken.
2. **The summer hairpin is steering-lock-limited.** On snow the lock at the hairpin's apex line gives about 0.043 rad/m
   against 0.049 needed, so the instructor takes the hairpin at about 24 mph and the car touches the inside cone at
   0.1 m; the plan uses a separate lock margin (1.2) from the grip margin (.85). Taken; say if you want a wider line.
3. **The dry board comes from a dry-road plan** (a copy of the road with full grip), not a fixed distance, so
   it stays right if the plan changes. It is 74 m past the snow cone, after the ice.
4. **`queued` field on the winter result.** The winter result line and the lesson's pass line both want to play;
   `stepDriveLesson` returns the result line as `radio` and the pass line in `queued: [...]`. The view card
   decides how to play them. Recommended: keep.
5. **Winter run stage name `winter`** with the instructor's winter time on the card; no streak. Recommended: keep.
