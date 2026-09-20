# Off-road driving and Titan Freestyle Playground

20 September 2026. This update extends the existing fixed-step browser game. It does not install Unreal or a second physics engine. The aim is readable, playful arcade driving with shared visual and physical surfaces, not a full rigid-body or soft-body vehicle simulator.

## What players can do

- Read horizontal jump length and airtime beside current/peak jump height. A landed jump stays visible briefly; pause freezes the readout. Distance is measured between actual world positions, not estimated from speed.
- Take Titan Monster and Dusthawk Rally beyond the normal off-road bounds on every course. They can turn around and return to the road. Ordered race gates still apply; leaving the road cannot automatically complete a lap.
- Climb actual mountain triangles and small rocks. Titan has a 24 m continuous climb budget, a 10 m/s upward rate and a 1.65 maximum grade. Dusthawk has a 16 m budget, 7 m/s rate and 0.95 grade. These generous limits are intentional arcade tuning. Sideways travel cannot erase accumulated ascent.
- Climb rocks up to a 2.25 m envelope in Titan or 1.15 m in Dusthawk. Larger rocks and excessive slopes can tip them. Forward and reverse approaches tumble downhill in the appropriate direction, then recover. Buildings still stop a rolling truck.
- Crush smaller traffic cars, rivals and police with Titan when the truck initiates a substantial contact or lands on them. The wreck keeps its flattened cabin, bent panels, damaged windows and splayed wheels. Titan can drive over its remaining body. Another Titan remains a heavy collision, not a flattened passenger car. NPCs still yield when blocked.

These capabilities apply outside the playground too. They intentionally change off-road-car trajectories and contact outcomes; ordinary road-car rules and all fifteen existing course scenes are preserved. Existing best-time classes are retained, so an old off-road record may have been set under earlier handling. New ghosts store optional ground height and terrain attitude; old recordings remain readable.

## Untimed practice

**Titan Freestyle Playground costs 900 CR** in the course garage. Any owned car can enter an owned course; Titan is recommended for crushing and climbing. Course access and drivers remain separate credit purchases. See [course access and save migration](COURSE_ACCESS.md).

The quarry contains three jump sizes, twelve empty salvage cars in three lanes, seven progressively larger rocks, a 44 m summit challenge and a broad mountain perimeter. Stands, zone boards, edge markers and the map identify activities. There is no timer, race finish, lap target, police, rival, credit reward, personal best or leaderboard. Crashes recover and practice cannot farm career milestones. Restart and Main Menu remain single-click actions.

## Art direction and reference

The original [reference board](../public/assets/reference/titan-freestyle.png) was generated with the image-generation tool in **generate** mode. It is art direction, not a gameplay screenshot. This pass reuses existing original truck, salvage, rock and mountain assets. New dirt hills and modular structures are authored in code so driving and rendering use the same definitions. No commercial game assets were copied and no new Blender mesh pass is claimed for this update.

Official inspiration: Monster Jam Showdown distinguishes freestyle tricks such as wheelies, flips and donuts in its [freestyle trailer](https://www.monsterjam.com/en-us/news/monster-jam-showdown-freestyle-video-game-trailer/). That informed an open, retry-friendly practice layout. This version implements jumps, crawling, crushing and recovery; it does not claim dedicated wheelie, bicycle or player-controlled backflip scoring.

Reference prompt brief (condensed):

> Create an original, buildable browser-3D monster-truck practice arena concept board. Landscape composition with a large elevated three-quarter view and two ground-level details. A broad open quarry dirt floor, an outside loop approach, three earth launch/landing lanes, two rows of unoccupied salvage cars, a progressive rock garden and a steep rounded climb mound. Show an original orange monster truck. Use modular timber/steel stands, striped concrete blocks, wide runouts and access gaps, sparse floodlights, sandstone cliffs and afternoon light. Detail tires compressing an empty car roof and a truck climbing rocks. Refined realistic low-poly style, coherent ground, weathered steel, dirt grooves and a modest mesh budget. No commercial logos, Monster Jam branding, HUD, watermark or people in crush cars. This is art direction, not a screenshot.

Iterations were driven by browser and geometry checks:

1. Replace a folded oval terrain ribbon with continuous world-space ground. Share two-metre hill triangles with wheel support.
2. Round the tall climb mound, brighten the dirt, broaden the quarry silhouettes and extend the distant floor so the arena does not end in a visible square.
3. Add a single-atlas set of readable practice boards and larger jump-edge markers. Keep stands and rock detail batched.
4. Retain fine triangles around hills only. The flat floor needs coarse quads; texture detail stays intact.
5. Review real jump, rock-crawl, rollover and road-traffic crush fixtures. Correct the rock-review duration so it shows a small-rock crossing before the truck reaches the intentionally oversized next boulder.

## Performance and safeguards

Practice ground falls from **416,120 to 26,060 triangles**, a 93.7% reduction. Every rendered triangle is tested against the physical height surface. Fine/coarse seams lie on a flat plane; there are no hidden skirts or substitute launch impulses. Practice structures, signs, rocks and quarry mountains use eleven detail draws and 88,110 triangles.

The empty effects pools no longer upload or draw inactive particles, marks and debris. An isolated 10,000-update CPU measurement improved from 22.73 ms to 9.85 ms; this is not a 57% increase in game FPS. Cached mountain queries match the visible Float32 triangles. No extra full-screen sharpening pass was added: existing anisotropic texture filtering and High-quality edge smoothing remain enabled.

At 1280×720, the final isolated rock-crawl and climb views reported about 60 FPS with 16.9 ms frame p95 and no >33 ms stalls in the rolling 240-frame sample. The rock view submitted 836,806 triangles versus 1,616,926 before adaptive ground; render-submission CPU p95 was about 5.7 ms. These are short local observations, not a guarantee across hardware or every course. First scene setup and shader work still cause loading delays.

The heavier Neon Docks approach reported 51 FPS / 33.4 ms frame p95 in High and 60 FPS / 16.8 ms in Performance, with 2.90 M versus 1.75 M submitted triangles. Harbor High reported 48 FPS / 33.4 ms p95. These observations identify remaining city-rendering headroom; they do not establish an improvement against an old build. Existing course scenery and High-quality detail were not removed to raise the numbers.

Tests cover fixed-step 30/144 FPS parity, limits, reverse climbing, solid-wall recovery, crushed police enforcement, wreck support, pooled graphics reset, ghost validation, account isolation and practice exit/restart. All old complete-scene signatures remain exact. See [verification](VERIFICATION.md) for the final suite and live-build record.
