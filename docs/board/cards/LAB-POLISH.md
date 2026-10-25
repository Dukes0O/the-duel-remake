# LAB-POLISH

The short board entry controls current state, ownership, dependencies and locks.

From LAB-FINISH (Claude, 25 October 2026), the building parts before the
`lab` switch goes on:
1. Bench cameras: tighten each bench's camera so the bench fills the frame
   (on the lift bench the floor grate takes the lower third today) and no
   pillar stands close in the foreground of any bench view. One picture
   sheet of every bench view under `docs/board/looks/lab-polish/`.
2. Brian's wax line text: make the caption read "Very cold, dry snow has
   hard, sharp crystals, so it needs a hard wax. Medium snow wants a medium
   wax." (`lab.brian.wax.explain`, LAB.md 4.3). Text only; the recorded voice
   line may stay (Kyle: voice is not a focus).
3. A scripted player pass of every lesson (a test or scenario that drives
   each bench and each challenge with ordinary inputs, no perfect play) and
   a table in the change note: time to see each bench's effect (target under
   two minutes) and whether each challenge passes with simple play. Flag any
   that need a threshold change; do not change thresholds here.
Lane tier, build, lab scenarios.

## Assertion review for Claude

LAB-POLISH changes only the wax caption while keeping its recorded voice,
as requested above. `test-lab-radio` now compares that caption to the revised
LAB.md text and separately pins the original spoken text and recording hash.
Only this line may carry `spokenText`; all other lines still match their
recordings word for word. No audio hash, tolerance, count or budget is relaxed.
The voice-copy recipe reads the explicit spoken text for this kept take.
Written review pending before integration; Kyle requested commit only.
