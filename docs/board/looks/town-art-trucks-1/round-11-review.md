# TOWN-ART-TRUCKS-1, round 11: three work trucks

## Measured repairs

- Background bleed now uses the fire truck's wider photo match on the tanker,
  supply and tow views. `carve_hull` uses the latest helper unchanged, so a
  face falls back to another photo when its nearest view does not cover it.
- The supply load is carved from its own measured side, front, rear and
  overhead photos as `supply-truck:load`. Its hull starts above the bed floor,
  stays within the bed width, and leaves the photo-carved bed below it.
- The tow lattice uses a photo mask traced from pixels 430–1006 by 18–292,
  extruded 0.14 m. Its holes remain open. The boom tip measures about
  (z 4.21 m, y 3.74 m); the hook hangs directly below it at y 2.00 m on a
  14 mm cable.
- The road camera follows round 9's full side view. All wheels sit on the
  ground. The sheet shows larger views and includes the generated supply-load
  reference crop.

## Export checks

The sheet and model come from `trucks-1.glb` imported into an empty Blender
scene. The GLB is 3,400,356 bytes. Triangles: fire truck 10,352; tanker 10,092;
supply truck 11,252; tow rig 10,360. Each stays under 12,000 and the family
stays under 8 MB.

`node tools/test-blender-output.mjs`: passed, 292 checks, 0 failed.
`node tools/test-repo-hygiene.mjs`: passed. No assertions changed.

Claude should check the water-tanker pale edges, the supply load from three
quarters and overhead, the empty bed when `supply-truck:load` is hidden, and the
tow lattice, tip, cable and hook from the side and road. The fire truck is
unchanged. No browser check was run here.
