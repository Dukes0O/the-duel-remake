# WASTELAND-GATE-ROAD-LOOK

- Round 2 follows Claude's written 24 m dusk finding on `90a16a8dd`. The centre lamp now lights the photographed gravel and tyre impressions across 7.3 m of the 9 m opening, with a smooth 5.5 m reach in either direction.
- On runtime commit `ef3e7f85c`, fixed 1280 × 720 chase pairs use the actual gate, East Road, Falcone, road textures and lighting. Centre luminance rose 3.10× at 24 m and 3.12× at 5 m in dusk, and 1.46× at 24 m in daylight. All sampled road pixels outside the lamp matched. [Matched views, close detail and method](../board/looks/wasteland-gate-road/round-2-review.md)
- The ordinary road and photo-road shaders matched the `ea41c7aed` baseline byte for byte. The revision keeps the same vertex shader, texture calls, uniforms, tyre mask and road draw. Three repeat baseline images matched and every scene loaded all 42 resources.
- The production build passed (819 modules, 9.90 s). The selected cloud lane passed 28/29 after its isolated map rerun (1,805 checks, 33.3 ms longest slice). All 297 replay checks passed. Pacific Canyon reproduced its identical original signature on clean `ea41c7aed` (actual `09c48ae25`, expected `8f2b1d5c4`).
- For Claude to run, compare `tin-town-gate-road` on `ea41c7aed` and the revised feature head. Judge dusk from 24 m and through the turn, and daylight in Slow Ride. Hardware frame timing remains due at player reachability under rule 9.
- Laptop-only lane selections were `test-course-kit`, `test-earned-cars-ui` and `test-medals`. The runner assigned `test-convoy-tanker-art` to the overnight tier.
- Changed assertions and race fingerprints — none.
- Removed the constant-colour lamp contribution. The same road draw now reflects the sampled surface colour.
