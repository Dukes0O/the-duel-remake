# Graphics, sound and handling

The current build has nine two-lap events, eight cars, local player garages, directional damage, prepared gravel shortcuts and solid scenery. Event and reward rules come from [config.js](../src/config.js), [game.js](../src/game.js) and [progression.js](../src/progression.js).

## Driving and damage

Steering changes direction directly; accelerating does not steer the car along the road. Travel direction and body slip are separate, giving responsive arcade drifting. Slides drive tire effects and scoring where supported. This is not a full tire-force simulation.

In ordinary events, five unrepaired major crashes cause a catastrophic explosion. Head-on vehicle contacts and impacts with rocks, mountains, buildings, trees or rigid props count as major at a closing speed of at least 45 mph. Ordinary collisions and engine failures can exhaust the separate life reserve sooner. A stage win repairs up to two major crashes and restores up to two lives, capped at five. Remaining damage persists between circuits. Midnight Muscle Chase and Neon Drift Trial use recoverable cars: impacts cost time and damage the body, but do not consume lives or trigger the five-hit explosion.

Driving onto dirt does not itself count as a crash. Legal gravel routes retain useful pace, grip and nitro; rough ground outside the route slows the car more. Player, rival and pursuit vehicles share solid scenery and route boundaries. Contact can push an opponent off the road.

Course data supplies collision footprints for mountains, rocks, buildings, station structures, tree trunks, poles, signs, tunnel covers and rigid barriers. Tiny gravel, grass and flexible markers are decorative. The normal boundary warns at 60 metres and resets at 78 metres from the road centerline. Distant shortcuts have their own 20-metre warning and 32-metre reset buffers beyond their edges. Coastal water recovery also applies. A boundary reset does not damage the car.

## Cars and crash effects

Falcone and Stuttgart retain their separate [original starter bodies](CLASSIC_VEHICLES.md): a flat wedge and bridge wing versus a rounded coupe with flush oval lamps and an integrated rear wing. Falcone Heritage preserves the former F42's licensed [Car Concept body](../public/assets/models/CREDITS.md) and sport trim as a separate unlock. Aurora uses the same source with carbon aero and gold wheels. Dusthawk Rally, Banshee Muscle, Viper Prototype and Titan Monster retain their refined original geometry and Blender-compatible GLB exports; see [unlock vehicle notes](UNLOCK_VEHICLES.md).

Helmeted drivers have harnesses, arms and steering wheels. Front, rear, left and right contacts deform and scuff the matching panels; damage also affects glass and lamps. Catastrophe ejects wheels and debris and produces light, fire and smoke. These are scripted effects, not soft-body physics. Only traffic and police use simpler procedural sedans; the old player-loading fallback has been removed. Factory, Copper Metallic and Glacier Satin finishes change private body-paint materials while preserving trim and damage behavior.

## Landscape and lighting

Generated references guide vehicle and scenery design. Generated textures are used directly for grass, pine cutouts, sandstone, granite, roads, concrete, masonry, clouds and drift smoke. Natural environment lighting uses the credited CC0 [Zwartkops Curve Sunset HDR](https://polyhaven.com/a/zwartkops_curve_sunset). Sources and licences remain with the local assets.

Landscape detail includes broader connected mountain ridges, slope-aware snow and ground rock, dry meadow patches, muted ribbed cacti, dense pines, wind-blown meadow clumps, rally markers and grounded tire ruts. Roads and shortcuts follow the shared terrain sampler. Grounding checks use actual rendered triangles; mountain skirts and building foundations extend below terrain. Mountain visual heights are now bounded by their footprints to avoid vertical dome shapes. Coastal headlands, lighthouses, water and foam add depth beyond the road. See [road landforms](ROUTE_LANDFORMS.md) for the new hills, saddles and bends.

City scenes have detailed facades, perspective interiors, sidewalks, crossings, skyline buildings, parked cars and nearby street lighting. Cosmetic foliage and grit are kept off sidewalks and building footprints. Tunnels use scaled concrete grain and construction seams. Stadiums include crowds, grandstands, floodlights, ramps and crushable cars.

Clear, Golden hour and Overcast change daylight, sky and clouds. Night events keep fixed lighting; visible sun and shadow directions stay aligned. High graphics includes ambient contact shading, edge smoothing and 2048-pixel sun shadows. Performance disables those two screen passes and reduces shadow resolution and pixel density. Transparent surfaces, foliage cutouts and the sky are excluded from the ambient depth pass to avoid false dark rectangles.

Spatial batches let vegetation, landscape detail, signs and buildings be culled without reducing density. Indexed route queries preserve terrain geometry while reducing build work. The optional `?warmup=1` experiment prepares colour-scene shaders and holds simulation until the first drawn frame. It is disabled by default pending browser measurements; it does not prepare every post-processing/shadow shader or upload all geometry and textures.

## Sound and chickens

Real idle, revving, acceleration and tire recordings supply seven restrained vehicle voicings. Sustained high revs use one leveled recording. Gravel, landing, pursuit and tunnel effects add context; coast, forest and stadium ambience use credited field recordings. These are shared recordings, not measured RPM/load packs for each fictional car. Audio unlocks after a user gesture and retains fallbacks on loading failure. See [audio notes](AUDIO_ITERATION.md) and [credits](../public/assets/audio/CREDITS.md) for sources, processing and verification limits.

Courses place up to 28 flocks of eight chickens where clearance permits. Birds walk and peck, then flap away when collected. Crossing a flock refills nitro to maximum once per event run. Restarting or advancing to another campaign circuit restores its bonuses.

## Events and progression

The first three events form the campaign; the other six are standalone challenges.

| Event | Entry |
| --- | --- |
| Pacific Canyon Circuit | Any owned car |
| High Country Grand Tour | Any owned car |
| Harbor & Highlands | Any owned car |
| Titan Monster Arena | Titan Monster |
| Midnight Muscle Chase | Banshee Muscle |
| Ridge Rally | Dusthawk Rally |
| Titan Stunt Trial | Titan Monster |
| Neon Drift Trial | Banshee Muscle |
| Timberline Checkpoint Rush | Dusthawk Rally |

The three campaign circuits and Ridge Rally offer curated Route A, B and C layouts. Other challenges use fixed routes. Circuits validate sequential gates and both laps. Paved and gravel shortcuts have measured distance and driving-time checks.

Each local player has a separate wallet and garage. Base wins pay 600 CR on Easy, 1,000 on Medium and 1,500 on Hard. A completed loss charges half that base, capped by the wallet so the charge cannot create debt. Eligible personal-best bonuses can still follow a completed loss. Clean finishes, improvements, streaks, arena actions, drift performance and one-time milestones have separate bonuses. Every run/stage pair settles once. Quitting, restarting or reloading an unfinished race forfeits only its unbanked earnings; saved credits remain safe, including after Busted. Transmission is separate from CPU difficulty. Manual/Pro doubles driving points and recurring positive credit rewards, but not one-time milestones or loss charges.

Engine, nitro, handling, tires, brakes, suspension and nitro tank each have three levels costing 350, 600 and 950 CR. Paid cars cost 1,800 CR for Heritage, 2,200 for Aurora, 3,500 for Dusthawk, 5,000 for Banshee, 7,500 for Viper and 12,000 for Titan. Upgrades and paint are fixed when the race starts. Records retain all seven upgrade levels; personal-best comparisons allow tuning improvements, while ghosts require a compatible build. Paint is cosmetic. See [progression rules](PROGRESSION_V2.md) for exact bonuses, comparison rules and saves.

## Checks and remaining limits

Run `npm test` and `npm run build`. Asset changes can be rebuilt with `npm run assets:audio`, `npm run assets:export` and `npm run assets:unlocks`. The stable QA build uses `npm run qa:build` and `npm run qa:preview`; its `/tools/visual-check.html` page has visible scene, vehicle and crash controls. The ordinary `/` route starts in manual mode; `?autopilot=1` explicitly enables the demo driver.

Focused suites check rendered route clearance, grounding, damage, material ownership, batch transforms, shortcuts, event objectives, audio scheduling and progression. Browser inspection remains necessary for shader compilation, appearance, frame times and audible quality. [Verification notes](VERIFICATION.md) describe tested snapshots, not guaranteed performance on every device.

Historical note: the early six-stage build used a flat 650-credit win and excluded the first ambient-occlusion experiment. Both have been superseded by the nine-event economy and selectable High/Performance rendering.

The runtime still uses the existing Three.js and Web Audio stack. No additional game engine or runtime library is required. Blender can edit the exported GLBs and develop bespoke assets from the references. This remains a browser arcade racer with local saves and a bounded city chase, not a complete AAA production pipeline or open-world simulation.
