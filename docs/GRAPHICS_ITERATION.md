# Detail, sound and handling iteration

The current rules reflect the latest play feedback: faster steering, controllable arcade drift, harmless dirt excursions, five major impacts before an explosion, solid scenery, a yielding physical rival, garage progression, and roadside chicken bonuses.

## Driving and damage

Steering responds faster and has more cornering authority, including on dirt. `headingError` is the direction of travel relative to the road; `slipAngle` is the body's rotation relative to that travel. This gives a controllable arcade slide without applying hidden road following. It is not a full tire-force simulation. Drift drives tire squeal, smoke, skid marks and the HUD callout.

Head-on traffic and rock impacts count as major at 45 mph or more closing speed. Slower contacts and other collision types retain ordinary impact recovery. Going off-road does not trigger an impact. The five-hit tally persists across checkpoints and resets only with a new campaign. Legacy run reserves can still be exhausted by ordinary collisions or engine failures; the explosion specifically requires five major crashes.

The course owns boulder/outcrop positions and collision footprints. Both the renderer and swept collision checks use those same entries. Tiny stones and grass are decoration. Mountains, station walls, pumps, canopy supports, tree trunks, poles, and bend barriers share world-space collision footprints. Mountains are cleared against the entire route. Cars warn at 60 metres from the centerline and safely reset at 78 metres. Boundary recovery does not damage the car. Tiny gravel, grass and flexible delineators remain decoration.

Near-road ground follows a narrow course strip. Distant ground is a separate world-space grid with a gap covered by that strip, preventing wide extrusions from folding over tight bends. The car's off-road render height follows the local ground relief.

## Art and audio

The player now uses the detailed [Car Concept model](../public/assets/models/CREDITS.md), with sculpted body panels, full cabin, textured tires, machined rims and separate brake assemblies. Both included cars and the unlockable Aurora GTR share this body while retaining their handling differences. The GTR has gold wheels, a carbon wing, splitter and skirts. A helmeted driver has articulated arms, a harness, and a steering wheel. Front, rear, left and right impacts dent and scratch the matching panels. Source geometry is normalized and batched by material; wheels steer and spin independently. The rival also uses the detailed body. Original procedural cars remain for traffic and the loading fallback. Impact damage deforms meshes, fractures glass and darkens paint. Catastrophe ejects wheels and metal debris, lights the surroundings, and leaves fire and smoke. These are visual effects, not deformable rigid-body physics.

Natural HDR lighting comes from [Poly Haven's Zwartkops Curve Sunset](https://polyhaven.com/a/zwartkops_curve_sunset), under CC0. Scanned Gravelly Sand color, normal and roughness maps give the ground fine relief. The existing generated sandstone supplies canyon color and bump detail. Rounded branching cacti and dense pine crowns use instanced geometry. The generated pine needle cutout is applied to radial branch planes; tree roots use the shared ground surface. Generated granite covers eroded heightfield massifs, with snow on high alpine ridges. Mountain floors are buried below sampled terrain, preserving summit height. Sun shadows, baked car occlusion, a soft underbody shadow and restrained bloom add depth. All runtime assets are local. No additional library was installed; the lighting loader, bloom and output passes are included in the existing Three.js dependency. A full-screen ambient-occlusion pass was evaluated and excluded because it reduced the tested frame rate.

Recorded engine and tire assets are listed in [audio credits](../public/assets/audio/CREDITS.md). The engine recording is pitched and filtered with RPM and throttle, backed by a quiet synthesized combustion layer. It is not a measured recording set for every RPM band. The tire recording follows slip and braking. The explosion WAV is original synthesis. Browser samples are loaded only after audio is unlocked by a user gesture, with procedural fallback if loading fails.

Each stage has up to 28 flocks of eight chickens. White and brown birds walk and peck within their flock footprint. Crossing a flock refills nitro once per stage; birds flap away. The next stage or restart restores the flocks.

## Reproduce checks

Run `npm test`, `npm run build`, `npm run assets:audio`, and `npm run assets:export` as appropriate. With Vite running, `/tools/visual-check.html` provides visible buttons for fresh/red and silver cars, a drive sample, fourth and fifth impacts, Alpine scenery and chickens. Use Pause animation to inspect an effect. The ordinary `/` route always starts in manual mode.


## New scenes and progression

The six-stage campaign now includes Pacific Coast and Harbor After Dark. All scenes can be selected from the start menu. Coastal terrain drops toward an animated water surface; lighthouses and blue fuel canopies follow the generated reference. Harbor warehouses have warm windows, dock cranes, lamps, and car headlights under blue-hour lighting. Roads use bounded headings so they cannot loop across themselves. Turn warnings precede hard bends by 125 metres.

Credits are local to the browser profile. A course win gives 650 credits, plus 100 for a clean finish and 150 on Pro. A loss gives no win credits. Each run/stage pair can pay once. Engine, nitro, handling and tire upgrades have three levels at 350, 600 and 950 credits. The Aurora GTR costs 2,200 credits. Race physics copies fitted upgrade levels when the run starts; later garage changes cannot alter that active snapshot. Best-time records include the four upgrade levels.

No new runtime library or engine is needed for this iteration. Three.js already supplies instancing, physical materials, image/GLB loaders, HDR lighting, shadows and postprocessing. Web Audio supplies playback and mixing. Blender can import the licensed GLB and generated references for future bespoke vehicle bodies and sculpted environments. This remains an arcade browser racer; these changes do not implement soft-body crash physics or a complete AAA production pipeline.


### Landscape follow-up

Generated meadow turf replaces the sand map on alpine and coastal land. Fourteen thousand instanced grass clumps per meadow scene use a photographic alpha cutout with a small wind animation. Taller rolling terrain stays tied to the same `groundAt` function used by props, birds and cars. Car pitch and roll follow off-road slopes. Mountain skirts are buried below the terrain at their footprints. The coastline drops toward the water close to the road, making the ocean and lighthouses visible while driving. Harbor reflection lighting uses a cooler environment to avoid a false sunset glare on the road.

The high-rev engine mix was also corrected after play feedback: a steady leveled recording replaces the repeating rev blip, and redundant pitched/synthetic voices are removed at full revs. See `AUDIO_ITERATION.md`. CPU following now predicts cut-ins and brakes; a late rear contact caused by the CPU cannot trigger player damage or an impact animation.


Station yards are now level with their building and pump foundations, then blend into the surrounding terrain. Coastal lighthouses stand on raised headlands, and trees are excluded from underwater positions. The water boundary resets both cars before submergence. A 64-point footprint check buries mountain skirts without lowering their summits.
