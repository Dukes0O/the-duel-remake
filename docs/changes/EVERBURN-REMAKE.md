# EVERBURN-REMAKE slice 6

Restored the camp rider's integration post; its revised reach test and the scout move to the next slice. The bridge shoulder post and its reach test stay.
Flame reaches a fence's near face; hit cost is 0.3 per km/h above 8. Cinder, her brazier and pickup ring moved together beside the road; close stops get guidance and the proof pickup drives into the ring.
Changed assertions for Claude: bridge road offset 0 to 5 m and fence along +25 to -12 m; 40 km/h hit 15 to 9.6, 30 km/h 15 to 6.6; Easy 18 km/h ram 7.5 to 1.5, Medium 28 km/h ram 15 to 6, Easy 7.5 to 3.
Cap test speeds 28/100 to 58/150 km/h and severe/fall speeds 81/50 to 150 reflect the lower rate; caps remain unchanged.
Scablands-size also checks those bridge and Cinder positions as land moves. Cinder figure gate-relative (-8, 9) to (-16, 4), brazier (-8, 20) to (-22, 8), pickup and ring (-8, 9) to (-16, 0), radius 12 to 6 m; boundary 12.1/11.9 to 6.1/5.9 m; play-start ring clearance sampled at 6 instead of 12 m. Facing now uses the figure.
Checks: job1 and Easy Hot Delivery 10/10 pass on 9a270483b; world composition signatures and build pass on e473a6357. Scenario page expressions parse in Node.
Measurements (fire / rams / jolts / scoops): Medium East Road 40.91 / 3 / 3 / camp; bed 35.86 / 0 / 0 / Wash; plates 33.35 / 0 / 0 / none; salt pan 47.44 / 0 / 0 / none. Easy East Road 69.29 / 3 / 3 / camp (10 seeds).
Lane on e473a6357: 92/95 pass. Review-evidence, tollkeeper and p4-audio fail twice: ffmpeg EPERM. Scablands-size had old position assertions and a 526 ms timing failure; updated positions pass, timing remains 412 ms alone. Claude: browser scenario and these failures. Other short related checks pass. Blender output exceeded three minutes and was stopped. Night-only: Old Smoke, field battle, first-person cloth and polish, Rook candidate, run-gas-medium. No new event or sound cue.
Removed: old bridge post, centre-line-only flame check, old hit rate and the camp's temporary post and reach check.
