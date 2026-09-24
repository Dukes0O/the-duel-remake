# EGG-01: Hidden Road geometry and protected driving

Status: ready for independent review and lane/build gate.

## Changes

- Added the `hidden-road` dev switch. Pacific Canyon routes A, B and C get a separate 1,050 m world-space corridor when explicitly enabled. Its mouth is at race distance 1,408 m, right lateral offset 8.5 m, outside the Mojave Canyon bend. It is not a racing shortcut.
- The first 750 m wind through a dry wash. The final 300 m are straight. A widening around 95 m lets every car turn around before the later 150 m departure point. The salt-flat approach widens to 240 m across.
- Prepared dirt handling and physical world-space steering apply to the player. Corridor positions bypass boundary/water resets and lap-gate processing. A returning road car retains its physical heading until it aligns with the asphalt lane. NPC routes, map geometry and ordinary surface rules stay separate.
- The corridor is built after normal scenery generation, preserving the racing RNG stream. Complete scenery footprints are cleared from the drive. Solid wash banks have a full-box clearance check against the main road and its shoulder.
- Added temporary wash banks, tire ruts, an unlettered leaning post and dead cacti. These are playable geometry assets, not the final Blender fidelity family. Rustwall, gate ceremony, departure settlement and discovery persistence remain in their own cards.
- Fixed renderer world reuse: an ordinary menu world cannot satisfy a flagged Hidden Road race. The key adds a stable `hidden-road-v1` marker only for flagged course geometry; flag-off keys remain byte-identical.
- Replaced coarse ground faces intersecting the wash with a fitted patch. The existing grid otherwise bridged over the clear physical corridor. Face selection is limited to progress beyond 40 m and corridor width plus 32 m; the fitted patch extends 80 m beyond either side and beyond the terminal cap. Both replacement and patch exclude the complete racing-road footprint plus 4 m shoulder, including triangle edges crossing that strip. Flag-off terrain geometry is unchanged. The patch uses nine cross-section columns at 2 m intervals: 9,824 triangles on A and 9,822 on B/C after clipping.

## Tests and browser evidence

- Independent red suite `c60faad`: all 31 Hidden Road acceptance groups now pass unchanged. This includes ABC geometry, full Titan hull clearance, all nine car types, player-only reset protection, outside water/land controls, untouched map/AI/RNG fingerprints, lap safety and shared-time 30/60/144 Hz movement.
- `node tools/test-replays.mjs`: 162 approved ordinary replay checks passed; no replay fixture was changed.
- `node tools/test-feature-flags.mjs`: 26 checks pass.
- `node tools/test-render-reuse.mjs`: 174 checks pass, including the additive ABC patch/road raycast regression.
- All nine cars physically completed the production-input U-turn at 95 m and drove back onto asphalt in the scenario helper. Turn times were 7.61–11.53 s; the return was 13.86–14.17 s. Zero boundary resets, major crashes or residual impacts.
- Full private browser scenario: `.qa-dist/browser-output/hidden-road-2026-09-24T05-37-55-272Z/report.json`, port 38841, memory-only storage, 33 ABC High/Performance screenshots, zero console warnings/errors. It verifies the actual Hidden Road scene replaces the ordinary menu scene, solid wall contact, a complete outbound drive, and an actual steered turn/return on every route. The nine images named below are superseded by corrected review captures; the remaining valid views are retained.
- Outbound production drive: 1,030 m from initial placement at 15 m to 5 m before the end, 33.92 s on each route. The driver used 45 mph through the first bend and 75 mph thereafter; maximum centreline deviation 1.057 m, zero resets/crashes.
- Earlier browser rounds exposed a stale cached menu world and coarse terrain faces crossing the wash. Both were corrected. The builder inspected the corrected wash, salt flat, entrance and racing-line pictures. Independent visual review is pending.
- `git diff --check` passes. The independent runner owns the required lane tier and production build; neither is claimed here yet.

## Assertion changes

The existing feature catalog assertion now expects four switches and explicitly checks `hidden-road: dev`. The prior three states are unchanged. This updates the catalog contract for the approved feature; no gameplay assertion was weakened.

Two additive render-reuse assertions demonstrate that an ordinary menu key differs from a flagged race key, while two equivalent flagged courses share a key. Existing cache assertions are unchanged. The Director approved the environment-key helper and this test hook.

The Director also approved one additive raycast regression: across A/B/C, downward rays onto both racing lanes near the entrance cannot hit the fitted wash patch. Existing assertions remain unchanged. The browser scenario additionally checks current frame readiness after every pose/quality change and measures actual rendered wheel clearance after the physical return. Its default still covers all 33 views and complete outbound/return drives; `EGG01_CAPTURE_REVIEW=1` only selects the requested nine replacement views for review.

## Independent visual review fixes

The first return images showed wheels and lower body buried in asphalt. The cause was the fixture, not production grounding: it injected a fixed `groundHeight` at the 95 m placement. Ordinary road cars normally leave that optional support field null. At return, the stale value was below current ground by 0.693 m on A, 0.682 m on B and 0.717 m on C. The fixture now restores ordinary null support/attitude fields, allowing the renderer's existing ground sampler to place the car. All nine car types still physically turn and return with zero resets/crashes; rally/monster vehicles continue updating their own real physics support.

The stale racing-line images were captured during quality/world shader preparation. The scenario now explicitly waits for a presented current frame after each pose or quality change and updates the HUD after readiness. Wall-contact framing follows the actual contacted car position.

Latest replacement evidence: `.qa-dist/browser-output/hidden-road-2026-09-24T05-51-28-463Z/report.json`, private port 6235, memory-only storage, nine images, zero warnings/errors. It supersedes these names from the earlier full report:

- `route-a-high-wall-contact.png`
- `route-a-performance-racing-line.png`
- `route-b-high-racing-line.png` and `route-b-performance-racing-line.png`
- `route-c-high-racing-line.png` and `route-c-performance-racing-line.png`
- `route-a-driven-return.png`, `route-b-driven-return.png`, `route-c-driven-return.png`

Returned wheel clearance above sampled asphalt is positive: 10.01 mm on A, 10.38 mm on B and 10.54 mm on C. The builder inspected the corrected return, current racing-line and contact views. Independent re-review is pending.

The broad grey bands in B/C racing-line images are existing gravel shortcut merges: B begins at 1,232 m, C at 1,296 m. Their heights near the mouth compare exactly with flag-off geometry. Investigation also found a separate 0.2 mm Hidden Road height blend at two B shortcut vertices. Ground blending now excludes every existing road/shortcut surface. A full rendered-position-buffer comparison confirms all four ABC shortcut meshes are byte-identical with the flag off/on; this preserves the existing grey merges instead of disguising them. The final 31/31 Hidden Road and 174/174 render-reuse checks pass after that exclusion. The 0.2 mm correction followed the replacement captures and requires no repeat visual sweep.

## Review limits and follow-up

- The wash banks are visibly repeated geometry, and the salt-flat soil is a development placeholder. EGG-02 owns the authored Blender wash/wall/gate family and measured fidelity rounds. This card does not claim a final art score or beta readiness.
- The fitted ground patch and the entrance shoulder need independent seam review. No existing scene signature was regenerated.
- The corridor exposes `length`, `entrance`, `poseAt(progress, perpendicularOffset)`, `contains(x,z)` and `nearest(x,z)` for later gate/departure work. It does not end races, unlock a menu, bank rewards or write saves.
- The Director approved nine source modules/hooks: the original five modules, feature flag/game/ground hooks, and the environment-key hook. Work stayed in the isolated EGG-01 lane. No live folder, port 5174, player save, dependency or network request was touched.
