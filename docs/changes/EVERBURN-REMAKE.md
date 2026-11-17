# EVERBURN-REMAKE slice 6b
Camp wakes on a burnt fence, scout arrival or Hard scoop; its rider charges within road limits.
The scout sounds `world.ashmen.horn`, runs to camp and can be stopped; ram cue: `world.ember.spark`.
A scout home cannot be stopped; lethal damage stops it earlier, with a caption that reflects the camp state.
Rook's scout lines are captions. The chase line and map mark appear while it runs. Both rings show from 40 m.
On e069cde4f Easy Hot Delivery passed 10/10: scout stopped, camp awake, 68.16 fire, 3 rams.
Job checks passed on 9c7150b3e and with the added external-damage check: lost chase rams 2 at 30 km/h and 1 at 70; proof drives start with scout stopped.
Medium fire / rams / awake: East 25.57 / 4 / yes; bed with scoop 35.86 / 0 / no, without 14.24 / 0 / no; plates 33.35 / 0 / no; salt 47.44 / 0 / no.
A 1,430 m chase takes 73.5 s at 70 or 93.6 s at 55 km/h; a 250 m lead requires 82.2 or 64.6 km/h to catch on an ideal straight.
On be2116098 lane 127/144: 15 FFmpeg sandbox failures and P4 passed outside; size passed alone, then took 470 ms under load.
On 9c7150b3e changed-file suites 78/79; tollkeeper could not launch FFmpeg (EPERM). Build passed. Replay fingerprints: 297 checks, combat 12.
Changed assertions for Claude: scoop waking Medium to Hard; charge uses burnt fence; scout post follows the moved road at 900 m and 8 m right. No tolerance loosened; Hard pursuit assertion restored.
For Claude: finish FFmpeg checks, review assertions, record Rook's four scout captions, take loaded browser pictures and drive the chase by hand.
Removed: automatic camp pursuit while asleep, charging through a standing fence, and stopping a scout already home.
