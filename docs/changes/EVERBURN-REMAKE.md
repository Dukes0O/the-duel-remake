# EVERBURN-REMAKE, slice 5

- Cinder accepts a stopped car within 12 m; her brazier is 20 m left of the gate line. Fences burn along their drawn length and the job line names key 4 within 40 m.
- Wrong message cause: a weapon start triggered Rook without checking nearby danger. He now waits until fences and riders are clear.
- Gate cause: its solid door opened only below 30 km/h. It now opens on approach at any speed; its existing gate cue sounds.
- Rider cause: Easy contact used clipped final movement and halved it, giving 2.16 km/h and no jolt. Rams use closing speed, including a moving car reaching a rider.
- Riders charge near their fence, then retreat 40 m for at least eight seconds. The existing ram cue is `world.ember.spark`; no new event or cue.
- On d03465708 plus the ring check: `test-everburn-play-start` passes with 289 of 360 positions clear for a 2 m radius; `test-everburn-job1` still fails at the yard exit.
- Easy drive on d03465708: 0/10 finish; all collect the pot but fail to leave the yard, with 96.66 ember and no jolts. The car stopped 4.6 m before the yard gate, away from the brazier; the cause is not yet proved and riders were not reached.
- Changed assertions for Claude: pickup boundary 8.1/7.9 m to 12.1/11.9 m; brazier offset 7 m to 20 m and distance from Cinder under 3 m to at least 6 m; gate no longer stays shut at 30 km/h. These follow the card's rulings.
- Codex decided: none. **Removed:** the old hand-over radius, brazier position, centre-point fence target, slow-only gate and clipped rider contact speed.
- Still needed: find and resolve the yard-exit failure without teaching a driver; check older named suites, replay and world-signature suites, lane tier and build. Integration was already up to date.
- For Claude: run the browser scenario. No browser check has run here.
