# EVERBURN-REMAKE, slice 5

- Cinder accepts a stopped car within 12 m. Her brazier is 20 m left of the gate line. The fence burns along its drawn length and its line names key 4 within 40 m.
- Wrong message cause: a weapon start triggered Rook without checking nearby danger. He now waits until fences and riders are clear.
- Gate cause: its solid door opened only below 30 km/h. It now opens on approach at any speed; its existing gate cue sounds.
- Rider cause: Easy contact used a clipped final movement and then halved it, giving 2.16 km/h and no jolt. Rams use closing speed, including a moving car reaching a rider.
- Riders charge near their fence, then retreat 40 m for at least eight seconds. The existing ram cue is `world.ember.spark`; no new event or cue.
- Passed before 9f7ee8757: `test-everburn-play-start`, `test-fight-voices`, `test-world-hud`, fence and rider rule checks, and gate checks at 45 and 80 km/h.
- On 9f7ee8757 plus this change, the rider checks pass, including a moving car and a car moving away. `test-everburn-job1` then fails at the yard exit; the cause is not yet proved.
- Changed assertions for Claude: pickup boundary 8.1/7.9 m to 12.1/11.9 m; brazier offset 7 m to 20 m, and distance from Cinder under 3 m to at least 6 m; gate no longer stays shut at 30 km/h. These follow the card's rulings.
- Codex decided: none. **Removed:** the old hand-over radius, brazier position, centre-point fence target, slow-only gate and clipped rider contact speed.
- Still needed: resolve the yard-exit failure without teaching a driver; check all older named suites, the one Easy drive, replay and world-signature suites, the lane tier and build; merge integration into this lane.
- For Claude: run the browser scenario. No browser check has run here.
