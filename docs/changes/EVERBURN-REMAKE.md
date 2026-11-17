# EVERBURN-REMAKE slice 6

Bridge post: 12 m before the fence, 5 m to the level side; camp post still needs a safe place.
Flame reaches the fence's near face. Hit cost is 0.3 per km/h above 8; caps and Easy half stay.
A stopped car within 6 m outside either ring is told to move closer; the forge direction starts at the town gate. Cinder, her brazier and the 6 m road ring move together.
Checks: `test-ember-pot` passed on 1fd242a74; `test-everburn-job1` passed on ad5211b76 and during this change; focused ring guidance passed on this change. Bed: 0 rams, 35.86 fire. Cinder position, solids and pickup rule passed in a direct check; the job suite now stops at its old 12 m pickup driver.
Changed assertions for Claude: bridge road offset 0 to 5 m, along fence +25 to -12 m; 40 km/h hit 15 to 9.6, 30 km/h 15 to 6.6; 18 km/h Easy ram 7.5 to 1.5, 28 km/h Medium ram 15 to 6 and Easy 7.5 to 3.
Cap tests use 58 and 150 km/h in place of 28 and 100; severe and fall cap tests use 150 in place of 81 and 50. The caps are unchanged.
Camp trials: 12 m or 50 m before on either side and shoulder at 12 m either interrupt the Easy scoop or cause 3 bed rams; 20, 30 and 45 m trials also failed the bed, 60 and 75 m the Hard scoop.
Cinder assertions: figure gate-relative (-8, 9) to (-16, 4), brazier (-8, 20) to (-22, 8), pickup radius 12 to 6 m, ring at (-16, 0); the card moves them.
For Claude: camp post, scout, pictures and final checks remain; the existing driver stops outside the new pickup ring and this job forbids teaching it. World signatures are not checked yet. Browser pictures cannot run in this lane.
Sound: no new event yet. Removed: old bridge post, centre-line-only flame check and old hit-cost rate.
