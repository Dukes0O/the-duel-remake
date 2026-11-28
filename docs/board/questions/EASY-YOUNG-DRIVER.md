# EASY-YOUNG-DRIVER: story-only tuning hooks

The existing rates helper starts ordinary events, and the simulation receives no Water Road job marker.
Options: tune all Easy events (contradicts the card), or pass the existing Story-card job marker into the simulation.
Pick: pass that marker through the App's start hooks, validate it against the chapter's mode/venue/course, and use it only on Easy with `water-road` enabled. Warlord fights receive the same explicit story context. Each job/fight keeps its own numbers.
The rates helper will request this context and use the card's settled assisted target (about 5–7/10, never below 4/10) and child floor (2/10), replacing its superseded 8/10 assertion. Claude's assertion review is due with the handoff.

Measured: constant road pace .94 gives the child 6/10 on both roads but the assisted player still 10/10; released pace gives 0/10 and 10/10. Pick a shared two-endpoint story-rival pace range, drawn once from `rng.js` with a separate seed salt. The independent reviewer agrees this meets the card's aim without hard-coded seed outcomes or reading the driver's skill.

Ambush diagnostic: seed 8's driver stands still from 120 through 897 seconds with ammo, while its last target is 40.57 m away; firing requires less than 40 m and the helper always sets forward false. Pick a bounded walk into range using the existing keys and turn rate, with simple native-pile avoidance only where needed. Preserve latency, aim, ammo and clocks. Remeasure base and tuned Ambush with that same corrected driver; the independent reviewer requires this for a fair comparison. Longer time or lower enemy health cannot repair a driver that never shoots.

After that correction, tuned seed 1 naturally completes all five waves at arena clock 419 s with 200 fort health. The helper's 420 s observation includes the countdown and cuts it off at clock 417 s. Ambush has no game time limit. Pick a 900 s observation cap for this rates case only, so it can reach its real result; no game deadline or win assertion changes. Recheck the corrected base under the same cap.
