# EGG-01 — Hidden Road geometry and protected driving

Status: ready for independent review and lane/build gate.

## Changes

- Added the `hidden-road` dev switch. Pacific Canyon routes A, B and C get a separate 1,050 m world-space corridor when explicitly enabled. Its mouth is at race distance 1,408 m, right lateral offset 8.5 m, outside the Mojave Canyon bend. It is not a racing shortcut.
- The first 750 m wind through a dry wash. The final 300 m are straight. A widening around 95 m lets every car turn around before the later 150 m departure point. The salt-flat approach widens to 240 m across.
- Prepared dirt handling and physical world-space steering apply to the player. Corridor positions bypass boundary/water resets and lap-gate processing. A returning road car retains its physical heading until it aligns with the asphalt lane. NPC routes, map geometry and ordinary surface rules stay separate.
- The corridor is built after normal scenery generation, preserving the racing RNG stream. Complete scenery footprints are cleared from the drive. Solid wash banks have a full-box clearance check against the main road and its shoulder.
- Added temporary wash banks, tire ruts, an unlettered leaning post and dead cacti. These are playable geometry assets, not the final Blender fidelity family. Rustwall, gate ceremony, departure settlement and discovery persistence remain in their own cards.
- Fixed renderer world reuse: an ordinary menu world cannot satisfy a flagged Hidden Road race. The key adds a stable `hidden-road-v1` marker only for flagged course geometry; flag-off keys remain byte-identical.
- Replaced coarse ground faces intersecting the wash with a fitted patch. The existing grid otherwise bridged over the clear physical corridor. Face selection is limited to progress beyond 40 m and corridor width plus 32 m; the fitted patch extends 80 m beyond either side and beyond the terminal cap. Flag-off terrain geometry is unchanged. The patch uses nine cross-section columns at 2 m intervals; final geometry is 10,000 triangles.

## Tests and browser evidence

- Independent red suite `c60faad`: all 31 Hidden Road acceptance groups now pass unchanged. This includes ABC geometry, full Titan hull clearance, all nine car types, player-only reset protection, outside water/land controls, untouched map/AI/RNG fingerprints, lap safety and shared-time 30/60/144 Hz movement.
- `node tools/test-replays.mjs`: 162 approved ordinary replay checks passed; no replay fixture was changed.
- `node tools/test-feature-flags.mjs`: 26 checks pass.
- `node tools/test-render-reuse.mjs`: 173 checks pass.
- All nine cars physically completed the production-input U-turn at 95 m and drove back onto asphalt in the scenario helper. Turn times were 7.61–11.53 s; the return was 13.86–14.17 s. Zero boundary resets, major crashes or residual impacts.
- Latest private browser scenario: `.qa-dist/browser-output/hidden-road-2026-09-24T05-37-55-272Z/report.json`, port 38841, memory-only storage, 33 ABC High/Performance screenshots, zero console warnings/errors. It verifies the actual Hidden Road scene replaces the ordinary menu scene, solid wall contact, a complete outbound drive, and an actual steered turn/return on every route.
- Outbound production drive: 1,030 m from initial placement at 15 m to 5 m before the end, 33.92 s on each route. The driver used 45 mph through the first bend and 75 mph thereafter; maximum centreline deviation 1.057 m, zero resets/crashes.
- Earlier browser rounds exposed a stale cached menu world and coarse terrain faces crossing the wash. Both were corrected. The builder inspected the corrected wash, salt flat, entrance and racing-line pictures. Independent visual review is pending.
- `git diff --check` passes. The independent runner owns the required lane tier and production build; neither is claimed here yet.

## Assertion changes

The existing feature catalog assertion now expects four switches and explicitly checks `hidden-road: dev`. The prior three states are unchanged. This updates the catalog contract for the approved feature; no gameplay assertion was weakened.

Two additive render-reuse assertions demonstrate that an ordinary menu key differs from a flagged race key, while two equivalent flagged courses share a key. Existing cache assertions are unchanged. The Director approved the environment-key helper and this test hook.

## Review limits and follow-up

- The wash banks are visibly repeated geometry, and the salt-flat soil is a development placeholder. GFX-03 owns the authored Blender wash/wall/gate family and measured fidelity rounds. This card does not claim a final art score or beta readiness.
- The fitted ground patch and the entrance shoulder need independent seam review. No existing scene signature was regenerated.
- The corridor exposes `length`, `entrance`, `poseAt(progress, perpendicularOffset)`, `contains(x,z)` and `nearest(x,z)` for later gate/departure work. It does not end races, unlock a menu, bank rewards or write saves.
- The Director approved nine source modules/hooks: the original five modules, feature flag/game/ground hooks, and the environment-key hook. Work stayed in the isolated EGG-01 lane. No live folder, port 5174, player save, dependency or network request was touched.
