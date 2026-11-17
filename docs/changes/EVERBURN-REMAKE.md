# EVERBURN-REMAKE slice 6

Camp post is at (2001.44, 1208.78), 4 m beyond the fence end nearest the old post, facing the yard.
At this post `test-everburn-job1` passes the Hard scoop interruption but fails the bed delivery: 3 rams, 0 fire, not delivered; the expected baseline is 0 rams and about 36 fire. The later six-second reach check did not run.
The pickup helper drives into Cinder's ring. Flame reaches the fence's near face; hit cost is 0.3 per km/h above 8, with caps and Easy half unchanged. Cinder and her road ring move together; close stops receive guidance.
Earlier checks: `test-ember-pot` passed on 1fd242a74; `test-everburn-job1` passed after the pickup helper with the old camp post, bed 0 rams and 35.86 fire.
Changed assertions for Claude: bridge road offset 0 to 5 m, along fence +25 to -12 m; 40 km/h hit 15 to 9.6, 30 km/h 15 to 6.6; 18 km/h Easy ram 7.5 to 1.5, 28 km/h Medium ram 15 to 6 and Easy 7.5 to 3.
Cap test speeds changed 28/100 to 58/150 km/h, and severe/fall test speeds 81/50 to 150, because the rate changed; caps did not change.
Cinder figure gate-relative (-8, 9) to (-16, 4), brazier (-8, 20) to (-22, 8), pickup radius 12 to 6 m, ring at (-16, 0); boundary checks 12.1/11.9 to 6.1/5.9 m. Facing is measured from the figure because it no longer shares the ring's centre.
Pictures include Cinder and the two rider approaches; the new page function parsed in Node. Claude must run the browser scenario.
Scout, world signatures, measured table, remaining suites, lane tier and build are not done. No new sound event yet.
Removed: old bridge post, centre-line-only flame check and old hit-cost rate.
