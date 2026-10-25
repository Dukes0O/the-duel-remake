# The pilot's map

Design for the pilot's map (Cockpit T-008), written 24 October 2026 by
Claude. Kyle's ask: a pilot's map between courses, with secret courses and
an air-only hidden spot, drawn as our own map from our own courses. From his
storyboard: "the helicopter connects every world in the game: from the air
you find the race courses, the Wasteland canyon, the boat ramps to The Deep
and the peaks", fuel pads at a few courses with the far ones dearer, and
scouting a course from the air.

## 1. What the game does today

- Four destinations with small-map positions in km (`src/heli/heli-jobs.js`):
  Tremblant Woods (home, 0, 0), Tremblant Snow (0.5, 1.9), Panorama Ridge
  (-6, 7) and Summit Run (-10, 12). North is +z.
- Cruise legs take a fixed fuel amount from a table (25 to 160 kg), fade for
  1.5 s and arrive 1.5 km out. Fuel is sold at the home pad (1.5 credits a
  kg) and, with RESCUE-SUMMIT-TUNE, at Summit's truck.
- Five course variants exist in dev with no way to reach them yet: Panorama
  Ridge by night, Harbour Lights at dusk, and Panorama Ridge, Harbour Lights
  and Tremblant Woods in reverse (`src/circuits/`).

## 2. The map

**One invented region** that holds every course, laid out by what each
course is: forest valleys in the middle, high peaks to the north-west, a
desert and a long coast to the west, a harbour city and a softer coast to
the south-east. It is not the real world (Tremblant and Bathurst are not
neighbours); it is the game's world. Each course is drawn on it **as its own
track outline**, traced from the course's own road and shrunk to fit, so
you recognise every course from the air.

| Place | km (x, z) | Region |
| --- | --- | --- |
| Tremblant Woods (home pad) | 0, 0 | Forest valley, a lake |
| Tremblant Snow | 0.5, 1.9 | Just north, under snow |
| Panorama Ridge | -6, 7 | A ridge above the valley |
| Summit Run | -10, 12 | The high peak |
| Ardennes Forest | 8, 4 | Wooded hills to the east |
| Eifel Crown | 12, 9 | Beyond the Ardennes |
| Alpine Serpent | -4, 22 | The far north alps |
| Cloudbreak Skyway | -8, 26 | Highest road on the map |
| Ridge Rally | -14, 8 | Dry ridges west of Panorama |
| Timberline Checkpoint Rush | -12, 18 | Tree line under the peaks |
| High Country Grand Tour | -24, 14 | Canyon to alps to the north-west coast (Wreck Reef's ramp) |
| Red Mesa Corkscrew | -18, 2 | Red desert mesas |
| Pacific Canyon Circuit | -22, -8 | Desert canyon to the west coast (the Kelp Coast ramp; the Wasteland canyon branches off it) |
| Harbour Lights | 14, -10 | The harbour city |
| Harbor & Highlands | 18, -6 | The city's hills and night coast road (the Night Harbour ramp) |
| Neon Docks, Neon Drift Trial, Midnight Muscle Chase | 16, -12 | City districts by the docks |
| Titan arenas (Monster Arena, Stunt Trial, Freestyle) | 10, -6 | The stadium on the city's edge |
| Azure Riviera | 6, -16 | The soft south coast |
| **The Table** (air only) | -16, -3 | A lone mesa in the desert (section 5) |

The drawer may move a place up to 2 km to keep outlines from touching; the
table is the plan.

**The look:** a pilot's chart, not a game menu: pale paper, thin contour
lines, forests as a green tint, desert sand, the sea in flat blue with depth
lines, rivers, the roads between towns as thin lines, each course outline in
dark ink with its name, fuel pads as a small pump sign with the price.

## 3. Using it

- **Where:** the dispatch board's **Map** button at any pad, and the cockpit
  in flight (a key the builder finds free; the controls help lists it).
- **What it shows:** every place; owned courses in ink, others in grey
  ("not owned: you can land, not race"); fuel pads and prices; your
  helicopter; where your special cars stand; today's jobs; a burnt course in
  black; found secrets; the scale bar and north arrow. With the Lab's moving
  map (`docs/LAB.md` 4.2), a grid and the bearing and distance from you to
  any place you point at.
- **Choosing a destination** on the map sets it for Cruise and the
  autopilot, as the board does today.
- **Scouting:** flying over a course you own shows its corner names on the
  ground for that flight (the same names as the course's own boards).

## 4. Destinations, legs and fuel

- **New destinations:** every course on the table above becomes a
  destination once the map's switch is on, each with a landing zone found by
  the existing search (a clear, level 12 m circle near the start). A course
  where the search finds none is left off and named in the change note.
- **Legs:** the four existing legs keep their table numbers exactly. Every
  new leg takes 12 kg of fuel per km of straight-line distance plus 5 kg,
  rounded up to 5 kg (home to Pacific Canyon, 23.4 km: 290 kg). A leg longer
  than the tank allows is refused, as today, and the map draws the reach of
  your tank as a faint ring.
- **Fuel pads:** home 1.5 credits a kg, Summit's truck (its own price),
  Harbour Lights 1.8, Pacific Canyon 2.0, Alpine Serpent 2.2. Far ones cost
  more.
- **Coasts:** Pacific Canyon, High Country and Harbor & Highlands are over
  the sea at one edge. Over water the helicopter flies as over land; a crash
  into the sea is a crash (the same repair); the Deep's coves show from the
  air (`docs/THE_DEEP.md` 6.9).

**Settled by MAP-DESTINATIONS (24 October 2026).**

- A destination is named by its course id (the Titan stadium is `titan-arena`).
  Every course place is one while the switch is on, except **Ardennes Forest**:
  the landing-zone search finds no clear, level 12 m circle beside its start, so
  it is left off. Summit Run still needs its own switch.
- A place faces its neighbours by where it is **drawn** (the Neon districts share
  one table point), and a leg is measured between the table points.
- New destinations take the setting's height for the thin-air rule: Alpine
  Serpent 1,700 m, Cloudbreak Skyway 2,100 m, Timberline 1,400 m, Red Mesa 1,200 m,
  High Country 900 m, Ridge Rally 700 m, Eifel Crown 600 m, Ardennes 400 m, the
  harbour and coast 5 to 40 m. Summit Run (2,860 m) stays the highest.
- **Fuel pads** sell to a helicopter on the ground inside the landing circle at
  Harbour Lights (1.8), Pacific Canyon (2.0) and Alpine Serpent (2.2) a kg; the
  free first tank is still the home pad's.
- **The sea.** On a course that draws an ocean the ground is never below its
  surface (-15 m), and touching it, however gently, is a crash with the usual repair.
- **Jobs.** With the map on, the board's three jobs are drawn from the original
  three routes (their pays stay) and every other pair of owned destinations whose
  legs each fit a tank, paid by straight-line distance: 300 under 5 km, 450 from 5
  to under 12, 600 from 12 to under 20, 800 beyond. Owning nothing gives the old
  board. A course bought in the menu while a job is in hand can change the board.
- **Scouting.** Over a course you own the view carries a list of its corners (the
  names on the course's own boards where it has them, else their numbers) and
  where they are; the map view draws it.

## 5. Secrets

### 5.1 Secret courses (the five variants)

Each variant is found from the air only, by spotting a sign on its course
that you cannot see from the road, then hovering above it below 60 m for
3 s. Found, it joins the course list for that player at no cost, marked
"Found from the air", and its pin appears on the map.

| Secret course | The sign from the air |
| --- | --- |
| Tremblant Woods, reverse | Arrows painted on an old logging track by the lake, pointing the wrong way round the lap |
| Panorama Ridge, reverse | A second start grid painted at the far end of the Mountain Straight, facing back up the hill |
| Panorama Ridge by night | A ring of camp-fire pits on the summit lookout, where the night crowd watches |
| Harbour Lights, reverse | A chalk start line on the harbour wall, the wrong way round |
| Harbour Lights at dusk | A lighthouse on the breakwater whose lamp turns only from the air's angle (a lit window facing up) |

A variant needs its own switch on as well; while it is dev, its sign is
not drawn.

### 5.2 The Table: the air-only hidden spot

A lone, flat-topped mesa in the desert with cliffs on every side and no
road: only a helicopter can get there. It is not on the map at first. The
first cruise leg whose straight line passes within 4 km of it (the leg
between home and Pacific Canyon passes about 3 km away) brings a radio call
on arrival: "Kestrel One, odd thing back there. Flat-topped mesa off your
left, looked like a tower on top." It then shows as "?" on the map and can
be chosen like any destination (Cruise arrives 1.5 km out, as everywhere).
Land on top to find:

- an old fire lookout tower with a view over the whole desert;
- the wreck of a 1950s bush plane, its tail number still readable;
- in the lookout, the bush pilot's logbook. Its last page, 1966: "Red car on
  the bottom off the Pacific cove, plain as day from up here. Nobody
  believes me." This is the Deep's legend seen from the air: reading it
  marks the Kelp Coast's Drop-off on the Deep's log page with a pencil cross
  (no sonar change; the Deep's own order of finds stays).
- Landing there the first time pays 500 credits and fills in the map's last
  blank corner.

You can also carry a car up and set it down: the old dirt strip on top is a
short, bumpy place to drive around, with nothing timed. The highest car park
in the game.

**Settled by MAP-SECRETS (25 October 2026).**

- The five variants are found from the air **only**: their unlock kind is
  `spotted-from-air` (price 0, parent still the default Grand Prix event). The old
  "top three in the parent Grand Prix" route to them is gone; the registry still
  accepts that kind for future variants. A found variant is open once the parent is
  owned and the pilot's map record (`profile.heli.map.found`) lists it.
- A sign is **found by a steady hover**: within 25 m of it sideways, between 2 and
  60 m above its ground, at most 6 m/s, 3 s in a row (leaving starts the count
  again). The signs stand beside the road (a road half width and 6 m off it), out
  of the water, with no scenery within 8 m; flat ground is not needed, since it is
  paint. Positions: Tremblant Woods Reverse by the lake, 26 m off the road at 605 m
  along; Panorama Ridge Reverse 16 m off at 1,430 m; Panorama Ridge Night 20 m off
  at 2,358 m (the summit lookout); Harbour Lights Reverse 22 m off at 3,510 m (the
  harbour wall); Harbour Lights Dusk 130 m off at 270 m (the breakwater).
- The session takes `secretCourses`, the ids of the variants whose own switches are
  on; without the pilot's map there is no sign and no Table. `view().secrets` gives
  the art the signs still to be found (id, name, x, z), the hover so far
  (`spotting`) and what is found.
- **The Table.** Seen by Roger's call on arrival after a leg whose straight line (by
  the table positions) passes within 4 km (16 of the 190 legs between course places,
  Pacific Canyon being on most of them); the call is the event `tableSpotted` with
  the words, and a `radio` event for `heli.radio.table.spotted`, which has no
  recording yet (SKI-AUDIO records it; until then the screen shows the words). Seen,
  it is a destination, 1,100 m up, and the leg to it follows the map's leg rule. The
  Table is not a registry course: its world is hand-made in `map-secrets.js` (a
  mesa 90 m over the desert with 130 m of flat top, cliffs, an oval dirt strip 8 m
  across, the lookout tower and the wreck as obstacles) and loaded by the session.
- First landing in the circle: `tableFound`, 500 credits once, `map.table` true (the
  Deep's log page reads that flag). A car **cannot be left on the Table yet**: the
  save does not accept it as a place until part two of the card, so releasing one
  there gives `carNotKept` and the car stays where the save has it.
- Sounds: `heli.found` (three rising tones) for `secretFound` and `tableFound`.

## 6. Sounds, art and save

- **Cues:** `map.open` and `map.close` (paper unfolding), `map.pin` (a pin
  pushed in when a destination is set), `heli.found` (a short rising
  three-note sting when a secret is found).
- **Art:** the map is drawn in the game from data (no picture file): land,
  sea, contour and region shapes authored once in
  `src/heli/pilot-map-data.js`, the course outlines traced by
  `tools/build-pilot-map.mjs` into `src/generated/pilot-map.json` (generated
  output the game loads, so it is committed). The five signs, the mesa,
  lookout, plane wreck and logbook from a Blender recipe
  (`tools/blender/pilot-map-props.py`), reusing the desert rocks and the
  fire lookout pieces where they exist; at most three rounds.
- **Save:** `profile.heli.map = {version: 1, seen: [<place>], found:
  [<secret>], table: true}`, optional; old saves read as nothing found.

## 7. Switch and cards

Switch `pilot-map` (dev), only with the helicopter on.

| Card | Owner | Starts | What |
| --- | --- | --- | --- |
| MAP-DATA | claude-cloud | now | The place table, regions, fuel pads, the leg rule, the outline tool and its generated file |
| MAP-DESTINATIONS | claude-cloud | after DATA | Landing zones for every course, the new legs, fuel pads, flying over the sea |
| MAP-SECRETS | claude-cloud | after DESTINATIONS | The five signs and the spotting rule, the Table, the logbook, the unlock kind for found variants; the save part (lock `save-shape`) is a second pull request |
| MAP-ART | codex | now | The signs, the mesa, lookout, plane wreck and logbook (three rounds) |
| MAP-VIEW | codex | after DATA, DESTINATIONS, SECRETS, ART | The map screen, the cockpit key, scouting names, the Table scene (lock `busy-game-files`) |
| MAP-FINISH | Claude | after VIEW | Fly the map as a player; find every secret without being told |

## 8. Picked for Kyle (24 October 2026)

- One invented region, so every course is a short flight from home; the
  real places stay real on the ground.
- Secret courses are the five finished variants, found from the air, so a
  secret is a real course to race, not a teaser.
- The air-only spot is a mesa with an old pilot's logbook that ties the
  helicopter to the Deep's lost Sirena, without the Deep needing the
  helicopter.
- New legs use one fuel rule; the four existing legs keep their numbers.
