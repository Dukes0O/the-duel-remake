# Road landforms and mountain refinement

19 September 2026. The four natural events now have distinct rolling road profiles. Pacific Canyon, High Country and Ridge Rally also have more varied sweeping bends. Route layout version 4 separates their records and ghosts from earlier geometry.

## Visible changes

| Event | Road and scenery shape | Useful review locations on Route A |
| --- | --- | --- |
| Pacific Canyon | Two substantial canyon shoulders, a coastal rise and a low shore section. Height range grows from 7.6 m to 33.4 m, with 58.7 m of climbing per lap. Paired bends vary the old broad oval. | Approach the canyon crest at s=1,300–1,520; coastal rise near s=2,832. |
| High Country | Rolling canyon approach and a saddle between two alpine crests. Added sweep changes the approach to the mountain pass. | First alpine crest near s=2,176, saddle at s=2,400, second crest near s=2,600. |
| Harbor & Highlands | A real saddle in Moonlight Pass and a coast-road hill. Existing horizontal route remains: adding another wave removed the only useful shortcut on custom seed 1. | Mountain saddle at s=2,288; coastal hill near s=3,504. |
| Ridge Rally | Raised dry-creek shoulders, a shallow hollow, twin timberline crests and a final ridge shoulder. Broader sweep varies the gravel route. | Creek shoulder near s=512; alpine crests near s=2,336 and s=2,664, with the saddle around s=2,499. |

Landforms are authored in course coordinates, with smooth approaches and no random height noise. Road, offroad ground, roadside props and distant terrain continue to share the existing sampler. The road grade remains below 15%; the steepest audited shortcut ground is 15.68%.

The fixed arena, city chase, drift and Timberline checkpoint route geometry is unchanged. Chase, drift and Timberline sample fingerprints were compared with the previous committed presets. Nine events and two laps remain in place.

## Mountains

The expanded-scenes reference shows broad rocky ranges with angular connected crests. The old exponential ridge field produced rounded peaks, sometimes with a 200 m height inside a narrow footprint. The revised field uses connected straight crest segments, broader tapered flanks and restrained gully detail.

Visible summit height is capped at 1.08 times the narrower collision radius. Existing obstacle positions and solid ellipses are unchanged. Across the default non-arena courses, 197 mountain features now have visible heights of 59.4–108.4 m; the highest height-to-width ratio falls from 1.57 to 0.54. The exact rendered rim is still buried beneath the near and far terrain.

The four shared shapes keep their original 8,400 triangles per instance. No new draw calls, texture assets or runtime dependency are required. The exported `rockTexture` accessor lets the ground material reuse the cached granite texture. Height and bend calculations happen during course construction; ordinary frame-by-frame ground queries still interpolate the existing samples.

The wider regression found a cactus root 7.3 cm above the visible terrain near a shortcut. Its analytic ground height differed from the terrain triangle. Cactus placement now intersects cached local Float32 terrain triangles, keeping the existing short root collar and collision footprint. All 1,140 sampled cacti remain grounded with 29.6–33.8 cm of root burial; the original strict burial limits are retained.

## Verification

All results below use the final geometry, including Harbor's retained horizontal shape.

- `node tools/test-circuits.mjs`: 44,409 checks; maximum road grade 14.9%.
- `node tools/test-route-variants.mjs`: 1,866,146 checks and 1,738,521 clear Titan-width sweeps across the twelve natural layouts; 16 useful branches; maximum ground grade 15.68%, minimum branch distance saving 3.24%.
- `node tools/test-shortcuts.mjs`: 93 branches across 63 circuits and 2,406,819 clear obstacle sweeps; minimum distance saving 3.09%, maximum lateral slope 0.617.
- `node tools/test-terrain.mjs`: 872,619 checks across nine events and four seeds; station foundation error 0.0000 m; minimum burial against rendered terrain triangles 3.99 m. The coastline fixture now finds water-warning and recovery offsets on one open-shore transect, away from a shortcut's separately tested boundary shoulder.
- `node tools/test-mountain-landscape.mjs`: 148,233 checks and 18,048 clear rendered road/shortcut rays; analytic minimum rim burial 2.84 m; the existing triangle budget is retained.
- `node tools/test-route-variants-integration.mjs`: 74 checks, including actual two-lap inputs, route-specific records, ghosts and player isolation.
- `node tools/test-desert-detail.mjs`: 441,087 checks; 1,140 grounded cacti, 798 unchanged rock colliders and visible cactus heights 0.88–4.20 m.
- `node tools/test-landscape-cells.mjs`: 314,376 checks and 47,914 retained source instances. Version-4 placement snapshots replace the old geometry snapshots; each batch also explicitly retains the full source count. The modeled combined camera, shading and shadow triangle reduction remains 62.3%.
- `node tools/test-polyline-terrain-integration.mjs`: 7,598 checks. Updated route/mountain snapshots retain the independent full-scan comparison of every terrain buffer byte, all 197 mountain transforms and all 192 skyline buildings.
- `node tools/test-shortcut-presets.mjs --verify-solvers`: 222 checks, including exact agreement with all 15 freshly solved presets. Regenerated version-2 preset data is 125,791 bytes.
- Input-only shortcut audit on the four natural events, seeds 1989/42, with Falcone and Dusthawk: 20 paired runs; branch gains 2.41–12.15%, at least 0.355 seconds; zero major crashes, boundary resets or time off the legal surface.

The input audit uses normal throttle, braking and steering at 120 Hz, a common 220 m run-up and up to 100 m of exit road. Traffic and radar are removed to isolate route pace; solid scenery, terrain, traction and damage remain active. These measurements establish physical feasibility, not a guarantee for every human driving line. The main session owns browser review and the complete campaign regression.
