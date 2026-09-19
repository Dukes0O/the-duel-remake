# Remake review and production plan

## Review of the starting repo

The useful foundation was the separated simulation, deterministic courses, four-stage campaign, and tests. The main problems were presentation and feedback: stacked boxes for cars, repeated primitive scenery, a blank menu backdrop, no engine audio, no useful camera choice, no pause flow, and instant lateral steering. The original left/right mapping was reversed relative to the chase camera. The renderer import also used `@vite-ignore`, which kept the renderer out of a normal production bundle.

The remake replaces the visual layer and interface, builds an asset pipeline, adds original procedural audio, corrects steering, and introduces risk/reward through near misses and boost. A second handling pass replaces road-following with directional yaw: the road turns under the car, and the driver must steer to follow it. Off-road grip loss and timed impact recovery add consequences. The reference image is design input; it is not being presented as a playable rendered screenshot.

## Current boundary

The current game has nine two-lap events, a local career and leaderboard, seven selectable cars, recorded engine/tire audio, solid scenery, collision-aware rivals and police, drifting, airborne arena jumps and crushable salvage cars. Timberline Checkpoint Rush has passed input-driven and browser checks. The latest core matrix and all 64 remaining regression suites pass. Courses share their road, terrain and collider data with the renderer. Mountain and rally geometry have dedicated mesh-clearance audits. See `SESSION_HANDOFF.md` for the current working state and `VERIFICATION.md` for checked results.

The simulation still uses road coordinates and arcade yaw rather than four independently simulated tire contact patches. Suspension response and body dents are controlled animation, not soft-body deformation. The city chase is a bounded driving event with recoverable crashes, not a GTA-sized open world. Local players take turns on one computer; there is no online multiplayer. Desktop keyboard and gamepad driving are supported; touch driving and native console builds are outside the current implementation.

## Engine decision

Keep Three.js for this iteration. It already runs here and supports physically based materials, shadow maps, and imported glTF models. This lets us tune the minute-to-minute fun before taking on a second application and a native build pipeline. [Three.js renderer](https://threejs.org/docs/pages/WebGLRenderer.html), [glTF loading](https://threejs.org/docs/pages/GLTFLoader.html).

If the target is a photorealistic native PC/console game with complex terrain, suspension, destruction, and large authored worlds, create an Unreal prototype before expanding the browser version further. Epic provides Chaos Vehicles for vehicle simulation. That is a migration project: this JavaScript simulation is not an Unreal project, and installing Unreal alone will not turn it into one. [Chaos Vehicles](https://dev.epicgames.com/documentation/unreal-engine/chaos-vehicles), [vehicle setup](https://dev.epicgames.com/documentation/unreal-engine/how-to-set-up-vehicles-in-unreal-engine).

## Libraries and tools

| Tool | Status | Purpose and trigger |
| --- | --- | --- |
| Three.js 0.171.0 | Existing dependency, retained | Rendering, materials, model import/export, geometry batching |
| Vite 8.0.16 | Existing development dependency, retained | Local server and production bundling |
| Web Audio / Gamepad APIs | Built into browser | Sound and standard controller input; no extra package |
| Blender | User has it; executable not found in checked standard locations | Refine meshes, UVs, bake materials, export GLB; configure the executable path before running provided scripts |
| Rapier JavaScript | Consider later; not installed | Physical contacts and suspension if the browser version needs free driving; prototype before replacing this arcade controller |
| glTF Transform / KTX2 tooling | Consider with larger art library; not installed | Compress textures and meshes after establishing measured budgets |
| Unreal Engine + Chaos Vehicles | Optional future native branch; not installed | Native high-end game with a different runtime and content pipeline |

Rapier has JavaScript bindings and WebAssembly setup requirements. KTX2 is a texture delivery workflow rather than an art creation tool. [Rapier setup](https://rapier.rs/docs/user_guides/templates/getting_started_js/), [Khronos KTX2 guide](https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/subpages/KTXArtistGuide_glTF-Transform.md).

## Remaining production work

1. **Playtest the expanded loop.** Check whether the new circuits, shortcuts, braking, offroad grip, CPU levels and unlock prices remain fun for a human driver. Automated demonstrations check consistency but do not replace player feedback.
2. **Refine the art in Blender.** The four earned-car GLBs are ready for UV layouts, baked normal/roughness maps and detailed damage variants. The generated reference sheet provides their visual direction. Preserve collision dimensions and animation names when replacing runtime geometry.
3. **Listen to the recorded mix.** Engine bands, coast, tires, sirens and tunnel reflections are implemented and mathematically checked. Listen for convincing shifts, load changes, loops and surface transitions on speakers and headphones.
4. **Measure target hardware.** Compare High and Performance modes during dense city driving, shadows, crashes and stadium jumps. First scene loads still compile shaders and build procedural geometry. Add model/texture LOD only against measured bottlenecks.
5. **Author richer challenges.** The chase, rally and monster arena establish separate vehicle roles. Personal-best ghosts, the timed Titan Stunt Trial, three selectable scenic layouts and physical CPU shortcut choices build on those systems. Neon Drift Trial adds score-based city driving; Timberline Checkpoint Rush adds ordered gates and earned time on an offroad mountain route. Free-roaming arena play would need a different driving model.

Frame-rate samples from this host are not a broad performance guarantee. Keep geometry, collision and reward checks alongside each route or asset revision. Do not call the result a finished AAA game solely because it uses physically based materials or generated reference images.
