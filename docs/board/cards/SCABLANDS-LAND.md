# SCABLANDS-LAND

Found by Claude on 12 November 2026 from pictures of the Everburn's jobs taken in the game (a Sonnet helper took
them). Kyle, 11 November: "we also want the wasteland and scablands to have really compelling assets and gameplay."

Owner: Claude (the look, the first example of each drawn thing, every verdict). Built by Sonnet helpers.

## What the pictures show

The Scablands is an empty tan bowl, and three of its faults are plain mistakes, not taste.

1. **Places draw white.** `tintown.glb` and `kit.glb` carry no colour for any material (10 of 10 and 12 of 12), and
   `everburn.glb` and `boneyard.glb` lack it for 4 of 9 and 3 of 7. Their recipes made colour with a texture node, which
   the exporter does not write (the fault the furnace had; `docs/ART_LINE.md`, "A model that is black in the game").
2. **The road stands up as dark walls.** The dirt road is a round tube 2 km long, half buried. Where the ground dips
   it shows as a wall many metres high, and it blocks the view through the Boneyard.
3. **The far ground pokes through the near ground** by up to 13 m, because the far ground is a coarse copy of the
   same land drawn in the same place.
4. **The ground is one flat colour** from edge to edge.
5. **Tin Town has no gate,** though the story now burns one, and Tin Town itself is a few small blocks.

## Settled design (Claude)

- **Colours:** each of the four recipes writes plain base colours, as `old-smoke-photo.py`'s plain parts and the
  fixed vehicles recipe did, and its model is rebuilt. No new shapes in this card.
- **Wear drawn in code** over those plain colours on every Scablands place: `createScrapWear` from
  `src/world/scrap-look.js`, with each place's own ground point as the wear's origin, so that rust, runs, grain, soot
  and road dust appear without a single picture file.
- **The ground:** `createGroundLook` from the same file (written by Claude on 12 November) on the ground's material:
  drifts of pale and dark sand, cracked earth, wind ripples, gravel, and rock with strata on steep ground.
- **The road** becomes a flat ribbon laid on the ground along the same line, 1.2 times the road's width, raised 6 cm,
  following the ground's height at each cross point, with its own darker packed colour, two ruts and the ground look.
  Nothing a car drives on changes: the ground's height is untouched.
- **The far ground** is dropped 40 m wherever the near ground covers it, and left as it is elsewhere.
- **Tin Town's gate** at (575, 62), built in code from plain shapes with the wear drawn over them: two posts of stacked
  drums and girders 7 m tall, a beam across with three hanging lamps and a tin sign reading TIN TOWN, and 14 m of
  corrugated fence each side, standing across the road with a 9 m opening. When the story burns it, the fire stands on
  the gate itself (card RUN-GAS's follow-up makes the fire larger).

## Result (built by a Sonnet helper; reviewed by Claude, 12 November 2026)

Merged into Claude's branch. Sheet: `docs/board/looks/scablands-land/round-1.jpg`. Change note:
`docs/changes/SCABLANDS-LAND.md`.

- Colours: every material in the four models now arrives with its colour (Tin Town 10 of 10, kit 12 of 12, Everburn
  9 of 9, Boneyard 7 of 7). Wear is drawn over every place; the ground look is on all the ground.
- **Found on the way and fixed:** the Boneyard's model was exported turned a quarter turn, so every plane stood on
  end against a standing slab of dirt (the fault ART_LINE calls "a vehicle standing on its nose"). The near ground was
  redrawn 350 m and 250 m out of place whenever the open marks changed.
- The road follows the ground as it is drawn, because the drawn ground is up to 8 m off the land's own height at the
  foot of the ridges. Nothing a car drives on changed; no replay fingerprint or world signature moved.
- The far ground uses a finer grid whose lines fall on the near ground's edge, and lies below the near ground at
  every sampled place.
- The gate stands at (575, 62) across the furnace's path, with no collision.
- Claude then softened the cliff strata and the sand ripples in `createGroundLook`, which the pictures showed as
  stripes and a pale band.

Open on this card: a second sheet after Claude's two changes; Tin Town's size; collision for the gate's posts; the
frame check before the Scablands opens beyond the story's switch.

## Tin Town grows (settled by Claude, 12 November 2026; with the builder now)

The design page calls Tin Town "tin shacks stacked on scaffolds around a cold forge", and the pictures show a few
small blocks. A second piece, drawn in code the way the gate is (`src/world/tin-town-shacks.js`): about 45 shacks of
three sizes, stacked one to three high on girder scaffolds with walkways and ladders, in six clusters on a ring 35 to
80 m from the town's centre, with alleys too narrow for a car, a water tower, a radio pole, washing lines, lamps by
doors, and a fence joining the clusters to the gate. Every job's road stays clear by 10 m and the arrival place by
24 m. One solid box for each cluster and two for the gate's posts; at most 12 draw calls and 60,000 triangles.

### Tin Town's shacks: built, merged and judged (12 November 2026)

45 shacks in six clusters, a water tower, a radio pole, washing lines, lamps and a fence, in 4 draw calls and 23,000
triangles. The alleys and the view from the gate read as a settlement. From 200 m the town is still a thin strip under
the cliff.

Settled by Claude after the pictures:

- **The gate faces north and south** (the builder's finding: no other turn clears every road). **The furnace does not
  drive through it.** Its path stops in front of the gate at (575, 82), burns it from there, and turns west along the
  outside of the fence to (430, 70). So the furnace's path keeps 8 m from the gate's posts like every other solid.
- **The Boneyard road passes squarely through the gate:** a new place at (575, 112) before it. A road through the
  gate must keep 3.4 m from each post (the opening is 9 m and Big Bess is 2.8 m wide); every other solid still needs
  8 m.
- **The fire takes the whole gate** (Claude's drawing): a flame up each post from the ground, three over the beam,
  four along the fences, in place of five thin flames on the beam that read as candles.
- **Seen from far off:** chimney smoke from three shacks, a 16 m watchtower with a lamp, and the shacks' sheet
  colours brought toward the old model's rust and orange.

**Changed assertions, reviewed by Claude (rule 18).** In `tools/test-scablands-scene.mjs`, the gate fire's checks of
12 November (five flames, 6 to 8 m tall, spread along 18 m, standing on the beam, five sets of sparks) are replaced by
checks of the new fire: nine flames, one at least 9 m tall up each post from the ground, three over the beam, a reach
of 34 m or more centred on the gate, nine sets of sparks, and the fire standing at the gate's own place from the
ground up. The old checks were one day old and described a fire that the pictures showed to be wrong. In
`tools/test-old-smoke.mjs` and `tools/test-run-gas.mjs` the builder let a path come within 3.4 m of the gate's two
posts and let the furnace's piece leaving the gate touch them; the second allowance is being removed with the
furnace's new path, and the first stays for roads that pass through the gate.

### Round 2 merged (12 November 2026)

The furnace stops in front of the gate at (575, 82) and keeps 8 m from every solid, posts included (path 3,232 m,
3 minutes 51 seconds at the base pace). The Boneyard road passes squarely through the gate by way of (575, 112) and is
1,259 m. Tin Town has its watchtower, chimney smoke and rust colours. Sheet: `docs/board/looks/scablands-land/round-2.jpg`.
Checks on the builder's branch: furnace rules 616, run-gas 1,088, the Medium and Easy drivers' targets, lane tier 48
of 48, build, two browser checks; no replay fingerprint or world signature moved.

Open on this card: the town seen from beyond 120 m; a gate that chars as it burns; the frame check before the
Scablands opens beyond the story's switch (the shacks, wear and ground are all drawn every frame).

## Round 3: the well, the Dead Mall and the Boneyard (settled by Claude from the sheet, 12 November 2026)

Sheet and faults with names and positions: `docs/board/looks/scablands-land/round-3.jpg` and its review note. Verdict:
each place reads as toys on a table. The fixes, in this order, one commit each; the builder stops an item after thirty
minutes and says so.

1. **The Everburn's fire and smoke are drawn in code.** The seven spheres and the faceted flame solids go. In their
   place, with `src/world/scrap-look.js` and the furnace's fire as the example: flame tongues 5 to 7 m tall on the
   derrick's top, firelight on the ground under it, and a column of smoke puffs that rises to about 90 m and leans
   with one fixed wind, so that the well is still the landmark seen from the mall and the Boneyard. Whatever decides
   today when the flame shows keeps deciding it. Beyond 280 m the fire and smoke are still drawn and the well's
   stand-in is a thin dark mast the height of the derrick, not a 32 m box.
2. **The mall's sign lettering sits on its boards** and reads the right way round from outside. Fix the cause, not
   the three positions, and add the kind of fault to `docs/ART_LINE.md` if it is a new one.
3. **The mall's nine flat rocks go.** The four drifts at the entrance take the ground's own surface and a low, wide
   shape; if they still read as cushions they go too.
4. **The Boneyard's dirt slab is not drawn.** The ground is drawn in code already.
5. **The three wrecks differ** by where and how they lie: three different headings, one rolled onto a wing, uneven
   gaps, no engine pod sunk more than a hand's depth. All three are solid where they are drawn, and both roads stay
   6 m clear of every solid. Big Bess's resting place moves 5 m clear of every wreck.
6. **The mall is drawn in fewer pieces.** Its 254 meshes are merged by surface at load if the scene already has a
   way to do that; the draw calls before and after are recorded.
7. **The well is not alone on its disc.** Eight to twelve props from models the Scablands already loads (drums,
   pipes, a shack, a tank) stand in one cluster beside the apron, away from the raiders' way in, the furnace's
   parking place and the car's start in job 6.

Not in this round: the road ribbon lying under the drawn ground near each place, the cliffs' saw-teeth, the hard
edge between road and sand, and the collision boxes larger than the well and the mall. Each changes ground or job
rules and gets its own look.

Checks: `test-scablands-scene`, `test-scablands-land` if it exists, `test-run-gas` (both roads clear of every
solid), `test-everburn-easy`, `test-old-smoke` untouched, lane tier, build, the `everburn-well`, `run-gas` and
`field-battle` browser checks, and a sheet `round-4.jpg` with the same twelve views. No frame check (rule 9); the
render numbers of each place are recorded before and after.

## Round 3 result (a Sonnet helper; judged by Claude from `round-4.jpg`, 12 November 2026): merged

All seven fixes are built, one commit each. Where the build differs from the list above, accepted by Claude:

- The mall's four drifts still read as cushions after reshaping, so they are gone with the rocks.
- The lettering's cause was text aligned left and then turned half round, which threw each word 6 m off its board:
  fixed in the mall's recipe, the model rebuilt, and the fault added to `docs/ART_LINE.md`.
- The east wreck lies beyond the Boneyard road at (466, 338), because the furnace's path and the road left no room
  in the old row. Each wreck is solid as the box round it (the game's solids are boxes that do not turn), so the
  boxes are larger than the wrecks. Roads stay 8 m clear of every solid, as the existing checks ask.
- Big Bess rests at (464, 262). The well's eleven props are cut from the Ridge's kit and have no collision.
- The mall is drawn in 7 pieces where it was 254: its views fell from about 740 draw calls to about 250.

**Changed assertions, reviewed by Claude (rule 18),** all in `tools/test-scablands-scene.mjs`: the smoke check looks
for the drawn fire and smoke, since the spheres are gone; the count of solids is 18 where it was 16, since one box
became three; Big Bess's resting place is the new one; and the check that the mall has rubble became a check that it
has none. Each follows a thing this round removed or moved by design; nothing is loosened.

Next round (not started): a redder flame core seen close, a boarded front and a sign on the mall's road side, larger
things beside the well, stand-ins beyond 280 m that look like the place, and the three items left out above.

## The fault found when the round 3 fixes met Codex's Everburn work: fixed (12 November 2026)

The `everburn` browser check threw "Cannot read properties of undefined (reading 'isReady')" on the combined branch
every time. Cause, measured by the helper in an unminified build: an old race in `src/render3d.js`. Leaving the
Wasteland retired the combat explosion effects and released their materials at once, while three's `compileAsync`
poll from the job's start was still reading them. Every other retirement in that file already waits for the warm-up
to be idle; this one did not. The round 3 fixes only made the warm-up long enough for the check to leave inside it.
Fix (commit e9e23a123): the effects leave the scene at once and their materials are released when the warm-up is
idle. `everburn` passes 3 times in 3; the four warm-up tests pass (304, 39, 143, 65); lane tier 84 of 84; build.


## Round 4: a larger land (direction from Kyle, 14 November 2026; settled by Claude)

Kyle, after playing the Everburn's first two jobs: "The amount of ground covered was minuscule
to get to Tin Town. It seems this world is tiny and safe." And, asked about the order of the
remake: expand the Scablands first, so there is a larger canvas to work on. This round goes
before the rest of EVERBURN-REMAKE.

### What is wrong with the land today (from the files)

- It is 1,400 m by 1,000 m. Eight named places stand on one oval, 600 m east and west of the yard
  and 430 m north and south. A car at 200 km/h crosses it in 25 seconds.
- It is flat. The ground rises and falls by about 2 m, so every place is in sight of every other
  and a straight line to anywhere is open.
- All ground is the same to a car. A road is a picture; rock is as fast as road.
- The car does not feel height. `scablandsHeightAt` is read for drawing and for regions only.

### Settled

1. **Size: ten times as far each way** (Kyle, the same day, after Claude had settled four times:
   "When our race courses run many km, then the Scablands must be even larger. The art must
   reflect a new land, the danger must be felt from game play. Route choices must be decisions
   the player should weigh."). The land becomes 14 km by 10 km. Tin Town stands 6 km from the
   yard and 7 to 8 km by road, which is longer than the longest lap in the game (6.7 km); the
   road round all eight places is about 35 km. The places keep their own size; only the ground
   between them grows. Positions are held by name (item 6) so the land can grow again.
   Not yet known: the car's position in this venue is kept against an oval frame with a floor
   2,000 m to each side (`SCABLANDS_LAYOUT`). Slice 1 finds out what that frame needs for a land
   this size, before anything else is built on it.
2. **Ground that makes routes.** Roads are fast and smooth. Open rock is rough and slower (about
   six tenths of road speed). Some ground cannot be crossed at all: scarps, a dry river's banks,
   wreck fields. These are solid and drawn as what they are. A road goes round them, through a
   gap or over a crossing, so the way to a place is a route with a narrow point, not a line.
3. **A place is not seen from the last one.** Rises, mesas and scarps stand between places, tall
   enough to hide what is behind them. Whether the car slows on a slope is a later question;
   this round a rise is either gentle and only seen, or steep and solid.
4. **Something beside every road.** No more than about 300 m of road without a thing to steer by
   or look at: a wreck train, a line of pylons, a camp, a toll post, a crossing, a sign. These
   are placed along the roads from a seed, from models the game already has, with a few placed by
   hand where a job needs them.
5. **Drawn near, not everywhere.** The detailed ground stays the size it is now and moves with
   the player; the coarse ground covers the whole land; things are drawn by distance. The frame
   limit is unchanged (Performance p95 18.5 ms) and is checked on the first slice, before any
   scenery is added.
6. **Places by name, not by number.** The jobs hold some 40 positions written as numbers. Each
   becomes an offset from a named place or a named point on a road, so the land can be moved
   again without touching a job.
7. **The yard stays as players have it.** The Home Yard that is in the game today is drawn from
   this scene. What a player sees from the yard changes only in the far distance.

8. **A new land, in regions.** The Scablands stop being one cracked plain. Each region has its
   own ground, drawn in code, its own things beside the road, and its own way of driving:
   - **The scab plates:** broken black rock. Slow and rough. Nothing on wheels follows fast.
   - **The salt pan:** white, flat, fast, and open for kilometres. A car there raises a dust
     plume and is seen from far off.
   - **The dry river:** a winding bed between banks a car cannot climb. Hidden from the plain,
     soft in places, with few ways in and out.
   - **The burn:** blackened ground round the Everburn where gas vents flare. The short way to
     the well, and the ground itself is the danger.
   - **The wreck fields** round the Boneyard and **the sand** round the Ships: narrow ways
     between solid things; soft ground that drags a car down to a crawl.
   - **The roads:** graded, fast, and held by whoever holds them.
9. **Danger that is felt in the driving.** Every danger does something to the car, the load or
   the way ahead that the player feels at once and can answer by driving: a ram that turns the
   car and shakes the load, a toll bar that must be burnt or paid, a vent that flares on a
   rhythm the player can read, sand that takes the speed away, riders who come because the car
   was seen. A danger is never only a number or a spoken line. What is lost can be won back
   (the load, time, pay, armour), and a wrecked car is towed home, not ended.
10. **Routes the player weighs.** Between any two places there are at least two ways that differ
    in length, speed, ground and who is on them. The map shows each way and what is known of it
    before the player sets off (a toll here, open ground under watch there), and what is known
    changes: the Ash Men's hold on a road grows with the feud, so the way that was right last
    week may be wrong this week. A job never has one right road.

### What moves, and is re-recorded with a reason

Scablands world signatures, the positions pinned in the Everburn, gas run and field battle
suites, and the replay fingerprints of those jobs. None of that is in the game for players
(both switches are `dev`). Race replays and the Scrapdome's own fights must not move.

### Slices

1. **Size and frame time:** the places moved out, positions by name, the detailed ground
   following the player, the coarse ground over all of it, the ridge at the new edge. Flat and
   empty on purpose. Ends with a frame check and Claude driving yard to Tin Town.
2. **Routes and regions:** the road net as data, each region's ground and how it drives, the ground that cannot be crossed, the rises
   that hide places. Ends with Claude driving every road and trying every short cut.
3. **Beside the roads:** the seeded things and the hand-placed ones. A look round, sheet to Kyle.
4. **The map:** the big and small maps redrawn from the same road and ground data.

Order changed on 14 November after Kyle's second note (below): 2a, then 2b and the map (4) side
by side, then 2c (hill country), 3 (beside the roads) and 2d (buildings fall).

### Slice 1 result (a Sonnet helper; reviewed by Claude, 14 November 2026): merged, switches off

The land is 14 km by 10 km. The eight places stand ten times as far from the yard; the ridge and
wall keep their size at the new edge. Full note: `docs/changes/SCABLANDS-LAND.md`, "Round 4
slice 1".

- **The unknown in item 1 is answered.** The oval that a car's position is kept against needs no
  change in size, and no other arena and no car physics changed. One fault was found and fixed:
  the oval's length (3,290 m) was not a whole number of its 8 m steps, which put a far car up to
  22 m off; it is 3,288 m now. The floor is widened to 9,000 m for this land only.
- **Item 7 was wrong.** The Home Yard that players have is the Scrapdome yard of the Hidden Road
  and is not drawn from this scene. Nothing a player can reach changed.
- **Places by name.** `src/world/scablands-names.js`; a check moves each place in a copy of the
  table and sees that what belongs to it follows, and a scan forbids a bare position in the job,
  scene and road files.
- **Drawn near.** One window of detailed ground (1,400 m by 1,000 m) follows the player on a
  fixed lattice; coarse ground covers the rest; places are drawn within 1,800 m.

Seen by Claude in a visible browser window (scenario `scablands-size`, Performance, five spots
from the yard to Tin Town's gate): the ground is continuous, no edge of the window shows, Tin
Town is seen from a kilometre off and reads at its gate. Frame times there were 18.1 to 18.3 ms
p95 with 128 to 277 draw calls and 183,000 to 273,000 triangles, another job running, so this is
a guide and not a frame check. A frame check under rule 8 is owed before any of this is shown to
a player (rule 9: nothing here can be reached); the nightly check times the Scablands.

Claude did not drive it in real time: the app's own browser pane was hidden and the game in it
would not load. A check drives the 6 km at 100 mph with no jump. Kyle's try, and Claude's drive
in a window, come with the next slice, when there is something on the land to drive round.

Seen and for the next slices: the ground's cracks repeat as a visible grid a few hundred metres
ahead; the far ridge is a flat blue shape; the old dirt ring lies round the yard as a dark band
and joins nothing; the delivery road bends by 80 degrees between legs kilometres long; at the
ridge's foot the coarse ground stands a few metres off the detailed ground.

**Changed assertions, reviewed by Claude (rule 18).** About 80, listed by suite in the change
note. Each is a position, length or time that moved because the land grew, re-recorded as a
claim of the same kind from the land's own names. None is loosened, with these judged one by one:
- The big map may leave "TIN TOWN" off in job 2 where the lamps lie within four pixels of it.
  Accepted until slice 4 redraws the maps; the two exemptions go then.
- The scripted drivers' time limits were raised (a limit on the driver, not a claim about the
  game).
- `test-ember-pot`: a fast drive on the delivery road now arrives alive, not bright. Accepted for
  this slice only. The rule Claude wants is the opposite and is set in slice 2 (below).

**Numbers left long, on purpose.** The furnace's chase is 43 minutes, its bolt after a hit is 8
minutes of nothing, and Big Bess's drive is 23 to 34 minutes. Those belong to jobs 4 to 6 and
the gas runs, all hidden. Each is set when its job is remade on the finished land, not now.

**Older browser scenarios.** Six still put the car at the old land's positions (`everburn-ember`,
`everburn-frames`, `everburn-well`, `run-gas`, `field-battle`, `everburn-side-jobs`). See "Open"
at the end of this round.

### Slice 2 design (Claude, 14 November 2026)

East is +x and south is +z. Positions below are a first drawing in metres from the yard; the
builder writes each as a share between named places, and may move a point by up to 200 m to make
a road run well.

**What is wrong in the driving today.** In the Scablands every metre of ground drives the same:
the game gives one grip and one top speed for the whole floor (`_drivingSurface` in
`src/sim-driving.js`), about 185 km/h for the fastest car. A road is only a colour. So no route
can be better than a straight line.

**The dry river divides the land.** It runs from the Dry Dam east past the yard's north side,
turns south between the yard and Tin Town, and leaves by the south edge east of the Dead Mall:
(-4240, -3040), (-2600, -2500), (-1200, -1900), (400, -1700), (1800, -1500), (2900, -600),
(3300, 500), (3000, 1700), (2400, 2900), (2000, 4200), (1900, 5000). The bed is 120 m wide and
8 m below the plain. The yard, the Dead Mall, the Everburn and the Iron Line are on one bank; Tin
Town, the Boneyard, the Ridge and the Ships are on the other. Every trip from the yard to those
four crosses it, and there are five places to cross:

| Crossing | Where | What it is |
| --- | --- | --- |
| The Girder Bridge | (3250, 300) | The East Road's bridge, two cars wide. The Ash Men hold it. |
| The Steps | (3050, -250) | Rock ledges down and up on the scab plates. Slow, or a hard jolt. |
| The Wash | (2700, 2300) | A fallen bank on the Boneyard Road. Soft sand at the bottom. |
| The Pipe | (1000, -1750) | An old pipeline on the Salt Road, one car wide. |
| The South Ford | (2150, 3700) | Shallow banks between the Dead Mall and the Boneyard. |

A car can also drive along the bed between any two of these, hidden from the plain.

**The road net** (graded roads, 14 m half width, curved so a car at full speed can hold them):

- The East Road: yard, the Halfway Camp (2000, 1100), the Girder Bridge, (4600, 500), Tin Town's
  gate. About 7 km.
- The Boneyard Road: the Halfway Camp, the Wash, the Boneyard.
- The Tin Road: Tin Town, (5200, 1500), the Boneyard.
- The Salt Road: yard, the Pipe, then a fork to the Ships and to the Ridge across the salt pan;
  the Ridge Road comes down the east side, (5300, -1500), to Tin Town.
- The West Road to the Iron Line; the Dam Road to the Dry Dam; the Burn Road to the Everburn by
  (-2000, 1500); the Mall Road to the Dead Mall; the Mall to the Everburn; the Mall to the
  Boneyard over the South Ford.

The old dirt ring round the yard and the present delivery road go. Jobs name roads and points on
them by name.

**Regions.** Each is data (a band along a line, a disc round a place, or an outline), read in
this order, the first that holds a point winning: roads, the river bed, the wreck fields (1,300 m
round the Boneyard), the sand (1,500 m round the Ships), the burn (1,600 m round the Everburn,
uneven), the salt pan (the north-east, between the river and the north edge, from the Pipe to the
Ridge's foot), the scab plates (both banks from the yard's east side to Tin Town, between the pan
and the wreck fields), and the flats (everything else: the cracked earth the land has now).

**How each drives.** Top speed is a share of what the Scablands floor gives a car today.

| Region | Top speed | Grip | The ember is safe up to | What the player feels |
| --- | --- | --- | --- | --- |
| Road | 1 | .95 | any speed | Smooth and fast. |
| Salt pan | 1.25 | .80 | any speed | Fastest ground in the land; long slides; a dust plume. |
| Flats | .75 | .90 | 90 km/h | Plain going. |
| Scab plates | .45 | .85 | 50 km/h | The car shakes and will not go fast. |
| River bed | .60, soft patches .30 | .75 | 70 km/h | Hidden; the soft patches grab. |
| Sand | .35 | .60 | any speed | The speed drains away. |
| The burn | .75 | .90 | 90 km/h | As the flats; its vents come with the Everburn's job. |
| Wreck fields | .75 | .90 | 90 km/h | As the flats; the wrecks are solid in slice 2b. |

Only the Scablands changes: race courses, the Scrapdome and every replay stay as they are. The
change of ground is felt at once: the engine note, a shake of the camera on scab rock and a
different dust colour for each region (no new sound files; name a cue for each change).

**The ember on this ground** (replaces the helper's working number). Cold takes 0.14 a second.
What must be true, and is checked by driving each in a test: a clean drive on the East Road
arrives bright; the scab short cut held at 50 km/h arrives alive and not bright; a car that
never passes 30 km/h goes out before Tin Town by any way.

**What the player weighs, yard to Tin Town:**

- The East Road: 7 km, about two and a half minutes. The bridge is held.
- Across the scab plates: 6 km straight, seven minutes with the pot, down and up the Steps, in
  the furnace's sight.
- By the salt pan: 10 km, about three and a half minutes, over the one-car Pipe; a car on the
  pan is seen from the Ridge.
- Along the river bed from the Wash to the Steps: hidden from bridge and furnace, slow and soft.

**Rises.** Low rises, 20 to 40 m high and 600 to 1,000 m across, stand between each place and the
next so that a place is not seen from the last one. They are drawn height only and gentle enough
to drive over. Steep ground is slice 2b.

**Drawn in code.** Each region has its own ground in the ground's own shader: black broken
plates; white salt with a pale crust pattern; ochre cracked flats; a grey river bed with rippled
sand; rust-stained dirt in the wreck fields; pale dunes of sand; blackened ground in the burn.
Edges between regions are uneven, not straight lines. The cracks must not repeat as a visible
grid at any distance. Roads are graded dirt with ruts and a berm, not a dark band. Gritty, never
toy-like.

**Two builds.**

- **2a: regions, roads and how the ground drives.** All of the above. The river bed is drawn sunk
  with its banks but a car can still cross anywhere (so this build alone does not yet make
  routes).
- **2b: ground that cannot be crossed.** Designed below ("Slice 2b design").

### Slice 2a result (a Sonnet helper; reviewed and corrected by Claude, 14 November 2026): merged, switches off

Built as designed. Full note: `docs/changes/SCABLANDS-LAND.md`, "Round 4 slice 2a". Sheet
`docs/board/looks/scablands-land/round-5.jpg` with Claude's review beside it.

- **Twelve roads, 54 km**, curved so that the quickest car in the game holds every one within
  2.4 m of its line at full speed. The old ring and the delivery road are gone.
- **The dry river** with its five crossings, cut 8 m into the land. A car can still cross it
  anywhere until slice 2b.
- **Eight kinds of ground**, each drawn in code and each driving by the design's table. A car at
  full throttle settles at about 194 km/h on a road, 240 on the salt pan, 146 on the flats, 96
  on the scab plates and 74 in the sand.
- **Sixteen low rises**, 26 m high (30 m made a road too steep), so a place is not seen from
  the last one.
- **The ember** reads the ground's safe speed; cold is 0.14 a second. Its three drives hold: the
  East Road at 150 km/h arrives bright (72.5 left); the scab short cut at 50 km/h arrives alive
  (39.1); a car held under 30 km/h goes out before Tin Town (at 5,966 m, with only six seconds
  to spare; set again when the job is remade).
- **Felt:** the camera shakes on scab rock and in the river bed, more with speed; the dust takes
  the ground's colour; nine sound cues, one for each ground (`world.ground.road`, `.flats`,
  `.salt-pan`, `.scab-plates`, `.river-bed`, `.river-soft`, `.sand`, `.wreck-fields`, `.burn`),
  made from sounds the game has and not yet heard by anyone.
- The East Road is 7.8 km, not 7: the bridge stands where the river runs north to south.

**Two corrections by Claude at the merge.**
1. *A car leaving a road was stopped as if by a wall.* To make a car settle at the table's
   speed the helper raised the pull toward the ground's speed from 1.4 to 4 a second. A car
   coming off the salt pan onto rock then shed 9 km/h in one step, more than twelve times a
   hard brake, and the ember's rule read that as a hit. The pull stays 4 a second near the
   ground's speed and never takes more than 40 mph in a second, so a car is dragged down over a
   second or two. With that, the size suite's limit on a step's change of speed is back at 2 mph
   (the helper had raised it to 3.2).
2. *The burn read as lava.* Redrawn as burnt ground with nothing glowing (see the look review).

**Changed assertions, reviewed by Claude (rule 18).** Listed by suite in the change note. Each
follows the land's change and none is loosened: the ring and delivery-road checks became road
net checks; the ember's road question became the ground's safe speed, and its three drives are
the design's; the starts of jobs 5 and 6 are checked as more than 60 m from any road; the rail
suite's copy of the height adds the rises and the river. Judged one by one:
- `test-p4-audio` leaves the nine new ground cues out of the old sound bank's pin, as it did
  the ember's three. Accepted: the pin guards the old records, which did not change.
- `test-scablands-size`: the step limit of 3.2 mph is refused and is 2 again (correction 1).

**Not driven by Claude in real time.** The app's browser pane was hidden again and the game
does not load in it. Claude judged the pictures from a visible window. The real drive, every
road and every short cut, is owed at the end of slice 2b, where the land first resists.

**Left for the slices that own them.** Jobs 3 to 6 and the gas runs keep straight legs between
names, off the new roads (each is set when its job is remade). A car flies off the far lip of a
bank at 100 mph and drops 8 m into the bed in half a second with no harm (2b). The Steps have
no way marked (2b). The six junk cars and three ramps of the old oval remain (2b).

### Slice 2b design (Claude, 14 November 2026): the land's shape is solid

**The fault.** In the Scablands a car does not feel the ground's shape. It drives up any bank,
drops 8 m into the river in half a second with no harm, and passes through every building,
wreck, post and fence. Kyle: "you could drive through any object".

**One rule for the ground: the shape that is drawn is the shape that is driven.** The race
courses already have the rules (`limitClimb` and `slopeSpeedDelta` in `src/offroad-physics.js`,
used by `src/sim-driving.js`); the Scablands floor skips them. In the Scablands only:

- **A slope slows a car going up and speeds it going down**, by the rule the courses use.
- **A car cannot climb ground steeper than it can grip.** It is stopped at the foot, pushed back
  and loses its speed: a hit, with the armour and ember loss a hit of that speed has. The
  river's banks (8 m in 26 m) are too steep for every car; so the bed is left only at a
  crossing.
- **A car that drives off a lip falls.** It is in the air, it lands, and the landing is a hit
  sized by the drop: about nothing under 1 m, hard at 3 m, and off the full 8 m bank it wrecks a
  light car's armour by half and puts the ember out. A fall never ends a job by itself.
- **The crossings are shaped so the rule lets a car through.** The Wash and the South Ford are
  gentle enough to drive at speed. The Steps are a rough ramp: under 25 km/h a car climbs them,
  faster it is thrown back, and the ember is safe there only under 20 km/h. The Girder Bridge
  and the Pipe have decks; off the side of a deck is a fall into the bed.
- **Jumps stay.** A car that leaves a rise or a ledge at speed flies and lands, as on the Summit
  (`docs/board/decisions.md`, "Keep these"). The three old ramps of the first oval go.

**One rule for things: everything drawn that is taller than a wheel is solid.** Buildings,
Tin Town's wall, gate posts and shacks, the Boneyard's wrecks, the mall, the well's props, the
bridge's girders, the pipeline, braziers, barricades, the radio mast. A car that meets one is
stopped and pushed out along the nearest face, keeps the speed that runs along the face, and
takes a hit for the speed that ran into it. Each thing is a box or a round post, built from the
same data that draws it (the table `SCABLANDS_SOLIDS` is test data today and becomes the real
list). Things are found by a grid, so the cost does not grow with the land. Raiders and Big
Bess obey the same things. A person on foot already cannot walk through them.

**Scarps.** Four of the sixteen rises get a steep face on one side, 12 to 20 m high and too
steep to climb, drawn as broken rock: the two rises on the scab plates either side of the
Steps (so the scab short cut is a way through a gap, not a line), one north of the Halfway
Camp, and one between the salt pan and the Ridge. A road never meets a scarp.

**Gone.** The six junk cars and the three ramps of the old oval; the test car the harness
parks 1,058 m east of the yard is found and explained or removed.

**Proved by driving at each** (a check for each kind, then Claude in a window): into a bank
from the bed; off a lip at 30, 100 and 200 km/h; up the Steps at 20 and at 60 km/h; off the
side of the bridge; into a shack, a wreck, a gate post and a girder, head on and at a glance;
every crossing by its road at the road's top speed; and each of the four ways from the yard to
Tin Town driven end to end by a scripted driver as a builder's check. Race replays and the
Scrapdome's fights must not move.

### Slice 2b result (a Sonnet helper built it; Codex reviewed and fixed it; Claude judged the look, 14 November 2026): merged, switches off

Full notes: `docs/changes/SCABLANDS-LAND.md`, "Round 4 slice 2b" and "Round 4 slice 2b: fixes after
the review". Sheet `docs/board/looks/scablands-land/round-6.jpg` with Claude's review beside it.

- **Built:** slopes pull a car by the courses' own rule; ground steeper than a tyre grips stops
  it and counts as a hit; an edge is a fall that hurts by the drop. The Wash and the South Ford
  are long ramps, the Steps are ledges with a marked way, the Girder Bridge and the Pipe have
  solid decks, frames and piers. About 200 things are solid, found by a grid; raiders, Big Bess
  and people on foot obey them. Four scarps, 12 to 20 m high. The old oval's ramps and junk cars
  are gone.
- **Codex's independent review found three real faults.** Two are put right: a job's own solids
  (the braziers) now belong to that game and go when it ends; Big Bess stops clear of every
  solid and both furnace roads are proved clear of solids and of ground too steep, every 2 m.
  The third is open, below.
- **Open fault: the river bed is a dead end under the Girder Bridge and the Pipe**, because the
  land holds one height at each place and a deck is level with the plain. It cuts the fourth
  way to Tin Town (the bed from the Wash). The cure is a ground that an actor reads at its own
  height, which the tunnel lane has begun (TUNNEL-TRIAL); decks become its second use. The test
  that records the dead end stays until then.
- **Also open:** the Ridge's top cannot be reached by a car (Survey Flags' fifth flag stands at
  its foot until slice 2c gives the Ridge a way up); the furnace and Big Bess are not solid to a
  car (EVERBURN-REMAKE); Tin Town's gate leaves a car nowhere to go but to stop; chases take
  about a quarter longer because of the slopes (each job's numbers are set when it is remade).

**Changed assertions, reviewed by Claude (rule 18).** The helper's list is in the change note.
Codex's review marked three as loosened, and Claude refused all three; they are restored:
- `test-old-smoke`: the chase limit had gone from 1,500 to 4,000 s. It is 1,753 s: the suite's
  own driver takes 1,524 s on the new ground, plus 15 per cent.
- `test-scablands-scene`: the checks that each place exists and that its solids lie within 100 m
  of it had been removed. They are back in the new form (every place that draws a thing taller
  than a wheel has a solid; every solid lies within 100 m of what it belongs to).
- `test-scablands-size`: the moving-a-place check had left out the bridge's frames and piers, the
  Pipe's posts, the Steps' posts, the ring fence and the bridge-side job places. Each is checked
  again, against the rule that places it.
- Accepted as given: the gate fence's 3.4 m, the bridge's 4 m, the ambush moved to the Wash.
- One changed by Claude's ruling: `test-everburn-play-start` measured the long gas road against
  a rectangle round Tin Town with 8 m to spare. It now measures Big Bess's body against every
  one of the town's solids. That is the stricter truth.

**Checks.** By Codex: every changed suite, the long Easy suite, both replay suites (fingerprints
unchanged) and the build. By Claude at the merge: the lane tier on the merged result, 275 of 275 (it includes the suites Codex's sandbox cannot run), and the browser scenarios `scablands-solid`, `scablands-size` and `everburn-ember` in a visible window, all passing.

**Not driven by Claude in real time.** Owed still, with the frame check, before any of this land
is shown.

### More direction from Kyle (14 November 2026, on seeing the regions being built)

"I like what you're working on." Then, in his words:

- **The map.** "That map is entirely ridiculous." (His picture: a bent line with "YARD GATE" and
  "TIN TOWN" and two dots, lying over the ground with nothing behind it.)
- **Hills.** "The scablands seem all flat, but what if we introduced parts where there are hills
  and other terrain?" Hills and obstacles "that we can hide behind or drive over and likewise
  the opponents do the same". "Some flatlands are good, some variation would be too. A wide
  flat land is great for a major skirmish, but sometimes a hide and seek game could be fun too."
- **An idea for later, not scheduled.** A version of the old "Scorched Earth" game that ties in
  the Lab's lessons on parabolas: "our tank in one place and fire at other fixed locations, or
  maybe a catapult instead of a tank". It needs terrain to be a fun view.
- **Buildings.** "All the buildings could be driven through, they had no hit box. We might as
  well make it reasonably real in that you can't walk or drive through buildings. If we drive
  through buildings, they must collapse and cost scrap to rebuild."

What Claude does with it: the map is redrawn now, beside slice 2b, and not last. Slice 2b makes
every drawn thing solid. Two slices are added: 2c, hill country, and 2d, buildings that fall.

### Slice 4 design (Claude, 14 November 2026): the map

**The fault.** The small map draws the job's own line and nothing of the land, so it cannot be
used to choose a way or to tell where the car is. On some screens it has no panel behind it.

**One picture of the land, made once.** When the Scablands loads, the game draws the whole land
into one image from the same data the ground is drawn from: each region in its own muted
colour, the river as a dark cut with its banks, the five crossings, every road as a pale line,
the rises and hills as shading, the places as small plans of what stands there. Nothing in it
is typed by hand, so the map cannot disagree with the land.

**The small map** (always on screen in the Scablands, bottom left, on a dark panel with a
border):
- shows the land round the car, about 2.5 km across, north at the top;
- the car is an arrow that turns with the car;
- the job's place is a marker; when it is off the map it sits on the edge in the right
  direction with the distance in km beside it;
- roads, the river and its crossings are plain to read at a glance; place names appear when
  the place is on the map;
- what the player has learnt is drawn and stays drawn: a barricade once seen, a held bridge, the
  furnace's sight as a shaded fan;
- no job line is drawn from point to point. A way is the player's choice.

**The big map** (M): the whole land, with the regions named, each road and crossing named,
every place, the car, the job's place, and for the job in hand the ways to it with what is
known of each (length in km, the ground, who holds it). The game pauses while it is open.

**Rules.** The map only reads the game; it changes nothing in a job. Drawing it costs no more
than a fraction of a millisecond a frame (the land's picture is made once; only the arrow and
markers move). The old route map's job line, its pixel rule that drops "TIN TOWN", and the two
exemptions in the Everburn suites go.

### Slice 4 result (a Sonnet helper; reviewed by Claude, 14 November 2026): merged, switches off

Built as designed. Full note: `docs/changes/SCABLANDS-LAND.md`, "Round 4 slice 4". Sheet
`docs/board/looks/scablands-land/round-7.jpg` with Claude's review beside it.

- **One picture of the land** (560 by 400 cells of 25 m), painted from the ground's own colours
  and the land's own height, made in small pieces over the first second of a job so that no
  frame waits for it.
- **The small map** on a dark panel at the lower left: 2.5 km across, north up, the car's arrow,
  the job's place or an arrow at the edge with the distance, crossings and place names.
- **The big map** (M) of the whole land, with the ways to the job listed from data. For Hot
  Delivery: the East Road 7.9 km; across the scab plates 6.0 km by the Steps; by the salt pan
  8.9 km over the Pipe; along the river bed 9.4 km by the Wash. The game stands still while it
  is open, through the game's own pause.
- **What the player has learnt** is kept and drawn: a barricade within 450 m, the bridge it
  holds, the furnace's sight cut by the ground.
- **Cost:** about a fifth of a millisecond a frame for the small map; 17 to 27 ms once when the
  big map opens (measured in a browser with no graphics card; a guide).
- The old job line, the rule that dropped "TIN TOWN" and the two exemptions in the Everburn
  suites are gone.

**Changed by Claude at the merge:** the furnace's sight is a light wash, not a heavy hatch.

**Changed assertions, reviewed by Claude (rule 18).** None is loosened.
- `test-everburn-play-fixes-a`, item 6: stronger. Every place, road and crossing must be named
  on the big map in every job, with no exemption.
- `test-everburn-play-fixes-round4`, items 1 and 2: the numbered rings for a job's several
  places are replaced by "the marker is the next lamp, the next flag". This drops something a
  player had on the old map. Accepted because jobs 2 and 5 are remade and their markers are
  set then; recorded as owed in the look review.
- `test-scablands-job-map`: the old drawing check becomes "the circuit panel draws nothing in a
  world job". `tools/scenarios/run-gas.mjs` reads the new map's panel for its overlap check.

**Not right yet:** see the look review (crowded road names, box-like edges of two regions, a
ways list that tells all before it is learnt).

### Slice 2c design (Claude, 14 November 2026): hill country

**Where the land rises.** Flat ground stays where a large fight belongs: the salt pan, the flats
west of the yard, and the Boneyard road's battle ground. Hills go where a chase or a hunt
belongs:

- **The Breaks**, south-west of the yard toward the Everburn and the Dead Mall: rolling hills
  40 to 90 m high, 400 to 900 m from crest to crest, with valleys a car can thread and passes
  where the Burn Road and the Mall Road go through.
- **The mesas** on the scab plates between the yard and Tin Town: flat tops 15 to 25 m up with
  steep broken sides (the scarps of slice 2b) and a few ramps. Cover from the furnace's sight.
- **The Ridge's foothills** in the north-east, climbing to the Ridge.
- **The dunes** round the Ships: soft crests 8 to 15 m high that hide a car and take its speed.
- **One hill that overlooks**, the Lookout, with a flat top and a long clear view over the
  flats: kept in mind as a firing place for Kyle's artillery idea.

**Hills are played, not only seen.**
- A car slows going up, gathers speed going down, and flies off a crest taken fast (slice 2b's
  rules).
- **Sight.** A raider, the furnace or a lookout sees a car only along a clear line over the
  ground, within its range. A car behind a hill is not seen. When a pursuer loses sight for
  five seconds it goes to where the car was last seen and searches from there; it does not know
  where the car is. The screen tells the player when the car is seen and when it is lost.
- Raiders and Big Bess obey the same ground: they slow on the climb, cannot climb a scarp and
  can be hidden from, ambushed from a crest, or led into a valley.
- The furnace's sight over the scab plates (Hot Delivery) is cut by the mesas: the short cut
  becomes a run from cover to cover.

**Drawn.** The near ground already follows the land's height. The coarse ground gets cells
fine enough that a hill 400 m across keeps its shape at a distance, inside the frame limit.
Hill ground is drawn in code as what it is: scree on the steep faces, bare rock at the crests,
the region's own ground in the valleys.

### Slice 2d design (Claude, 14 November 2026): buildings fall

Slice 2b makes every building solid. This slice makes the light ones fall, as Kyle asked.

- **Light things fall, strong things do not.** A stall, a fence, a shed, a shack or a
  barricade falls when a car hits it hard enough: about 70 km/h into the wall for a car, 40 for
  a truck. The forge, the mall, Tin Town's gate towers, the Scrapdome, the bridge, a mast and
  rock never fall; the car takes the whole hit.
- **What a fall does.** The car takes the hit for its speed and loses most of it. The building
  drops into a heap of its own boards and sheets with dust, and stays a heap: rough ground,
  safe under 20 km/h. Cue `world.building.fall`.
- **It costs scrap to rebuild.** Each thing has a price: a stall or fence 15, a shed 25, a
  shack 40, a large shack 90. A building of a town that the player knocks down is charged to
  the player: from the pay of the job in hand, or else owed to the town. While scrap is owed to
  a town its notice board gives no work (the story's own jobs still run), and the gate keeper
  says why. The player pays at the heap or at the gate, and the building stands again at the
  next visit. In the player's own town the player pays to rebuild their own.
- **Raiders** who knock a building down cost the player nothing.
- **The save.** A list of what has fallen and what is owed to each town is added to the save.
  A save from before reads as nothing fallen and nothing owed. Nothing else in the save
  changes. Saves and pay: one independent review, and the save checker (rule 6).
- **Not here:** races and their roadside buildings, which keep their crash rules.

### Kyle on realism (14 November 2026), and a trial on one scene

Kyle, on seeing the map and the regions: "This is so far really good. Coming along nicely."
"Curious what it would take to make things more photo-realistic? I think more photo realism
(doesn't need perfection) could make a lot of the game play really enticing."

**Where the land stands.** The game already has a film-like exposure, soft shadows from one sun
and a sky picture that lights the cars. The Scablands ground is one fully matt surface whose
colour is drawn in code; it has no relief of its own, the light on it is even, the distance has
little haze and almost nothing stands on it.

**What Claude does with it.** Slice 3 (beside the roads) opens with a trial on one scene, the
East Road at the Girder Bridge, in three steps. Each step is judged from a before-and-after
picture sent to Kyle and timed roughly on Performance, so nothing is picked that the laptop
cannot hold.

1. **Light and air.** A sky with a low sun; haze with distance that takes the sky's colour;
   shadows that reach as far as the player sees; soft dark shading where a thing meets the
   ground; the exposure set for a bright desert.
2. **Photographed surfaces.** Free-to-use (CC0) photographs of rock, salt, sand, gravel and ash
   with their relief, laid where the code-drawn regions say, with the code breaking up the
   repeat. Credits in `public/assets/textures/CREDITS.md`; sizes against
   `tools/size-targets.json`.
3. **Things at every size.** Stones, scrub, tracks, posts and wire scattered by seed; the
   bridge and what stands beside the road at true size.

What passes on the one scene is carried across the land as hill country (2c) and the roadside
(3) are built. This keeps Kyle's direction of 11 November: code decides what is where,
photographs supply the grain, and nothing is built as a box model.

Not chosen: anything this laptop cannot hold inside the frame limit (traced light, dense plants
to the horizon, whole scanned landscapes).

### Realism trial, step 1 result (Claude, 14 November 2026): light and air, switch off

Kyle, on the plan above: "Yeah! Let's experiment and go for it."

Built behind a new switch, `scablands-realism` (off). Sheet
`docs/board/looks/scablands-land/round-8.jpg` with Claude's review beside it; two before-and-after
pictures sent to Kyle.

- **Built:** a low strong sun from the south-south-west, a desert afternoon sky, haze that
  thickens evenly from the car to the edge of sight in the horizon's colour, and shadows that
  reach 100 m ahead of the car. With the switch off every course is lit exactly as before.
- **Finding:** a small gain alone. Shadows and the far hill are better; the ground is still one
  flat matt sheet, and that is now the plain fault. Light alone does not make this land look
  real; the photographed surfaces of step 2 are where the gain is.
- **Step 2 needs files from outside:** free-to-use (CC0) photographs of ground from Poly Haven or
  ambientCG. Claude asks Kyle before downloading any file.
- **Not timed as a frame check.** 60 pictures a second held before and after in a visible
  window (the screen's limit).
- **Changed assertions, reviewed by Claude (rule 18):** `tools/test-feature-flags.mjs` counts 55
  switches (was 54) and requires `scablands-realism` to be `dev`; `start-preview.bat` lists it.
  Neither is loosened: the new switch is pinned off for players.
- **Independent review of the code:** no real faults; with the switch off nothing changes.

### Realism trial, step 2 result (Claude, 14 November 2026): photographed surfaces, switch off

Kyle agreed to the download ("Yes, download"). Six Poly Haven surfaces (CC0), a colour and a
relief picture each: credits in `public/assets/textures/CREDITS.md`, sources and checksums in
`tools/art/catalog.json`, recipe `tools/art/scablands-ground-photos.py`, originals in the art
library. Sheet `docs/board/looks/scablands-land/round-9.jpg` with Claude's review beside it; four
before-and-after pictures sent to Kyle.

- **Built:** each ground takes its grain and relief from a photograph, laid at its true size
  near the car and four times that further off. The code still decides which ground lies where
  and its broad colour. With the switch off no photograph is loaded and the ground is drawn
  exactly as before.
- **Finding:** a clear gain. The salt pan, the scab plates and the road read as real ground in
  the low sun. The plain fault is now that nothing stands on the land (step 3 and slice 2c).
- **Cost:** 4.9 MB in the game; about 67 MB of graphics memory while the Scablands is loaded.
  Not timed as a frame check.
- **Owed before the switch goes on:** step 3, a real drive (does the grain shimmer at speed?),
  the frame check under rule 8, and Kyle's word after trying it.
- **Changed assertions, reviewed by Claude (rule 18):** two suites pin a checksum of the art
  catalogue's earlier rows (`test-p4-kits`, `test-tanker-valve-source`). The six new rows are
  left out of each pinned set, as the wildlife rows are; the checksums did not change, so
  nothing is loosened.
- **Independent review of the code:** three points, all put right (the shader text with the
  switch off is byte for byte the old one; the road's relief follows the road's slope; the
  scene and the renderer read the same switches).
- **Kyle, on the pictures:** "pretty solid stuff, definitely a gain! Let's keep going where we
  can." And on who does what: Codex for code and for checks, Claude for graphics, design and
  story.

### Realism trial, step 3 design (Claude, 14 November 2026): things at every size

**The fault.** After steps 1 and 2 the ground looks real and nothing stands on it. A real land
has things at every size, and the eye judges distance and speed by them. All of this is behind
`scablands-realism` and is placed by seed, so the land is the same on every visit.

**Small, by the thousand, near the car** (within 120 m; each kind one batch; they fade in with
distance and never pop):
- stones in three shapes, 0.1 to 0.6 m, thicker near rock, the river and the plates' edges;
- dry scrub: low grey-green tufts and dead brush, on the flats and the banks, none on salt;
- bones, cans and scraps of sheet in the wreck fields and beside roads;
- lumps of salt crust at the pan's edge; burnt stumps in the burn.
Nothing here is solid: a wheel rolls over it. Scrub and scraps bend or scatter when driven
through (a puff of dust; no rule of the drive changes).

**Middle, by the hundred, within 600 m:**
- boulders 1 to 4 m, alone and in falls below the scarps; solid (slice 2b's rule);
- **telegraph poles along the East Road and the Iron Line**, 60 m apart, wire sagging between
  them, some leaning, some down: the eye follows them to the horizon, and at speed they count
  the distance;
- **fence lines** of posts and sagging wire beside roads near each town, in runs of 200 to 600 m
  with gaps; they fall when driven through (slice 2d's rule);
- hand-painted road signs at every fork ("TIN TOWN 3 km", an arrow), from the land's own data;
- hulks, tyre stacks and drums from the scrap kit at the camps and crossings.

**Large, by hand, seen from kilometres:**
- **a line of dead power pylons** from the Dry Dam past the yard to the Dead Mall, 40 m tall,
  350 m apart, cables down between some: the land's long landmark, on the map too;
- the Girder Bridge at its true size (its frames stand 9 m over the deck, with piers down into
  the gorge), and the Pipe as a pipe 3 m across on trestles;
- the mesas and hills of slice 2c.

**Tracks.** The ground shows where others drive: faint twin ruts along each known way that is
not a road (drawn in the ground's code from the same data the map lists its ways from), deeper
at the crossings. A player who reads the ground finds the short cuts.

**Air.** Low dust blowing across the flats in the wind's direction, and a far dust devil now
and then. Dust from the car's wheels takes the ground's colour (it does already).

**Who builds what.** Codex builds the placing (seeded cells, batches, fading, the pole, fence
and pylon lines from the road data, the ruts' data, solidity through slice 2b's index) with
plain shapes made in code. Claude then draws each kind (its shape, its surface, how it catches
the low sun) from pictures, one sheet a round.

**Limits.** No more than 40 more draw calls and 150,000 more triangles in any view on
Performance; shadows from small things only within 40 m. Counted in the trial's scenario; the
frame check under rule 8 comes before the switch goes on.

### Open at the end of slice 1

- **Five older browser scenarios fail on the larger land** (run by Claude at the merge):
  `everburn-ember` and `everburn-side-jobs` put the car at a position of the old land;
  `everburn-frames` fails at its start; `run-gas` sees no raid and `field-battle` no furnace in
  the time they wait, because the roads are ten times as long. `everburn-well` passes. The suites
  that hold the rules of those jobs all pass. `everburn-ember` and `everburn-frames` were put
  right in slice 2a, from the land's names, and pass. The other three, and `everburn-play` (card EVERBURN-REMAKE), stay failing and are
  rewritten when their jobs are remade on the finished land; until then the nightly report
  lists them under this card.
- **The machine yard** (`wasteland-town`, off) loses the ridge's foot at its four corners.
- **A frame check under rule 8** before anything on this land is shown to a player.

## Checks (named before code)

1. `tools/test-scablands-scene.mjs`: every Scablands place material arrives with a colour that is not white (read
   from the real model files); the road is no taller than 0.3 m above the ground anywhere along it; the far ground
   lies below the near ground wherever both exist; the gate exists at its place and has an opening.
2. `tools/test-blender-output.mjs` for the four rebuilt models.
3. Replay and world-signature guards unchanged: nothing here changes a height a car touches. If a signature test
   reads these models, the builder stops and reports rather than regenerating it.
4. Look (Claude): one sheet before and after from six fixed viewpoints: Tin Town from the road, the gate, the
   Boneyard's planes, the well, the open flats with the road crossing them, and a hillside.
5. A frame check is owed before the Scablands is opened to players beyond the story's switch (the drawn ground and
   wear cost graphics time). Not in this card (rule 9: the stories that use it are off).

### Realism trial, step 3 result (Codex placed and made solid; Claude drew and judged, 15 November 2026): merged, switch off

Sheet `docs/board/looks/scablands-land/round-10.jpg` with Claude's review beside it. Full notes:
`docs/changes/SCABLANDS-LAND.md`, "Realism trial, step 3" and "Realism trial, step 3: Claude's
drawing and the merge".

- **Built:** small things round the car by ground (stones, scrub, dead brush, bones, cans, scrap,
  salt lumps, burnt stumps); telegraph poles and wire along the East Road and the Iron Line;
  fences near the towns; a painted sign at every fork; the line of dead pylons with its cables;
  boulders alone and below the scarps; tyre ruts along the ways; the pole and pylon lines on both
  maps. All of it only with `scablands-realism` on.
- **Solid:** poles, fence posts, pylon feet, sign posts and boulders stop a car, a raider and Big
  Bess, from one list that the rules and the scene share. A fence post hit at more than 25 km/h
  falls with its wire (`world.fence.snap`), for the visit only; nothing is saved.
- **Kept clear of solid things:** every road, way, ramp and the Steps' marked way, the bed near a
  deck, Big Bess's and the furnace's roads, the raiders' ways in to the Everburn well, 30 m round
  every job place, and a 14 m corridor along each leg of a job.
- **Two independent reviews by Codex.** The first found that cars drove through the things, that
  signs showed question marks and that the scenario could not fail; all three are cured. The
  second confirmed the cures and found three smaller faults (placing work done with the switch
  off, the map reading the switch for itself, the raiders' ways in not cleared); Claude read the
  fixes.
- **Limits:** at most 13 more draw calls and 27,508 more triangles in any of eight views (limits
  40 and 150,000).
- **Changed assertions, reviewed by Claude (rule 18):** `test-p4-audio` leaves the one new cue
  `world.fence.snap` out of the older sound bank's pin, exactly as the ember's three cues and the
  ground's nine are left out; the pinned hash is unchanged. No other existing assertion changed.
  `test-scablands-solid` drives the four ways a second time with the switch on, and
  `test-everburn-easy` can run two jobs with the switch on; both are additions.
- **Open:** the pylons draw olive, not grey; boulders below the scarps are in no picture; leaning
  poles are drawn upright; signs are small from the driver's seat. Not driven in real time with
  the things on, and no frame check: both are owed before the switch is turned on for anyone.

**Checks at the merge (Claude):** lane tier 263 of 263 on the merged result, the build passes, browser scenario `scablands-things` passes in a visible window, replay fingerprints unchanged.

## Removed

The round tube road. The noise-texture colours in four recipes.

### Codex decided (Claude to review): small-thing placement

The design names which ground holds each thing but gives no counts. The first placing rules use the relative chances in `SMALL_DENSITY`, with more stones on the plates and river bed than the flats. These are a starting choice for Claude to judge in the trial. Salt lumps are limited to 90 m from the pan edge. The scene must pass every job start to the placer before the placing is used in the game.

The first candidate line for pylons runs 100 m east of the Dry Dam, yard and Dead Mall. Spacing continues across the bend at the yard. The candidates still need clearance from roads, buildings and job starts before they can be drawn or made solid.

Telegraph candidates stand 22 m from the East Road centre and 12 m from the Iron Line. The seed chooses 4 percent down and 12 percent leaning. These are starting choices for Claude to review. The candidates still need clearance before they are drawn or made solid.

Fence candidates use one run on each road arriving within 200 m of Tin Town, starting 200 m from the road end. Runs are 200 to 600 m long, with posts 8 m apart and seeded gaps. They still need clearance checks before drawing or making them solid.

Rock-fall candidates form seeded groups of two to five, 3 to 27 m from the foot of each scarp. They are 1 to 4 m across. Their footprints still need clearance checks before drawing or making them solid.

Single-boulder candidates use 120 m cells, with at most one candidate per cell. The chance is 45 percent on plates and river bed, 12 percent on other ground, and zero on salt. Their full footprints still need clearance checks before drawing or making them solid.

For the first clearance pass, allow a 6 m radius around a pylon, 0.5 m around a standing pole, 7 m around a down pole, and 0.25 m around a fence post. A boulder's radius is half its stated size. The later drawing and solid footprints must fit within these allowances or the clearance must be revised. Rejected line positions stay as gaps so wires do not cross them.

For the first collision records, each pylon has four feet, 6 m apart, and each foot is 0.8 m across. Standing poles are 0.5 m across and 7 m tall; down poles are 6.8 m long. Fence posts are 0.3 m across and 1.4 m tall. A boulder's collision footprint and height use its stated size. The plain drawing must match these records before they are connected to the game.
