# Detail, sound and handling iteration

The current rules reflect the latest play feedback: faster steering, controllable arcade drift, harmless dirt excursions, five major impacts before an explosion, and roadside chickens.

## Driving and damage

Steering responds faster and has more cornering authority, including on dirt. `headingError` is the direction of travel relative to the road; `slipAngle` is the body's rotation relative to that travel. This gives a controllable arcade slide without applying hidden road following. It is not a full tire-force simulation. Drift drives tire squeal, smoke, skid marks and the HUD callout.

Head-on traffic and rock impacts count as major at 45 mph or more closing speed. Slower contacts and other collision types retain ordinary impact recovery. Going off-road does not trigger an impact. The five-hit tally persists across checkpoints and resets only with a new campaign. Legacy run reserves can still be exhausted by ordinary collisions or engine failures; the explosion specifically requires five major crashes.

The course owns boulder/outcrop positions and collision footprints. Both the renderer and swept collision checks use those same entries. Tiny stones and grass are decoration. Large distant canyon walls are background scenery beyond the roadside obstacle field; the game is still a road racer rather than an unrestricted open world.

Near-road ground follows a narrow course strip. Distant ground is a separate world-space grid with a gap covered by that strip, preventing wide extrusions from folding over tight bends. The car's off-road render height follows the local ground relief.

## Art and audio

The player now uses the detailed [Car Concept model](../public/assets/models/CREDITS.md), with sculpted body panels, full cabin, textured tires, machined rims and separate brake assemblies. Both player selections use paint/trim variants of this body while retaining their handling differences. Source geometry is normalized and batched by material; wheels steer and spin independently. Original procedural cars remain for traffic, the rival and the loading fallback. Impact damage deforms meshes, fractures glass and darkens paint. Catastrophe ejects wheels and metal debris, lights the surroundings, and leaves fire and smoke. These are visual effects, not deformable rigid-body physics.

Natural HDR lighting comes from [Poly Haven's Zwartkops Curve Sunset](https://polyhaven.com/a/zwartkops_curve_sunset), under CC0. Scanned Gravelly Sand color, normal and roughness maps give the ground fine relief. The existing generated sandstone supplies canyon color and bump detail. Rounded branching cacti and irregular layered pines replace simple stalks and cones. Sun shadows, baked car occlusion, a soft underbody shadow and restrained bloom add depth. All runtime assets are local. No additional library was installed; the lighting loader, bloom and output passes are included in the existing Three.js dependency. A full-screen ambient-occlusion pass was evaluated and excluded because it reduced the tested frame rate.

Recorded engine and tire assets are listed in [audio credits](../public/assets/audio/CREDITS.md). The engine recording is pitched and filtered with RPM and throttle, backed by a quiet synthesized combustion layer. It is not a measured recording set for every RPM band. The tire recording follows slip and braking. The explosion WAV is original synthesis. Browser samples are loaded only after audio is unlocked by a user gesture, with procedural fallback if loading fails.

There are 48 animated chickens per stage, in small groups near service stations and along the verge. They walk, peck and move away from a nearby car; they are scenery rather than collision targets.

## Reproduce checks

Run `npm test`, `npm run build`, `npm run assets:audio`, and `npm run assets:export` as appropriate. With Vite running, `/tools/visual-check.html` provides visible buttons for fresh/red and silver cars, a drive sample, fourth and fifth impacts, Alpine scenery and chickens. Use Pause animation to inspect an effect. The ordinary `/` route always starts in manual mode.
