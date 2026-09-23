# BUG-06 crossbow against a moving rival

Status: building. The controlled moving-rival hit band passes, but the
contact-heavy full-race sample is above it and Pacific Canyon CPU balance
still misses its separate acceptance bands.

The actual issue after BUG-07 was the CPU's instant star shield. The first
26-case front-target probe fell from 12 hits before BUG-07 to zero hits after
it. An expanded 264-case Medium probe likewise landed zero bolts; the CPU
raised its shield in 177 of those cases. With shielding disabled for a
diagnostic run, the same moving-target shots landed 140/264 (53.0%), so
changing the bolt's aim would have treated the wrong cause.

The CPU now needs to see a bolt in its forward vision cone and complete a
physical reaction before raising the shield. Easy reacts in 0.20 s, Medium
in 0.13 s and Hard in 0.07 s, with a wider cone at higher difficulty. The
existing 16 s shield cooldown remains. This lets a close or rear-approaching
bolt land; a visible front bolt with enough travel time can still be blocked.
No miss chance or hidden delay was added to the projectile. Tests show a
35 m front bolt lands before Easy can react but Hard blocks it, a 2 m bolt
beats Hard, an unseen rear bolt lands, and the shield cannot fire again during
cooldown.

`tools/test-crossbow-aim.mjs` now covers all 11 combat courses, seeds 42 and
1989, player/rival speed pairs 65/60, 90/80 and 130/115 mph, and gaps 15,
45, 75 and 105 m. The rival starts ahead and within 120 m in every case and
moves during the shot. The 35–60% assertion is applied separately to Easy,
Medium and Hard. Results: Easy **141/264 (53.4%)**, Medium **140/264 (53.0%)**,
Hard **140/264 (53.0%)**; zero rear-approach shields at each difficulty.
Overall 421/792 (53.2%) hit. By gap, hits are 198/198 at 15 m, 148/198 at
45 m, 57/198 at 75 m and 18/198 at 105 m. By player speed, they are 174/264
at 65 mph, 136/264 at 90 mph and 111/264 at 130 mph. These strata show that
long shots are still difficult, but there was no need to distort close shots
to meet the stated aggregate target.

Full-race behavior is recorded separately. The original fire-whenever-ready
Pacific Canyon Medium replay still makes 26 shots with the rival behind every
time and lands one; it is not a front-target aim check. Across 22 completed
two-lap Medium/Hard races on all 11 combat courses, a front-within-120-m
policy fired 63 shots and landed 46 (73.0%). Of those 63 shots, 43 were at
0–29 m, so that live-race percentage is dominated by near-contact shots.
`tools/measure-crossbow-races.mjs` reproduces the full-race distribution
with memory-only storage and acknowledges ticket screens.

The no-weapon Pacific Canyon baseline used the balance tool's stock Falcone
F42, Casual Wasteland, default driver, 1/30 s step, and seeds 1989–1998.
All 30 races completed. Seed 1989 recorded CPU hits of Easy 1, Medium 7,
Hard 1; Medium exceeds its 2–6 band and Hard misses its 4–10 band. Ten-seed
wins were Easy 10/10, Medium 8/10 and Hard 1/10. This branch's shield
reaction changes do not affect those no-weapon races. These misses remain
visible for the CPU balance work; no artificial hits or losses were added.

The reviewed 10-second Wasteland replay returned exactly to its pre-BUG-07
event sequence: the player fired a bolt at race time 2.992 s and hit the rival
at 3.167 s; the rival did not raise a star shield. At the end, player road
position is 186.83 m and rival position is 196.59 m. Its fingerprint returns
from `3dc3b1e6c2f21af1493770c76511e428f42cd40253594118c3918f8ddec85416`
to `3bd83970b113198294e35c9192c525a639ecf069d2ac2bd86842cb836ef2295c`
at 30, 60 and 144 FPS. The other 17 replay cases are unchanged.

The BUG-07 CPU test's instant-shield assertion changed to test visible front
bolts, reaction time, close and rear bolts, and cooldown. The original
direct-hit test remains intact. No acceptance band was relaxed. Focused
checks passed: crossbow aim 792 cases, CPU combat, combat 67 checks, and
replay 162 checks across 18 cases. The production Vite build passed. The
changed lane gate passed 154/154 suites in 373.4 s.
