# EVERBURN-REMAKE slice 6b

The camp sleeps until its fence burns, the scout arrives, or a Hard scoop wakes it; awake it charges within its road limits.
The scout sounds `world.ashmen.horn`, runs to camp, and wakes its rider; flame or a ram stops it as a wreck.
The ram uses closing speed and `world.ember.spark`; a 15 km/h meeting costs 2.1 fire on Medium.
Rook's three new scout lines are captions only; the chase line and map mark appear while it runs.
Cinder and forge rings are drawn above the road from 40 m. The loaded picture scenario parses in Node.
On e069cde4f, Easy Hot Delivery passed 10/10: scout stopped, camp awake, 68.16 fire and 3 rams.
On e069cde4f plus this test change, the scooped bed without scout arrived with 35.86 fire and no rams; without a scoop: 14.24 and no rams.
The existing bed drive alerts the scout: with a scoop it arrives with 9.51 fire and 2 rams; without one it runs out. The job suite fails there.
Claude must decide what the proof drives do about the scout. The original failing assertion remains.
The 1,430 m chase takes 73.5 s at 70 km/h or 93.6 s at 55; catching a 250 m head start needs 82.2 or 64.6 km/h respectively, on a straight ideal run.
Earlier rule and ring checks passed; audio passed outside the sandbox. Final checks and measured table remain.
Changed assertion, for Claude: camp scoop wake uses Hard instead of Medium and checks persistent waking; charge setups use a burnt fence. No tolerance was loosened.
For Claude: decide the proof drives, record the three Rook lines, take the browser pictures and drive the chase by hand.
Removed: automatic camp pursuit while asleep and charging through a standing fence.
