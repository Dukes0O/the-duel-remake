# Six-course expansion

Scope: six original standalone circuits; more alternating bends and meaningful
climbs; speed-dependent crest flight; shallow tunnel/rail scrapes below 35°;
audible rev/shift changes; six unlockable specialists plus the neutral driver.
Keep the original nine event IDs and three-stage campaign stable. All cars can
enter the new circuits. Driver effects must have separate competitive identities.

Courses: Eifel Crown, Alpine Serpent, Azure Riviera, Red Mesa Corkscrew,
Neon Docks Circuit and Cloudbreak Skyway. Their repeated bends, recoverable
runoff, landmark sightlines and distinct pace are original, not replica tracks.
Use a narrow shared terrain ribbon on tighter curves; scenery must not intrude
on the road or hide the next turn. Crests should reward speed without forcing
unavoidable landings into walls.

Reference principles: the [Nordschleife's varied terrain](https://www.nuerburgring.de/info/nuerburgring/race-tracks/nordschleife),
[Gran Turismo's track descriptions](https://www.gran-turismo.com/us/products/gtsport/tracklist/)
of alternating corners and elevation, and [Forza's physics-driven engine audio](https://forza.net/news/forza-motorsport-audio-updates).
These inform design goals; no commercial game assets or real circuit layouts
are copied. Generated concept art is an art target, not a gameplay screenshot.

## Courses and driving

| Original course | Length per lap | Character | Highest grade | Landmark |
| --- | ---: | --- | ---: | --- |
| Eifel Crown | 5.6 km | Forest esses, ridge, valley sweep | 24.8% | Timber lodge |
| Alpine Serpent | 4.8 km | Glacier climb, gallery, winding descent | 27.1% | Avalanche gallery |
| Azure Riviera | 4.4 km | Coastal bends, ridge, flowing esses | 24.4% | Arcaded pavilion |
| Red Mesa Corkscrew | 4.0 km | Mesa climb, descending turns, fast return | 28.1% | Sandstone tower |
| Neon Docks Circuit | 4.16 km | Night streets, harbor bend, interchange | 17.5% | Steel gantry |
| Cloudbreak Skyway | 5.2 km | Canyon launch, mountain crests, skyline return | 21.0% | Cantilever skydeck |

Each runs two laps as a standalone event. Any unlocked car can enter these and
the nine existing events. The original three-stage campaign and existing event
indices remain unchanged. New road curves have minimum radii of 87–145 m; old
course limits remain unchanged. Tunnels are authored only in Alpine Serpent and
Cloudbreak, rather than being repeated in every alpine sector. Eifel has a
denser forest. New layouts use no generated shortcuts, which keeps their
designed alternating turns meaningful.

Seven small smooth crests add speed-dependent flight. Measured 30/70 mph runs
stay grounded; fast 150 mph probes launch and land once. The height display uses
the same actual gap above the road. Road jumps do not award stadium stunt
points. Shallow tunnel/guardrail contact scrubs speed below 35°; impacts at or
above 35° retain the existing impact-speed crash rule. Arena walls, rocks, posts
and buildings stay solid. See `PHYSICS_EXPANSION.md` for the complete tests.

## Reference and Blender workflow

Generation mode: built-in image generation. Retained reference:
`public/assets/reference/course-expansion.png`. It is original concept art,
not a borrowed game asset or a claim of the final rendered quality.

Prompt brief used for the six-panel board:

> Create a two-column, three-row landscape reference board for six original
> playable racing courses. Use refined realistic low-poly 3D, physical
> materials and low chase-camera views. Keep a continuous, grounded driving
> road and a modest-polygon, buildable landmark outside the driving corridor.
> Show Eifel Crown with a forest lodge; Alpine Serpent with an avalanche
> gallery; Azure Riviera with a Mediterranean arcaded pavilion and terracotta
> roof; Red Mesa Corkscrew with a sandstone watchtower and open pergola; Neon
> Docks Circuit with a steel gantry and restrained neon; Cloudbreak Skyway with
> a white cantilevered mountain skydeck. No HUD, copied circuit layouts,
> commercial logos or watermarks.

Blender 4.5.9 LTS was downloaded from the official vendor as a portable tool. The
ZIP's SHA-256 matched the official checksum:
`41da973b9bf95bb312cbeff4d1982feb13259b43c821686b9bafea4dfe5477cf`.
No system install was made.

Retained source and runtime files:

- `tools/build-course-landmarks.py`: reproducible native Blender authoring and export.
- `art-build/course-landmarks.blend`: rebuildable local output with six named editable collections, excluded from Git and the game build.
- `src/generated/course-landmarks.json`: evaluated, bevelled, material-batched triangles.
- `src/course-landmarks.js`: runtime placement and materials, using those exact meshes.
- `src/course-set-pieces.js`: small collision/placement contract, without importing the mesh data into physics.

To rebuild with an installed Blender:

```sh
blender -b --python tools/build-course-landmarks.py -- --root /absolute/path/to/repo --revision 3
```

The script writes review renders to ignored `.qa-art`, exports the current meshes
and saves the native file. Delete the disposable renders after review. The
native file opens with the lodge visible; switch named collections to edit the
others. Blender's Z-up coordinates become game Y-up coordinates without changing
handedness. Material-batched models total 18,588 triangles; a course loads only
its own landmark meshes, with 4–7 draws including the terrain foundation.

## Iteration record

1. Baseline geometry established the new bend/height ranges. Two overlapping
   hill/crest combinations were adjusted to keep grades below 29%. Analytic
   height sampling replaced eight-metre interpolation only on new courses,
   removing tiny false takeoffs. The road/shoulder mesh uses two-metre steps.
2. Blender revision 1 established all six silhouettes. Revision 2 added roof
   battens and tiles, masonry courses, gallery coping, the gantry cabin and
   skydeck glazing. Revision 3 corrected roof-detail direction, upper-tower
   masonry placement, custom-mesh outward normals and native-file visibility.
3. Browser review calibrated new landmark albedo for the game's stronger sky
   lighting and added restrained material weathering. The gantry needed a
   reserved dock plaza to remain visible. Gallery and skydeck placement moved
   into their mountain sectors. Landmarks retain dry, terrain-spanning
   foundations and stay outside the driving corridor.
4. Actual rendered-triangle tests found gaps between the 64 m near ribbon and
   new 16 m far grid. Reducing the far omission distance to 40 m gives overlap.
   New mountain bases and far-edge cactus/pine roots were aligned to those
   same rendered surfaces. The original nine scene signatures are protected
   separately; their geometry and materials are not regenerated to hide changes.
5. Full driving runs exposed traffic that retained a 37° collision yaw forever.
   Moving traffic now eases back toward its actual motion; stationary cars
   do not pivot. The previously failing Alpine automatic run finishes cleanly.
6. Real menu review checks specialist unlock/select, car/course choice, the
   light-car arena warning and record-class labels. Enhanced driver records
   remain separate from the neutral class. The original recordings were
   retuned and their actual PCM pitch/loudness checked; no human listening
   review is claimed. See `AUDIO_EXPANSION.md` and `DRIVERS.md`.

Current automated results and the served build are recorded in `VERIFICATION.md`.
Reusable visual and menu fixtures use memory-only saves before loading the
game. No real career is used for testing.

Budget: user permits iteration down to 10% quota remaining. Initial shared
weekly usage was 46% used. Check between major passes and retain a reserve for
verification and handoff. Never redeem reset credits without a new request.
