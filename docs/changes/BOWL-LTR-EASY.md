# BOWL-LTR-EASY

On Easy, rivals join the pursuit in stages. At time-up the driver wins if no truck still rolling has more health. Ties go to the driver. Medium and Hard still decide time-up by damage dealt.
Ten fixed seeds per weapon, starting at 1989 in steps of 101.

| Night | Chaser wins | Fights at least 75 s | Careful wins | Mean player health lost by source |
| --- | ---: | ---: | ---: | --- |
| Hammer | 6 | 8 | 6 | wall 16.4, own ram 19.5, rival ram 3.0, hammer 10.8 |
| Saw | 5 | 10 | 6 | wall 10.2, own ram 9.0, rival ram 2.3, hammer 17.8, saw 3.7 |
| Launcher | 6 | 8 | 9 | wall 10.4, own ram 18.9, rival ram 1.8, fire 11.1 |

4f58357d passed core (799), weapons and Turn Show (407). 6d9872eeb passed the corrected rivals suite, production build and 297 race, 12 combat and 63 world guards. Independent source review passed. Claude drives the merged batch.
The 30 mph and idle-loss tests apply on Medium; Easy checks its own pace and health rule. The careful gate counts valid clock wins, with a separate knockout-credit check. The idle fixture change was submitted for Claude's rule 18 review in 3efd08894.
**Removed** — the damage-dealt result at time-up on Easy.
