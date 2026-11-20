# BOWL-EXPAND

Kyle, 19 November 2026, on the Bowl as BOWL-COURSE rebuilt it that day: "it's absolutely tiny... not at all proportional to the size of
the cars... this would even be too small for bmx riders. A larger bowl would allow much more diversity of play and options. The current
bowl must be substantially expanded and be proportional to the bodacious and fun gameplay that we can introduce, but it's so restrictive in
size that we wouldn't be able to use its core for variations." Claude's card (design and build), behind `titan-bowl` (dev).

## What it is today

`def.bowl` in `src/bowl/bowl-course.js` (BOWL-COURSE, merged 19 November): a 140 m ring round the stadium model's podium, 16.5 m between
the wall faces, a 6.1 m floor, two ramps with flame jets, a crush line; sized to fit `public/assets/models/wasteland/bowl/` stadium art.

## What done looks like

1. **A written layout first**, on this card, with dimensions and a top-down picture: an open arena floor the size of a real monster-truck
   stadium (a football stadium's floor or larger), proportioned to the Titan and the show trucks, with room for many kinds of play from
   one core: ramps of several heights and run-ups, quarter pipes and a bowl along the walls, a crush line, a freestyle zone, two lanes for
   Side by Side, room for four trucks in Last Truck Rolling, and a path for the Scrapasaurus to walk round the edge on its rails. Say how
   each Show Night event uses the floor, and what variations the core allows later.
2. **The stadium in proportion**: stands, walls, floodlights and the crowd scaled to the new floor. Kyle's direction of 11 November:
   draw in code where code serves (stands, crowd, lights, smoke, fire); model files for the shapes a truck drives on and around, with
   surfaces from photos. Gritty and real, never toy-like.
3. **Built and driven**: the course and its view rebuilt; existing Titan courses, replay fingerprints and world signatures unchanged;
   `tools/test-bowl-course.mjs` brought up to date with every changed assertion reviewed; pictures at night from truck height, the top
   row and above; a hand drive in a visible window (big air on the ramps, the crush line, a lap of the lanes).
4. **The cards that build on the Bowl keep working**: Show Night (BOWL-HOOKS), Turn Show, the rivals and the Scrapasaurus fight read the
   course through its data (ramps, crush line, lanes, rails); keep or extend that data so they adapt, and say on this card what each must
   change.

## The layout (Claude, 19 November 2026, written before the code)

The picture: [docs/board/looks/bowl-expand/look-1.jpg](../looks/bowl-expand/look-1.jpg), drawn from the course's own data.

**What it is measured against.** The Titan in the game is 2.8 m wide, 5.2 m long and 3.6 m tall (`src/config.js`
`titan_monster`: half width 1.4, half length 2.6, height 3.6), about the size of a real stadium monster truck. The rival
show trucks are the Titan's body with bolt-ons, so they are the same size. A real monster-truck show runs on the whole
floor of a football stadium: the field alone is about 110 m by 49 m, and the floor out to the stand walls is larger. It
carries dirt jumps of several heights with long run-ups, car stacks, a crush line, a lane for each truck when they race
and open ground for freestyle. The floor below is 160 m by 90 m between the walls, so a football field would fit on it
with room to spare. That is 31 truck lengths from end to end and 14 truck widths across each straight. Today's floor is
12 m wide.

**The shape.** A stadium: two straights joined by two round ends, with a narrow divider down the middle, the Spine. The
course is still a ring, so every rule that reads a ring (laps, lanes, arena walls, start slots) works as before, but the
ring is now as wide as the floor:

| Part | Size |
| --- | --- |
| Centre line of the ring | two 70 m straights and two half circles each 73 m round (23.24 m radius): 286 m round |
| Floor | trucks drive anywhere 20 m either side of the centre line: 40 m across each straight |
| Outer wall face | 21.9 m out from the centre line; wall to wall 160.3 m long and 90.3 m across |
| The Spine | 2.5 m wide and 70 m long, between the two straights: a row of rusted shipping containers |
| Round the Spine's ends | a truck turns as tight as 3.2 m from its end, or as wide as 43 m against the end wall |

The floor is about 12,500 square metres, five times today's. The lap goes Jump Straight, End 1, Crush Straight, End 2,
starting at the beginning of the Jump Straight. Distances below are metres along the centre line from that start (`s`),
and metres across from it (`off`: minus towards the Spine, plus towards the stands). The two halves of the stadium are
each other's mirror: a place and the place half a lap (143 m) further on are the same spot on the other side.

**The Jump Straight** (s 0 to 70, in front of the main stand):

- the lane kicker: a dirt jump in the middle of the floor (off minus 5 to plus 5), 1.8 m high and 12 m long, s 22 to 34;
- the Big Jump on the Spine side (off minus 20 to minus 6), 4.5 m high and 18 m long, s 43 to 61, with 43 m of straight
  floor before it and the whole of End 1 to land in;
- two parked cars on the stand side (off plus 14) at s 36 and 48, for the Titan's launch off cars.

**The Crush Straight** (s 143 to 213, in front of the far stand):

- the lane kicker, the mirror of the first, s 165 to 177;
- the crush line on the stand side, three across (off plus 9.4, 13.8 and 18.2): three rows of junk cars at s 165, 172 and
  179, the buses and the RV at 190, the burning stacks at 203;
- the Table on the Spine side (off minus 20 to minus 6): a flat-topped jump 3.2 m high and 19.5 m long, s 185.5 to 205.

**The two ends** are the bowl: from 10 m outside the centre line the floor curves up towards the end wall, 3.2 m high at
the wall face (2.3 m where a truck's centre can reach), so a truck can ride round the wall at speed. The middle of each
end is flat open ground about 46 m across for donuts, turning and fights. Each bank rises and falls away gently over its
first and last 10 m, so both straights are flat between their jumps.

**How high and how far** (measured in the simulation with a Titan from a standing start on the straight; a Titan
settles near 50 mph at full throttle on this floor): the kickers throw it about 28 m with 1.2 s in the air and 4 m up,
the Table about 45 m, 1.9 s and 9 m up (it lands in End 2), the Big Jump about 52 m, 2.2 s and 12 m up, landing in the open middle of End 1.
A flip takes 1.1 s, so every jump allows one.

Every jump is on a straight and no two jumps share a stretch of the lap, so the game's jump scoring (which names a jump
by where it is along the lap) always names the right one. A flame jet stands either side of each jump's crest, one on
the Spine and one on the stand wall: eight in all.

**The stadium.** Drawn in code: a concrete wall 2.4 m high with a steel catch fence on it to 5 m; one bowl of terraces
all the way round, about 40 rows rising to 22 m, broken by aisles and tunnel mouths; tens of thousands of people from the
existing crowd cut-outs, moving; four floodlight towers at the corners, 46 m tall, with a lamp bank each and light
falling through the dust; the Spine's containers with the flame jets on top and Big Mo's booth in the middle. The
containers and wall panels take the photographed scrap-plating and concrete surfaces; the floor takes the scrapyard dirt.
The old stadium model (`stadium.glb`, built for the small ring) is removed with its recipe.

**How each Show Night event uses the floor.**

- **Car Crush**: the truck starts at the head of the Crush Straight on the stand side (s 145, off plus 13.8) and runs
  straight down the crush line: 20 m to the first row, then the cars, the buses and RV, the burning stacks, 38 m of line
  in all. (The first layout started it in End 1; the hand drive showed that a truck driven straight ahead from there
  meets the wall, so the line moved 13 m down the straight.)
- **Freestyle**: the whole floor for 90 seconds: two kickers, the Big Jump, the Table, the launch cars, the banked ends to
  ride and the open ends for donuts. The truck can turn any way it likes on the Bowl's floor, as on the Freestyle
  Playground. Today, outside an arena event, a truck on the Bowl cannot turn more than about 80 degrees from the line of
  the lap, so it could neither do a donut nor turn back to a jump.
- **Side by Side**: two mirrored lanes on the centre line, one on each side of the Spine. The trucks start half a lap
  apart (s 6 and s 149) and race once round: their kicker, a turn round the end at 23 m radius that needs the brakes,
  the other straight's kicker, the second turn, home. Both drive exactly the same ground, so no stagger is needed, and
  they see each other across the Spine all the way.
- **Last Truck Rolling**: four trucks start spread round the floor (eight start slots, 6 m either side of the centre
  line, none on a jump). Each end is a 90 m wide arena of its own and the straights join them.
- **The Scrapasaurus**: its rails run all the way round 16.5 m out from the centre line, 5 m from the stand wall along
  the straights and up on the banks at the ends. On the Crush Straight they pass over the crush line, so it eats the junk
  cars as it goes.

**What one core allows later**, from data in `src/bowl/bowl-course.js` and nothing else: the lap run the other way; a
mega jump across an end (an end is 90 m across); lanes on other lines; the crush line made longer or of other things;
jumps moved or doubled; a mud night or an obstacle course; chase and hide and seek round the Spine; a skills course of
tight turns round the Spine's ends.

**What the cards building on the Bowl must change.** The course gives them its places as data in
`course.features.bowl` (the crush line, the launch cars, the lanes, the rails, the start), so none of them needs a
number of its own:

- **Show Night (BOWL-HOOKS, pull request 57)**: `BOWL_NIGHT_RULES.carCrush` (startS 62, endS 128, leftS 40) and
  `FREESTYLE_PARKED_CARS` (s 62 and 74 beside the centre line) are places on the old ring. Read them from
  `features.bowl.crush` and `features.bowl.launchCars`. Freestyle scores a jump from the Duel's `jumpLanded`, which counts
  each jump once a lap; on this floor a truck goes back to the same jump many times without lapping, so the event should
  count each landing it sees (BOWL-FINISH tunes the numbers).
- **The computer trucks (BOWL-RIVALS)**: Side by Side puts the rival 3 m inside and the player 3 m outside with a
  stagger. Use `features.bowl.lanes`: both on the centre line, half a lap apart, no stagger, one lap. Last Truck Rolling
  needs nothing new: it reads the venue's start slots and floor width.
- **Turn Show (BOWL-TURNS)**: it reads the parked car and the lane from the show's data, so it follows the two changes
  above.
- **The Scrapasaurus fight (BOWL-REX-FIGHT)**: walk the rails in `features.bowl.rails` (16.5 m out, all the way round);
  the junk cars it eats are the crush line's.

## Checks

1. `tools/test-bowl-course.mjs`: the floor's size and clearances, each jump launches a Titan and it lands, each kind in
   the crush line crushes, the mirror lanes are the same length, a truck turns round on the floor, the stadium view
   builds, and the existing Titan courses are unchanged.
2. Every suite that names the Bowl, brought up to date (`tools/test-bowl-air.mjs`, `tools/test-bowl-show.mjs`,
   `tools/test-bowl-save.mjs`, `tools/test-blender-output.mjs`).
3. Laptop only: pictures at night from truck height, the top row and above; a hand drive (big air off the jumps, the
   crush line, a lap of the lanes). No frame check: the Bowl is switched off for players (rule 9).

**Files:** `src/bowl/bowl-course.js`, `src/bowl/bowl-view.js`, `src/bowl/bowl-air.js`, `src/bowl/bowl-stadium.js` (new),
`tools/bowl-plan.mjs` (new), the Bowl's branches in `src/course.js`, `src/race-structures.js`, `src/world.js`,
`src/world-props.js`, `src/rally-detail.js` and `src/arena/arena-pickups.js`, two lines in `src/sim-driving.js`, the
regenerated `src/generated-shortcut-presets.js`, the suites above, `docs/WASTELAND_WORLD.md` section 7,
`docs/board/looks/bowl-expand/`. (Written as the work found them: the first list named `world-surfaces.js`, which did
not need a change, and missed the others.) Removed: `public/assets/models/wasteland/bowl/stadium.glb`
and `tools/blender/bowl-stadium.py`.

## Built (Claude, 19 November 2026, night)

- The course and its data: `src/bowl/bowl-course.js`; the stadium drawn in code: `src/bowl/bowl-stadium.js`; the plan
  is drawn from the data by `tools/bowl-plan.mjs` (`docs/board/looks/bowl-expand/look-1.jpg`).
- Found by driving, and changed: outside an arena event the Titan reached 98 mph in 3 s on the Bowl and could not turn
  more than 80 degrees from the lap's line; the floor's grip and top speed now apply in every event and a truck turns
  freely (a Titan settles near 50 mph). Holding the throttle over a jump pitched the nose down (the Bowl's air control
  uses W and S) and landed the Titan on its roof; now a key held from before take-off tips nothing until it is let go
  and pressed again in the air. A start/finish gantry, finish posts and guard rails drawn for every road stood on the
  floor; the Bowl has none now.
- Measured in the real game by hand: the kicker 4.0 m up, 28.9 m, 1.2 s; the Big Jump 10 m up, 43.7 m; End 1 taken at
  52 mph; the crush line crushed at 45 mph.
