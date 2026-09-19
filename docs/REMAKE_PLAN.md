# Remake review and production plan

## Review of the starting repo

The useful foundation was the separated simulation, deterministic courses, four-stage campaign, and tests. The main problems were presentation and feedback: stacked boxes for cars, repeated primitive scenery, a blank menu backdrop, no engine audio, no useful camera choice, no pause flow, and instant lateral steering. The original left/right mapping was reversed relative to the chase camera. The renderer import also used `@vite-ignore`, which kept the renderer out of a normal production bundle.

The remake replaces the visual layer and interface, builds an asset pipeline, adds original procedural audio, corrects steering, and introduces risk/reward through near misses and boost. A second handling pass replaces road-following with directional yaw: the road turns under the car, and the driver must steer to follow it. Off-road grip loss and timed impact recovery add consequences. The reference image is design input; it is not being presented as a playable rendered screenshot.

## Current boundary

This is a playable vertical slice: a small but complete sample of the intended experience. It has real 3D meshes and materials, but not production-quality scanned environments or hand-sculpted hero models. Cars have directional steering and heading error relative to a sampled road; they do not have physical tire contact, simulated suspension, body deformation, or rigid-body collision responses. Off-road suspension movement and crash body motion are visual effects driven by the simulation. Roadside scenery is visual rather than collidable. Traffic uses simplified collision bounds. The rival uses a pace controller and does not physically collide with the player. Sound is synthesized rather than recorded from engines. There is no multiplayer, open world, cockpit interior, save campaign, touch driving, or console build.

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

## Next production milestones

1. **Playtest the driving loop.** Measure input latency, time to reach racing speed, collision frequency, rival win rate, near-miss frequency, and whether boost creates interesting choices. Tune for both keyboard and controller.
2. **Build one production car and one authored road.** Use the reference sheet to sculpt the coupe in Blender, correct body panels and wheel wells, create a UV layout, bake normal/roughness maps, and build three levels of detail. Add a polished checkpoint station and canyon kit.
3. **Replace synthesized engine timbre with licensed or original recordings.** Layer idle/load/coast RPM bands, tire surfaces, spatial traffic pass-bys, and a proper music mix. Keep the existing event routing.
4. **Choose the long-term engine with a measured prototype.** Compare a 60-second road section in this browser build and an Unreal vehicle template using the same scale and visual assets. Judge frame time, handling, iteration speed, and target hardware.
5. **Expand only after the slice is fun.** Add distinct routes, difficulty curves, rivals, progression, accessibility options, remappable input, quality settings, and broader hardware testing.

Initial targets, not measured promises: 60 fps at 1080p on a declared midrange desktop, no visible shader pauses during racing, under 250 visible draw calls where possible, sensible car/environment LOD, and a compact first-load download. Profile on real target hardware before setting a quality bar.
