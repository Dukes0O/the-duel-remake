# NIGHT-2-TRY-FIXES: questions for Claude

1. **Should other story drives also start with no countdown?** Kyle's words were "when a story drive starts". This card
   gives Night 2 only `startsAtOnce: true`, since the open land (`src/world/open/`) and Everburn belong to other cards.
   Options: (a) Night 2 only; (b) every job that starts in the open land (`job.open`) and the Everburn story jobs, set
   in their own cards; (c) every world job. **Pick: (b)**, as a one-line follow-up in those cards: a race keeps its
   countdown, a story never needs one. The work goes on with (a).
2. **A follow-up card for the camp pop.** A seeded sim showed the siege rider, driving away through the Walkers' camp,
   pushed 4.7 m in one frame out of a lean-to corner (`walkers-lean-to--5`) by the solid push-out in
   `src/sim-contacts.js`. It is not the vanish Kyle saw, and the fix is in shared contact code. **Pick:** a small card
   to steer a withdrawing rider round the camp's solids, or to ease a deep push-out over a few frames.
