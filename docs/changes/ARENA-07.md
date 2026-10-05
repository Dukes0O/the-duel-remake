# ARENA-07: Convoy Raid

Status: merged from reviewed source efde10ad; lane and build pass.

Claude, 5 October: stopped-view art evidence is enough for this dev merge.
CONVOY-FRAMES separately blocks release; no new frame investigation here.

One rigid 12-tonne tanker loops the Salt Flats at 55 km/h with two allied
escorts. Its three real valves have 150 armor each. Projectiles choose the
nearest valve to the measured impact; rams use the solver contact within 3 m.
Blasts reach every valve inside their radius. Other body hits only shove.
Rocket Pods, Harpoon, RPG, Bomb, Sticky Bomb and Mortar keep real hit geometry.
Ordinary car damage, Harpoon yank and tether remain unchanged.
The rig's loop driver consumes and damps real lateral and forward hit shoves,
then recovers its route. Its 12-tonne collision body stays unchanged.

All broken valves slow the rig to 35 km/h and light both roof lamps. A native
one-second roof hold plants one charge with a two-second fuse. A legal plant
keeps its fuse across either deadline. Only that charge wrecks the rig.
An unplanted 60-second window restores valves to 75 armor and speed to 55.
The rig cannot use offense, Star or UFO; escorts keep their car weapons.

Yard entry requires unlocked Salt Flats and positive Tollkeeper hold.
The mode stays dev. The approved tanker is loaded by the real renderer, not
ordinary car-kit sockets. Rendering and roof inspection do not change state.
The corrected seed-1989 recipe output is 2,287,396 bytes, 6,788 triangles and
34 draws; SHA-256 starts 949724ec. Its border and amber lamps include the
approved recipe correction, not the earlier round-three output.
Sounds reuse combat hits, arena.tell, crew.boarding.* and interface.go/lose/win.
No audio file, world signature, live game, Preview or real player save changed.

Pay uses the existing atomic owner/result path: 700 times difficulty for a
win, 40 per distinct player-broken valve for a loss, once. A win adds 25
Tollkeeper hold. Medium native App tests save 840/+25, loss 144, and failed
writes retain one Retry without early scrap or a duplicate award.

## Checks

Native Convoy: 42 cases, 390 checks pass. Includes actual entry, body immunity,
measured impacts, native Mortar landing, deadline plants, real App win/loss
and failed-write Retry. Different territory holds exposed and fixed the retry
and already-paid adoption displays; both now retain Tollkeeper hold.
Existing assertion thresholds were not changed. Eight focused existing
suites pass: 86 tests, including ordinary projectile and settlement controls.
Source review's missing rig shove was reproduced by a real Crossbow hit and
fixed with existing push helpers. Native next-tick Crossbow and Harpoon
checks now prove movement and damping, with no change to old assertions.
The new nearby-car Rocket fixture moved only its escort from 1.8 m to 0.3 m
outward from the valve: its measured blast then reaches a valve while the
rig centre remains outside. All geometry and damage assertions stay exact.
The new registry expectations add only the required dev Convoy switch.

Whole integration 2e7862fb is imported. Shared hooks retain both Convoy and
Ambush entry, event, once-only pay, HUD and renderer paths. RPGs keep Ambush
enemy/self attribution and Convoy swept impact/blast geometry. Registry and
launcher expectations name all twelve current switches; no assertion is
removed. Focused mode, pay, UI and flag checks pass 102 cases, including
unchanged Convoy 42 cases/390 checks and Ambush 35 cases/797 checks.
Current lane covers all 353 tasks: 121 initial passes, the failed delivery
check's one isolated retry, then the exact 231 unrun tasks pass. Assertions
are unchanged. Build passes in 451 ms. Narrow conflict review is clear.
Earlier browser evidence below is from be56cdd4, not relabeled as this sync.

Actual-mode browser: High and Performance, 1280 by 800, memory-only; 14
captures, no errors or warnings. Native yard choice, rig motion, roof lamps
off/on, charge win/pay and rematch timeout pass. Private port 9545 closed.
Moving 180-frame samples: p50/p95 16.7/16.8 ms in both settings; High max
50 ms with four frames over 33 ms; Performance max 33.3 ms with one.
These are moving-mode measurements, not a matched added-cost comparison.

## Removed

Stale held-hook and repeated check history was replaced by this final account.
The tanker no longer uses an ordinary Stuttgart collision shell or car-kit
attachments. Hit geometry no longer substitutes the body centre for valves.
