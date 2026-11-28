# HOME-GROUND-3: remaining narrow hooks after Claude's answer

**Resolved, 27 November 2026:** Claude approved both follow-up questions in `5a5a90146`, now merged into this lane.
The builder is adding the three load-weight hooks and the older-home migration backup check with its tests.

## Round 2: the truck's drawing gate

`workVehicleToDraw` in `src/town/view/work-vehicle-view.js` still returns null whenever `wasteland-town` is off.
An outing with `home-ground` on alone therefore drives the flatbed's rules but draws the garage car. The card's
mode-only gate does not cover this view. Recommended: also allow the view for `open-roam`, vehicle `flatbed`,
and `home-ground` enabled, with the existing work-vehicle view test. The alternative leaves this card incomplete.
Asked Kyle while the approved work continues. No real saves or shared renderer edits are needed.

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
truck control will be presented as finished.

**Resolved:** Claude's answer in commit `4fa8786e1` replaces the parked truck with a separate flatbed outing. The lane
has merged that answer. Commit `2810ca2f1` implements the optional vehicle and yard button, with ownership and
switch checks, and updates the real-key scenario to choose the flatbed from the yard. Its focused outing test passed.

## The roam still needs load weight and vehicle facts

The answer permits only the `startWorkVehicle` gate in `src/arena/modes/world-job.js` to change. Inspection shows
`syncHaulVehicle` is called only for `haul` and `TOWN_STEP_KINDS`, not `roam` (lines 2292 to 2303). Its view also
does not pass the vehicle id to the home part, and the roam step carries no `loadKg`. Thus selecting the flatbed
alone cannot put a delivered load's weight on it.
Recommended pick: permit three narrow Home Ground hooks in the mode: pass the selected vehicle id and car heading
to the enabled home part; read that part's `loadKg` into the existing haul weight sync for a flatbed roam; keep the
existing foot entry/exit controls. The load drawing can read the home record without any renderer state changes.
Alternative: defer weight and truck-only pickup, which would not meet this card. The builder is doing the other
approved work while this explicit "nothing else in that file changes" limit awaits clarification.

The delivery interaction, its ordinary-car refusal and the bundle on the driven bed still need wiring once these
facts are available. The existing foot controls require F held for 0.6 seconds to enter and 0.4 seconds to leave;
the scenario uses those existing controls, with a short F press reserved for load transfer. No foot rule is changed.

## Independent save review: backup detection

The save reviewer found that `needsCareerMigration` in `src/career-backup.js` does not detect a version 1 or 2 home
being upgraded to version 3. The migration is additive and the review found no lost old values, but the save review
requires a backup before a save shape changes (also SPEC 0.4). The shared backup hook is outside this card's files.
Options: extend ownership to that hook and its tests, or assign it alongside the vehicle bridge. Recommended pick:
assign the backup hook alongside the bridge and keep this card in review until it is resolved. No real saves were used.
