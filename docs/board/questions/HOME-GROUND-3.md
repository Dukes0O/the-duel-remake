# HOME-GROUND-3: the flatbed needs a vehicle handoff

The current outing has one driven car. `src/onfoot-transition.js` measures re-entry against that car's `s` and
`lateral`; `src/arena/modes/world-job.js` starts a work vehicle only from the job definition and reads load weight
from `worldJob.job.stepState.loadKg`. Keeping the original car parked while entering the flatbed needs a second
vehicle position, an input handoff, and changes to that race state. This exceeds reading one more vehicle.

Options:
1. Extend this card's ownership to a narrowly gated open-land vehicle handoff, including the mode, foot transition
   and vehicle drawing. Keep both parked positions and apply the existing work-vehicle weight calculation.
2. Put that bridge on a follow-up card. Complete the version 3 record, load rules, footprints, stages and coop/shed
   drawing here. The real-key delivery drive remains blocked until the bridge lands.

Recommended pick: option 2. The builder is proceeding with the independent work. No substitute delivery or fake
truck control will be presented as finished. Claude must assign the bridge before this step is playable end to end.
