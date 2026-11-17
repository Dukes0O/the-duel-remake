# EVERBURN-REMAKE slice 6b
Camp sleeps until the fence burns, the scout arrives, or a Hard scoop wakes it; awake it charges within road limits.
The scout sounds `world.ashmen.horn`, runs to camp and wakes its rider; flame or a ram leaves a wreck. Ram cue: `world.ember.spark`.
Rook's three scout lines are captions; the chase line and map mark appear while it runs. Both delivery rings show from 40 m.
On e069cde4f Easy Hot Delivery passed 10/10: scout stopped, camp awake, 68.16 fire, 3 rams.
On 1bbe0abc7 the job suite passed: lost chase rams 2 at 30 km/h and 1 at 70; proof drives start with scout stopped.
Medium fire / rams / camp awake: East Road 25.57 / 4 / yes; bed with scoop 35.86 / 0 / no, without 14.24 / 0 / no; plates 33.35 / 0 / no; salt 47.44 / 0 / no.
A 1,430 m chase takes 73.5 s at 70 or 93.6 s at 55 km/h; catching a 250 m lead takes 82.2 or 64.6 km/h, on a straight ideal run.
On be2116098 lane tier 127/144; 15 ffmpeg sandbox failures and P4 passed outside; size passed alone, then its known timing limit was 470 ms under load.
On be2116098 the build, focused job suites, course signatures and replays passed; replay fingerprints: 297 checks, combat 12. Scenario strings parsed.
Changed assertions for Claude: scoop waking Medium to Hard; charge setup uses burnt fence; scout post follows the moved road at 900 m and 8 m right, not a straight share. No tolerance loosened.
The final size check strengthened scout placement to 1 cm and passed it; its known timing check took 441 ms. Other results cover the prior commit.
For Claude: review assertions, record the three Rook lines, take the loaded browser pictures and drive the chase by hand.
Removed: automatic camp pursuit while asleep and charging through a standing fence.
