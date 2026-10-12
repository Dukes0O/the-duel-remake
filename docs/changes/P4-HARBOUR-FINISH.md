# P4-HARBOUR-FINISH: Claude's finishing pass on Harbour Lights

Claude (Opus agent), 11 October 2026. Design: `docs/CIRCUITS.md` section 5.2.
Switch: unchanged (`harbour-lights` with `grand-prix`). Road, race rules,
timing, field settings and the Team Room intel are untouched. Every shared-file
change below is an opt-in read from the circuit's own data; other circuits draw
exactly as before.

## What was wrong and what changed

- **Tan escape roads.** The run-off gravel took the shared gravel colour. An
  escape road may now carry its own `colour` (`src/escape-roads.js`,
  `src/track-script-scene.js`); Harbour uses dark grey, so it picks up the
  street light.
- **Lantern strings ran along the road, not across it.** The layout turned each
  string a quarter turn too far (walls use -90 degrees; strings used +90), so
  the lanterns formed vertical columns and big blobs close to the camera
  (`src/circuit-kit-layout.js`). They now hang across the street, tied at the
  shopfronts (`beyond`), and a circuit may turn a kit piece's own glow down
  (`kitLook`, `src/track-kits.js`): the paper lanterns glow at 1.1 instead of
  2.8 of their stored strength.
- **Small soft lights** (new `src/night-glows.js`, one additive point cloud,
  `glows` and `streetLight` in the circuit): a small halo on every lantern, red
  and green lights on the boat funnels with stern and cabin lights and a dim
  copy on the water, a halo on each neon sign, the Lantern Tower's lamp, and a
  halo on every street lamp head. Lights stop growing at a few dozen pixels and
  fade out inside a few metres, so they never become bloom balls.
- **Street light pools.** Sodium through the old town, white elsewhere, one
  pool under each lamp (`streetLight`, drawn with the existing road glow in
  `src/circuit-water.js`). Two old bugs were found on the way: the road glow
  quads were single-sided and faced down, so they had never been seen; and the
  night path's own lamp pools are flat 10 by 22 m planes that cut into the road
  on every bend and climb (the tan wedges in the first review). A circuit with
  `streetLight` hides those flat pools (`src/scene-lighting.js`); the new pools
  are grids that follow the road's bends and slope.
- **Water.** The harbour and reservoir were drawn near black. The night water now
  mirrors the sky at a low angle with a slow warm shimmer of town lights, keeps
  the moon glitter, and shows as a navy band beyond the fence from the chase
  camera on the Seafront, Reservoir Run and Harbour Road.
- **More neon:** signs every 30 m instead of 46 m through the old town.
- **Review tool.** A circuit may name views for the review sheet
  (`reviewFrames: [{key, label, s}]`, `tools/track-review.mjs`); they replace the
  evenly spaced filler frames. Harbour names the harbour, the tower and both
  reservoir pools. Circuits that name none are unchanged.

## Look sheet

`docs/board/looks/p4-harbour/round-1.jpg`, the 16-frame review sheet after the
changes (High quality, chase camera, test driver).

## Checks

Lane tier 390/390 (`--jobs 4`) and `npm run build` pass on the lane commit.
`test-circuit-harbour` 13/13, `test-track-review` 57, `test-p4-kits` and
`test-circuit-layouts` pass unchanged. Every placement, including the 96
re-turned lantern pieces, passes the loader's own clearance checks with the real
files.

Frame check (`node tools/browser-harness.mjs scenario harbour-night`, 11 October
2026, 17:57, no other gate, build or browser check running, eight cars,
delivered frames):

| View | High p50 / p95 | Performance p50 / p95 |
| --- | --- | --- |
| Mid race | 17.9 / 18.1 ms (0 slow frames, 2,431 draws) | 17.7 / 18.2 ms (0 slow, 1,830 draws) |
| Old town | 18.0 / 18.5 ms (5 slow frames, 3,039 draws) | 17.7 / 18.2 ms (0 slow, 2,357 draws) |

All within the 18.5 ms limit; High in the old town sits right at it (the same
view read 18.1 ms before this pass), so the contact-shading pass trim named in
the earlier note is still the first lever if that view ever drifts over. The
run-log line is left to the integration folder's own pending edit.

Headlights are on all eight cars on the grid (checked from the front), nothing
to change there.

## Changed assertions

None.

## Removed

The lantern strings' wrong quarter turn. Nothing else replaced; the shared
lamp pools are only skipped on a circuit that supplies its own (still used by
every other night circuit).
