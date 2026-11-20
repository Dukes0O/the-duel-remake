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
