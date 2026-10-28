# Phase 4: Grand Circuits

Claude, 10 October 2026, at Kyle's request. Settled for build. This page is
the design; the cards in `docs/board/board.yaml` (prefix `P4-`) are the work.
SPEC section 0.15 points here.

## 1. Kyle's direction

After the Mad Max work, Kyle wants proper racing back: new race tracks that
borrow and vary shapes from real circuits (his poster of the world's tracks
to scale), driving that asks more of the player, and a long mountain race:
climb into snow, take jumps, switch to winter tyres at a pit stop, tunnels,
avalanches, day turning to night, snowmen and a yeti. Some races should be a
pure race against several opponents with no oncoming traffic, on new tracks
and on the tracks we already have.

Kyle's picks from the poster (10 October 2026):

- **Mount Panorama** (Bathurst): the mountain circuit.
- **Guia** (Macau): fast street circuit with a famous crawling hairpin.
- **Mont-Tremblant**: rolling forest circuit.
- **Pikes Peak**: the summit climb, made keyboard-friendly.

Kyle on finish quality: Codex builds and polishes; Claude adds the finishing
touch on every track (section 11). A track is not done until Claude's
finishing pass and Kyle's play in the Preview.

## 2. Principles (settled)

1. **Borrow the shape, not the name.** Each track takes the rhythm and the
   signature corners of a real circuit, simplified and varied. Every track,
   corner and landmark gets our own name; no real logos, sponsors, signs or
   branding. This replaces the six-course expansion's "no replica layouts"
   rule for phase 4 only (Kyle's decision).
2. **A pure race.** Grand Prix events have no oncoming traffic, no police and
   no radar traps: you against a full field on a closed road.
   The Grand Circuits do not host Mad Max Duel, raiders or the UFO (Kyle, 11
   October 2026): each sets `noCombat`, which `supportsCombat` honours. Rival
   Duel, Time Trial and Grand Prix stay.
3. **Keyboard first.** Every corner can be driven well on the arrow keys.
   Only one corner in the whole phase is tighter than 14 m radius (Harbour
   Lights' hairpin, the signature). Every slow corner has braking boards and
   at least 120 m of straight road before it.
4. **Few shapes, many events.** Four tracks give eleven events through
   variations: reverse, night, dusk, snow and time attack (section 6).
5. **The same rules as everything else.** Race state stays repeatable from
   seed and inputs and runs without graphics. The renderer, HUD and menus
   never change race state. Each new player feature is behind a switch.
   Saved careers, records and ghosts of existing events keep their ids: new
   events are appended to `COURSE`, never inserted.
6. **One file per circuit.** Like the warlords: each circuit lives in
   `src/circuits/<id>.js` (its script, sections, landmarks, light, scenery
   placements) and is registered with one line in `src/circuits/index.js`.
   Shared course, race and render files never name a circuit; when a
   circuit needs something new, add it to the shared code generically.
7. **Start from existing assets** (SPEC 0.11): CC0 first, then CC-BY with
   credit; Blender is for fitting and combining. One sourcing sheet for Kyle
   to pick from before any building (P4-ART-SRC).

## 3. Foundations

### 3.1 Track scripts (P4-TRACK-SCRIPT)

Today a circuit's centreline comes from a smooth closed formula (a radius
that varies with angle, `expansionPoint`). That cannot draw a hairpin, a
chicane or a long straight into a 90 degree corner. Phase 4 adds authored
**track scripts**: a list of straights and turns, like directions.

```js
// src/circuits/panorama-ridge.js (shape only; section 5.1 has the full list)
script: [
  ['straight', 520, {climb: 0, name: 'Pit Straight'}],
  ['turn', 'L', 90, 28, {name: 'Hell Gate'}],
  ['straight', 880, {climb: 55, name: 'Mountain Straight'}],
  // ...
]
```

- **Pieces.** `['straight', length, opts]` and `['turn', 'L'|'R', degrees,
  radius, opts]`. Lengths and radii in metres. Options: `climb` (metres of
  height gained over the piece; negative to drop), `width` (road width in
  metres from this piece on), `bank` (degrees, leaning into the turn),
  `crest` (height of a smooth crest at the piece's middle, which becomes a
  jump at speed through the existing crest flight), `walls` (`'both'`,
  `'left'`, `'right'`, `'none'`), `surface` (section 3.4), `kerbs`
  (`true` on turns by default), `boards` (braking boards, on by default
  before every turn under 40 m radius), `name` (shown on the map and used by
  landmarks).
- **Building.** Walk the pieces, turning the heading on arcs, with a smooth
  easing (clothoid) of at least 25 m into and out of every arc so steering
  never snaps. Turns enter and leave tangent.
- **Closing a loop.** For a closed circuit the signed turn angles must sum
  to 360 degrees (left positive) within 2 degrees, or the build fails with a
  clear message. The leftover position gap is closed by scaling the
  straights only, by least squares, each by at most 15%; turns stay exact.
  The tool reports every straight's change. Elevation must also return to
  the start; the leftover is spread over the straights.
- **Point to point.** `closed: false` builds an open road with one lap;
  the start and finish are separate.
- **Width per piece.** Road width becomes a property of the road at each
  point (`halfWidthAt(s)`), used by driving, contacts, the pilot, lap
  validation, the renderer and the map. Existing courses keep 7 m half width
  everywhere, so every existing replay fingerprint stays exact.
- **Walls and runoff.** Walls are solid, finite-height barriers (the
  POLISH-HEIGHT rules) along the chosen side, set back 1 m from the road
  edge. Without walls, there is grass or gravel runoff before scenery.
- **Racing line.** The build also produces a racing line (outside, apex,
  outside, limited to the road minus 1.5 m) and a speed profile from
  curvature, grip and braking, stored with the course for the computer
  racers (3.2).
- **Reverse.** `reverse: true` builds the same script backwards (pieces in
  reverse order, turn directions flipped, climbs negated). Boards and kerbs
  are rebuilt for the new direction.
- **Tools.** `tools/track-script.mjs <id>` prints length, closure changes,
  highest grade, tightest radius and a top-down picture of the centreline
  with corner names (PNG in `.qa-dist/`). Tests cover closure, tangent
  joins, width, reverse, repeatability and the existing courses unchanged.

### 3.2 Racing a full field (P4-FIELD)

Road races allow at most three opponents today, all copies of one rival
starting behind each other. Grand Prix races need up to seven computer
racers who race properly.

- **The field.** Up to 8 cars (you and 7). The computer racers are the
  specialist drivers, so they have names and characters, each in a car they
  suit, close to your car's pace (performance index within 10% of yours;
  Easy picks the slower half, Hard the faster half):

  | Racer | Character on track |
  | --- | --- |
  | Mara Vale | Brakes latest into slow corners; strong in hairpins |
  | Iko Ren | Very consistent; rarely makes a mistake |
  | Sana Marlow | Fastest on long straights; slipstreams well |
  | Jules Reyes | Best starts; aggressive first lap |
  | Nia Frost | Best on snow, ice and gravel |
  | Boone Ward | Defends hard: covers the inside before braking zones |
  | Club racers | Fill empty grid slots, neutral |

  Axel Storm joins on Hard only, in a car of your class, as the one to beat.
- **Grid and start.** A two-by-two staggered grid, 8 m between rows. You
  start in the back half (Easy 5th, Medium 6th, Hard 8th). A gantry of five
  red lights comes on one per second, then goes out after a seeded 0.4 to
  1.2 s; throttle does nothing until lights out (no jump starts). Holding
  throttle at lights out gives a clean launch; nothing more.
- **How they race.** Each racer follows the racing line with its own skill
  (corner speed margin and braking point), consistency (small seeded
  mistakes: a missed apex, an early lift; none on Hard) and aggression
  (how readily it attempts a pass).
  - **Passing.** A faster car within 1.2 s behind on a straight pulls out
    to the side with room and tries to brake later into the next corner.
  - **Defending.** The car ahead may move once to cover the inside before
    a braking zone. No weaving, never a move once the attacker is alongside.
  - **Sharing corners.** A car more than half alongside keeps its side
    through the corner; nobody turns into an overlapping car.
  - **Slipstream.** Within 30 m behind another car and within 2.5 m to
    the side, top speed rises 5% and drag falls; the HUD shows a small
    tow marker. You get it too.
  - Contact uses the existing crash physics. Computer racers never aim
    for contact in a Grand Prix.
- **Catch-up.** None on Hard. Medium: a racer more than 8 s ahead of you
  eases off 2%. Easy: 4%, and the leader makes more mistakes.
- **HUD.** Position (P3 / 8), lap, gap to the car ahead and behind, a
  compact running order on the left (names and positions, your row lit),
  final-lap call. The map shows every car.
- **Results.** Finishing order with names, cars, gaps and best laps; your
  pay by position (section 7).
- **Targets** (tests over 30 seeded races per track and difficulty, with
  the test driver as the player):
  - every computer racer finishes in at least 95% of races;
  - first-lap pile-ups (three or more cars crashing in the first 30 s) in
    at most 1 race in 20;
  - at least 3 passes between computer racers per race on Medium;
  - the test driver wins 60 to 80% on Easy, 30 to 50% on Medium and 10 to
    25% on Hard on the pilot track.
- **Switch:** `grand-prix`. Build and tune it first on the ordinary
  Pacific Canyon circuit with traffic off, so it is proven before any new
  track needs it.

### 3.3 Grand Prix on the tracks we have (P4-GP-EXISTING)

A **Grand Prix** choice on the race setup for the closed road circuits:
Pacific Canyon, High Country, Harbor & Highlands and the six expansion
circuits. Field of 8, no traffic, police or radar, 3 laps. Existing Duel,
Time Trial and Wasteland modes are unchanged. Records and ghosts are kept
separately per mode. Check every circuit's grid area, first corner and
narrow spots with a full field; widen a section (with the width option) only
where 8 cars cannot race through, and record any change.

### 3.4 Grip, surfaces and tyres (P4-GRIP)

Surfaces (multiply the car's grip, braking and steering authority):

| Surface | Grip | Looks like |
| --- | ---: | --- |
| Asphalt | 1.00 | Dry road |
| Graded gravel | 0.85 (rally car and Titan: 1.00) | Packed brown gravel with loose stones |
| Packed snow | 0.70 | White, tyre-tracked, plough marks at the edges |
| Ice | 0.50 | Glossy blue-grey patches with a faint sparkle |
| Deep snow (avalanche drift, snowbanks) | 0.55, top speed limited to 45 mph | Heaped soft snow |

Tyres (chosen on the race setup when a track has snow or ice; changed at a
pit stop):

| Tyre | Asphalt | Packed snow | Ice | Top speed on asphalt |
| --- | ---: | ---: | ---: | ---: |
| Summer | 1.00 | 0.75 | 0.55 | 100% |
| Winter | 0.94 | 1.00 | 0.85 | 97% |

Effective grip is surface times tyre. Braking and steering scale with it,
never below 40% of normal, so a car on the wrong tyres slides wide but can
still be driven.

- **Ice is always fair.** At most 60 m long, never on a hairpin apex,
  always with an ICE board 100 m before and a visible gloss. Shaded spots
  only (forest, under a ridge).
- **HUD.** A small tyre icon (sun or snowflake) and a surface hint when grip
  drops below 0.8 ("SNOW", "ICE", "GRAVEL").
- **Sound.** Each surface has its tyre sound (section 9).
- Surfaces live on the course by stretch (`surface` in the track script) and
  as patches; the driving code reads them, the renderer only draws them.

### 3.5 Pit lane and stops (P4-PIT)

- **The lane.** A pit lane is a separate road beside a straight, with an
  entry line, a speed limit of 60 km/h (the car is held to it automatically,
  a limiter tone plays) and an exit line. The track script names the
  straight; the lane is 9 m wide with a pit wall.
- **The stop.** Your box is marked on the lane. Stop in it (under 5 km/h)
  and the crew works for 4 s: they change tyres to the other type and refill
  boost. The pit crew are two of the existing crew fighters in overalls
  (reuse, no new characters). Drive away when the board says GO.
- **Choosing.** On the approach a pit board shows what the stop will fit
  (for example "WINTER TYRES"). The stop always swaps to the other type.
- **Computer racers** decide by difficulty and character: Easy always pits
  when the next stretch suits the other tyre; Medium 75% of the time; Hard
  pits only when it is faster. Nia Frost may stay out on summer tyres
  through snow (she is good on it).
- **Balance target** (Summit Run, Medium, test driver): pitting for winter
  tyres at the tree line is 4 to 8 s faster than staying on summer tyres,
  and starting on winter tyres is 2 to 5 s slower than pitting. A real
  choice, not a trap.
- Pit lanes exist on Summit Run and Tremblant Snow first; circuits may add
  them later for strategy.
- **Summit's pit bay** (12 October 2026): an opt-in limited stretch of
  180 m centred on the box at 80 km/h (90 if needed); the rest of the lane
  is driven normally. Below the tree line the road is `warm-tarmac`, where
  winter tyres grip less (summer 1.0, winter tuned within .62 to .88), so
  the summer-then-pit plan is the fast one and the targets above stand.
  Lanes without the opt-in, such as Tremblant Snow's, are unchanged.

### 3.6 Light that moves (P4-DAYNIGHT)

Today a course is either day (with a lighting mood) or night (the city
theme). Phase 4 lets the light change during a race.

- **Light paths.** A course or event may give a light path: keyframes from
  a list of looks (`day`, `golden`, `dusk`, `night`), either along the road
  (Summit Run: by distance) or over the race (Panorama Sunset: by race
  progress, so the last lap is at dusk). The renderer blends sun height
  and colour, sky, fog, ambient light and the star field between keyframes.
- **Headlights.** Below a set light level, every car's headlights and tail
  lights come on (emissive lamps and a cheap light cone; only your car casts
  a real light). Road reflectors (cat's eyes) and boards glow in headlights.
- **Night extras.** Stars, a moon, distant town lights in valleys, lit
  windows on landmarks.
- Light is presentation only: it never changes race state. Frame cost stays
  within the usual limit with 8 cars at night.

### 3.7 Snow world (P4-SNOW)

A winter look for the alpine theme, used by Summit Run's upper half and
Tremblant Snow:

- Snow ground and snow-loaded pines (from the sourcing sheet), plough
  banks along the road edges (deep snow surface), packed-snow and ice road
  materials (3.4), frozen ponds, rock faces with snow on the ledges.
- Light falling snow near the camera (cheap, camera-local particles;
  Performance quality shows fewer).
- Breath of wind: blowing snow across the road on exposed ridges.
- Tyre tracks in snow behind cars (short-lived decals, capped).

## 4. Racing feel targets for every track

These are the rules Claude's finishing pass judges (section 11):

- **A signature moment every lap**: the one corner or view players talk
  about (Skyline, Casino Corner, the chairlift jump, the Gallery).
- **One overtaking zone per lap**: a long straight into heavy braking.
- **One commitment corner**: fast, frightening, possible flat out for the
  brave, never a crash for the careful.
- **Rhythm**: fast and slow alternate; never more than three slow corners
  in a row.
- **Elevation you feel**: crests that lighten the car, compressions at the
  bottom of dips.
- **Readable at speed**: every slow corner announced by boards (150, 100,
  50 m), a kerb you can see 2 s before the apex, and a landmark or fence
  line through every blind crest.
- **Scenery frames the road, never hides it**, in three layers: near
  (barriers, kerbs, boards), middle (trees, buildings, crowds), far
  (mountains, skyline, the landmark).
- **Lap time** 1:30 to 2:15 on Medium in a mid car; a race of 5 to 7
  minutes.

## 5. The tracks

Scripts below are Claude's first drafts in the track script format (L is
left, R right; radius and length in metres; climb in metres over the piece).
P4-TRACK-SCRIPT's closure may adjust straights by up to 15%. Claude tunes
the numbers during the finishing pass.

### 5.1 Panorama Ridge (Mount Panorama)

A circuit that climbs a mountain, crosses a narrow ridge between walls and
plunges back down to the longest straight in the game.

- **Event:** Panorama Ridge Sunset, 3 laps, about 4.5 km a lap, field of
  8. Light path over the race: golden late afternoon to dusk on the last
  lap.
- **Width:** 15 m; 11 m with walls on both sides from The Cutting to
  Forrest Elbow (the ridge is narrow and walled); 16 m on Conrod.
- **Signature:** Skyline, a blind crest at the top where you see only sky,
  then the Esses drop away beneath you with the valley lights below.
- **Overtaking:** Conrod Straight into The Chase and Murray's Corner.
- **Commitment:** The Chase kink at full speed.
- **Landmarks:** grandstands and pit buildings on Pit Straight; a radio
  mast on the summit; the valley town below Skyline; a lit scoreboard tower.

| # | Piece | Name | Notes |
| --- | --- | --- | --- |
| 1 | straight 520 | Pit Straight | start line 80 m in; pit lane alongside |
| 2 | turn L 90, r 28 | Hell Gate | heavy braking, first-lap scramble |
| 3 | straight 880, climb +55 | Mountain Straight | steady climb, walls begin |
| 4 | turn R 40, r 110, climb +6 | Griffin Bend | fast uphill right |
| 5 | straight 140, climb +10 | | |
| 6 | turn L 110, r 20, climb +14 | The Cutting | steepest, slowest; width 11 from here |
| 7 | straight 200, climb +16 | | walls both sides |
| 8 | turn R 30, r 150, climb +6 | Reid Rise | |
| 9 | straight 220, climb +8 | | |
| 10 | turn L 45, r 160, crest 2.5, climb +4 | Summit Park | light jump over the crest |
| 11 | straight 160 | Ridge Top | flat, radio mast ahead |
| 12 | turn R 25, r 90, crest 3, climb -12 | Skyline | blind crest, sky only, then the drop |
| 13 | turn L 35, r 60, climb -10 | The Esses 1 | |
| 14 | turn R 35, r 60, climb -10 | The Esses 2 | |
| 15 | turn L 30, r 70, climb -8 | The Esses 3 | |
| 16 | straight 150, climb -20 | The Dipper | steep dip, compression at the bottom |
| 17 | turn L 100, r 22, climb -4 | Forrest Elbow | slow; width back to 15 after |
| 18 | straight 1150, climb -55 | Conrod Straight | two small crests (1.5 m) for air at top speed |
| 19 | turn R 25, r 200 | The Chase | flat-out kink |
| 20 | straight 60 | | |
| 21 | turn L 15, r 220 | Chase Exit | |
| 22 | straight 260 | | braking boards |
| 23 | turn L 90, r 25 | Murray Corner | last-corner lunge |

Turns sum to +360 (left 515, right 155). Climbs and drops balance (119 m).

### 5.2 Harbour Lights (Guia)

A night street race between walls: a seafront run into a hard right at the
casino, a tight climb through the old town, the slowest hairpin in the game
where the road turns for home, then the long Reservoir Run and Harbour Road
back. Redrawn by Claude on 10 October 2026 (the first draft did not close);
`src/circuits/harbour-lights.js` holds the exact numbers.

- **Event:** Harbour Lights Night, 4 laps, about 4.05 km a lap (test driver
  1:34), field of 8.
- **Width:** 14 m on the seafront, reservoir and harbour roads; 12 m in the
  old town; 13 m at the hairpin and the road after it (eased pass, 14
  October 2026: 10 m and 12 m before). Walls both sides everywhere (concrete
  blocks with catch fences); escape roads at Casino Corner and the hairpin.
- **Signature:** Lantern Hairpin, radius 9 m, about 30 km/h, under strings
  of paper lanterns; its approach and exit run side by side with a wall
  between.
- **Overtaking:** Seafront Straight, Lantern Kink and the Casino Approach,
  about 900 m into Casino Corner; also Harbour Road into Harbour Turn.
- **Commitment:** Lantern Kink and the Reservoir Sweep, flat out between
  walls.
- **Look:** neon signs and lit shopfronts, harbour with moored boats, the
  Lantern Tower above the casino, a wet-look road (looks only, grip is dry).

| # | Piece | Name | Notes |
| --- | --- | --- | --- |
| 1 | straight 500 | Seafront Straight | start line 100 m in |
| 2 | turn L 20, r 300 | Lantern Kink | flat out between walls |
| 3 | straight 294 | Casino Approach | boards |
| 4 | turn R 104, r 27 | Casino Corner | heavy braking, escape road (r 22 before the 14 October easing) |
| 5 | straight 150, climb +6 | | |
| 6 | turn L 40, r 60, climb +6 | Temple Hill | |
| 7 | straight 78, climb +6 | | |
| 8 | turn R 60, r 35, climb +5 | Bell Tower Bend | |
| 9 | straight 192, climb +4 | | width 12 from here |
| 10 to 13 | L 46.5 r 32, R 51.5 r 30, L 43 r 36, R 40 r 41 | Old Town Esses | |
| 14 | straight 103, climb -4 | Hillside | |
| 15 | turn L 29.5, r 60, climb -3 | Precinct Bend | turns further from home; the descent starts gently |
| 16 | straight 220, climb -2 | Hairpin Approach | width 13, boards |
| 17 | turn R 175, r 9 | Lantern Hairpin | the slowest corner in the game; level |
| 18 | straight 99 | | |
| 19 | turn L 60, r 45, climb -4 | Fishmarket Bend | width 14 from here |
| 20 | straight 827, climb -17 | Reservoir Run | |
| 21 | turn R 59, r 120 | Reservoir Sweep | fast, walls close |
| 22 | straight 500 | Harbour Road | boards |
| 23 | turn R 109, r 60 | Harbour Turn | |
| 24 | straight 63 | Harbour Return | onto the Seafront |

### 5.3 Tremblant Woods (Mont-Tremblant)

A rolling forest circuit at a ski resort: a plunge to a lake, crests that
throw the car into the air, a hairpin at the end of a short spur and a long
straight back with jumps. Redrawn by Claude on 10 October 2026 (the first
draft did not close); the file `src/circuits/tremblant-woods.js` holds the
exact numbers.

- **Event:** Tremblant Woods Autumn, 3 laps, about 4.4 km a lap (test
  driver 1:37), field of 8. Crisp autumn morning: low sun, orange and red
  leaves, mist on the lake.
- **Width:** 14 m. Grass and gravel runoff; forest close behind. A wall
  between the hairpin spur and Timber Straight (66 m apart, centre to
  centre).
- **Signature:** the chairlift over Timber Straight; the second crest
  launches you right beneath it.
- **Overtaking:** Timber Straight into Devil's Chicane.
- **Commitment:** Pine Drop, a fast downhill right over a crest.
- **Landmarks:** the ski lodge above the start, the chairlift, the lake
  with a wooden dock beside Lakeshore, ski runs cut through the trees.

| # | Piece | Name | Notes |
| --- | --- | --- | --- |
| 1 | straight 414, climb -6 | Lodge Straight | start, pits, grandstand |
| 2 | turn R 60, r 90, crest 2, climb -10 | Pine Drop | fast downhill over a crest |
| 3 | turn L 70, r 50, climb -12 | Lakeside Plunge | lake opens up ahead |
| 4 | straight 258, climb -4 | Lakeshore | dock and lake on the left |
| 5 | turn R 40, r 55, climb +2 | Fir Esses 1 | |
| 6 | turn L 35, r 60, climb +2 | Fir Esses 2 | |
| 7 | straight 326, crest 2.5, climb +12 | Ridge Run | air over the crest |
| 8 | turn R 90.5, r 45, climb +4 | Ridge Corner | |
| 9 | straight 323, climb +6 | Beaver Run | boards |
| 10 | turn L 80, r 40 | Beaver Kink | onto the spur |
| 11 | straight 80 | The Spur | |
| 12 | turn R 170.5, r 22, climb +2 | Beaver Hairpin | |
| 13 | straight 1302, climb -8 | Timber Straight | crests of 1.5 m and 2.5 m; chairlift over the second |
| 14 | turn R 30, r 60 | Devil's Chicane 1 | |
| 15 | turn L 30, r 60 | Devil's Chicane 2 | |
| 16 | straight 283, climb +4 | | |
| 17 | turn R 114, r 50, climb +6 | Lodge Bend | |
| 18 | straight 500, climb +2 | Lodge Climb | |
| 19 | turn R 70, r 70 | Final Turn | onto Lodge Straight |

**Tremblant Snow** (variant, P4-TREMBLANT-SNOW): the same circuit in
winter. Packed snow on most of the lap; asphalt on Lodge Straight and
Timber Straight (ploughed, sunny); two ice patches in the forest (Fir Esses
exit and before Beaver Hairpin). Choose tyres on the setup; a pit lane on
Lodge Straight. Skiers on the slopes (static figures), the chairlift running.

### 5.4 Summit Run (Pikes Peak)

The phase's showpiece: a point-to-point race from the desert to a snowy
summit at night. About 14 km and 4:30 to 5:30 on Medium in the Falcone F42,
the mid car (corrected 12 October 2026 from a drafted 6 to 8 minutes). Only six hairpins, all at
least 15 m radius, with fast climbing roads between them.

- **Event:** Summit Run, 1 run, field of 6 (narrow mountain road), all
  cars allowed. The rally car is strong on the gravel and snow; fast road
  cars win the foothills.
- **Width:** 12 m, 10 m in the Gallery.
- **Light path along the road:** day at the start, golden at the tree line,
  dusk in the snowfields, night from the Gallery on.
- **Total climb:** about 720 m.

| Section | Distance | What happens |
| --- | --- | --- |
| A. Desert Foothills | 0 to 3.2 km | Start straight (staggered grid). Six fast sweepers (radius 120 to 300). Cattle Grid Jump (crest 2.5 m) at 1.1 km. Graded gravel from 1.8 to 2.6 km. Ranger Station Jump at 2.9 km. Climb 120 m. |
| B. Pine Switchbacks | 3.2 to 6.4 km | Forest. Hairpins: Picnic (L 180, r 16) at 3.8, Engineer's (R 175, r 16) at 4.5, Brookside (L 170, r 18) at 5.3, joined by climbing straights of 400 to 600 m with kinks. Climb 220 m. |
| C. Tree Line | 6.4 to 6.9 km | Pit straight with the pit lane on the right (winter tyres, boost). The last trees; snow starts on the verges. Golden light. Climb 30 m. |
| D. Snowfields | 6.9 to 10.0 km | Packed snow at the edges, packed snow on the road from 7.6 km. Three short ice patches. Glacier Hairpin (R 180, r 16) at 8.6 km. Whiteout Crest (1.5 m) at 9.4 km. Snowmen in the runoffs. Dusk. Climb 200 m. |
| E. Avalanche Gallery | 10.0 to 11.4 km | The road splits at 10.1 km: the Gallery (a snow shed, 10 m wide, tighter curves, safe) or the Open Road (faster, under the avalanche slope). They rejoin at 10.9 km. Then a ledge with the valley and town lights far below. Night begins; first stars. |
| F. Devil's Staircase | 11.4 to 13.6 km | Devil's Elbow (L 180, r 15) at 12.0 km, Last Breath (R 180, r 15) at 12.9 km. Night, headlights, light snowfall and blowing snow on the ridge. Climb 150 m. |
| G. Summit | 13.6 to 14.0 km | Finish straight to the summit hut and observatory with lit windows. Yeti spots. |

**Claude's layout draft** (10 October 2026), for P4-SUMMIT to build as a
point-to-point track script. It is checked: no two stretches of road come
within 165 m of each other more than 750 m apart along the road, so the
ground under one leg never overlaps another. Near each hairpin the two legs
run close and climb apart; a kink after every hairpin turns the next leg
away. P4-SUMMIT may adjust lengths and angles by up to 10% to fit the
sections, climbs and jumps, and must keep that separation (add a test).
Climbs follow the section table above (about 720 m in total).

| # | Piece | Name | At (km) | Notes |
| --- | --- | --- | --- | --- |
| | **A. Desert Foothills** | | | |
| 1 | straight 470 | Start Straight | 0.0 | staggered grid |
| 2 | turn L 26.5, r 200 |  | 0.5 |  |
| 3 | straight 380 | Cattle Grid Jump | 0.6 | crest 2.5 m (jump) |
| 4 | turn R 42.5, r 150 |  | 0.9 |  |
| 5 | straight 370 |  | 1.1 |  |
| 6 | turn L 48.5, r 180 |  | 1.4 |  |
| 7 | straight 340 |  | 1.6 |  |
| 8 | turn R 37.5, r 250 |  | 1.9 |  |
| 9 | straight 630 | Graded Gravel | 2.1 | gravel surface |
| 10 | turn L 52.5, r 120 |  | 2.7 |  |
| 11 | straight 390 | Ranger Station Jump | 2.8 | crest 2.5 m (jump) |
| 12 | turn R 34.5, r 200 |  | 3.2 |  |
| 13 | straight 310 |  | 3.3 |  |
| | **B. Pine Switchbacks** | | | |
| 14 | straight 420 |  | 3.6 |  |
| 15 | turn L 175.5, r 16 | Picnic Hairpin | 4.1 |  |
| 16 | straight 190 |  | 4.1 |  |
| 17 | turn R 54, r 80 |  | 4.3 |  |
| 18 | straight 560 |  | 4.4 |  |
| 19 | turn R 172, r 16 | Engineer's Hairpin | 4.9 |  |
| 20 | straight 210 |  | 5.0 |  |
| 21 | turn L 47, r 80 |  | 5.2 |  |
| 22 | straight 570 |  | 5.3 |  |
| 23 | turn L 167.5, r 18 | Brookside Hairpin | 5.8 |  |
| 24 | straight 170 |  | 5.9 |  |
| 25 | turn R 50, r 80 |  | 6.0 |  |
| 26 | straight 370 |  | 6.1 |  |
| | **C. Tree Line** | | | |
| 27 | straight 560 | Tree Line Pit Straight | 6.5 | pit lane on the right |
| | **D. Snowfields** | | | |
| 28 | turn R 38.5, r 150 |  | 7.0 |  |
| 29 | straight 610 |  | 7.1 |  |
| 30 | turn L 40.5, r 150 |  | 7.8 |  |
| 31 | straight 390 |  | 7.9 |  |
| 32 | turn R 175, r 16 | Glacier Hairpin | 8.3 |  |
| 33 | straight 170 |  | 8.3 |  |
| 34 | turn L 53, r 80 |  | 8.5 |  |
| 35 | straight 590 | Whiteout Crest | 8.5 | crest 1.5 m |
| 36 | turn R 33.5, r 200 |  | 9.1 |  |
| 37 | straight 520 |  | 9.3 |  |
| | **E. Avalanche Gallery** | | | |
| 38 | straight 470 | Gallery split | 9.8 | road splits: Gallery left, Open Road right |
| 39 | turn L 40.5, r 120 |  | 10.2 |  |
| 40 | straight 490 | The Gallery / Open Road | 10.3 | avalanche slope over the Open Road |
| 41 | turn R 40, r 120 |  | 10.8 |  |
| 42 | straight 360 | The Ledge | 10.9 | valley and town lights below |
| | **F. Devil's Staircase** | | | |
| 43 | straight 370 |  | 11.3 |  |
| 44 | turn L 175, r 15 | Devil's Elbow | 11.6 |  |
| 45 | straight 140 |  | 11.7 |  |
| 46 | turn R 38, r 80 |  | 11.8 |  |
| 47 | straight 580 |  | 11.9 |  |
| 48 | turn R 178.5, r 15 | Last Breath | 12.5 |  |
| 49 | straight 160 |  | 12.5 |  |
| 50 | turn L 52, r 80 |  | 12.7 |  |
| 51 | straight 590 |  | 12.7 |  |
| | **G. Summit** | | | |
| 52 | straight 440 | Summit Finish | 13.3 | finish at the summit hut |

Total about 13.8 km.


**The avalanche** (P4-AVALANCHE):

- When the first car passes 10.0 km, the avalanche comes down a seeded 6
  to 12 s later, so sometimes the leaders get through and sometimes not.
- **Tell (3 s):** a deep rumble, snow plumes breaking off the slope above
  the Open Road, a small camera shake, the callout `AVALANCHE!` and an arrow
  to the Gallery if you have not reached the split.
- **Slide (2.5 s):** snow pours across the Open Road from 10.42 to
  10.58 km. A car under it is shoved toward the outer edge by the crash
  solver as if hit at 20 mph and slowed to 30 mph; nobody is wrecked.
- **After:** a deep-snow drift (3.4) covers that stretch of the Open Road
  for the rest of the race.
- **The choice:** with the Open Road clear it is about 1.2 s faster than the
  Gallery; through the drift it is about 5 s slower. Signs at the split:
  GALLERY (left) and OPEN ROAD (right).
- Computer racers choose by what they can see: before the slide, the bold
  ones take the Open Road; after it, everyone takes the Gallery.

**Snowmen** (P4-SNOWMEN): 12 snowmen in runoffs and outside the hairpins,
never on the racing line. Hitting one bursts it into snow with its carrot
and hat flying (existing destructible scenery). 25 credits each, at most
10 paid per race, counted on the results ("SNOWMEN 7"). Tremblant Snow
gets 8 near the lodge.

**The yeti** (P4-YETI): a rare sighting, never a danger.

- In about 1 race in 3 (seeded), the yeti stands on a ridge 25 to 40 m off
  the road at one of three spots in Devil's Staircase or the Summit.
- Pass within 60 m with a clear view and it roars, beats its chest and lopes
  away; the callout `YETI!` shows once and the career counts a sighting.
- Three sightings earn a yeti roof look (looks only, the roof slot); five
  earn a frosted paint finish.
- The yeti never touches a car and never blocks the road. Kyle and Gratian
  name it; until then it is "the yeti". A CC0 yeti model from the sourcing
  sheet (Quaternius's monster pack has one).

**Summit Time Attack** (variant): alone against the clock and your ghost,
with bronze, silver and gold times; the avalanche still falls (seeded by
your start), and the yeti may appear.

### 5.5 Ardennes Forest (Spa-Francorchamps)

Kyle, 13 October 2026: "make that one a beauty!" The successor to Panorama
Ridge: a fast, flowing forest circuit with big height changes, and the longest
lap in the game.

- **Event:** Ardennes Forest. 2 laps by default (lap choice 2 to 6), about
  6.7 km a lap, a field of 8, race-only (noCombat). Price 2,000 credits. It
  joins the end of the course list after Summit Run.
- **Light:** morning mist in the valleys on lap one, clearing to bright
  late-morning sun. Low cloud hangs on the forest at the top of Kestrel
  Straight. The tarmac under the trees looks dark and damp (looks only: grip is
  normal).
- **Width:** 15 m; 16 m on Kestrel Straight; 13 m through the Bus Stop. Armco
  and catch fences with gravel and grass run-off rather than walls. Trees stand
  close behind the fences in the forest sections.
- **Height:** 93 m from the lowest point (Stavelot) to the highest (Les Combes).
- **Signature: Red Water and The Wall.** You come down The Plunge flat out,
  cross the stream at the bottom (a compression you feel), then turn right and
  climb a 23% wall with the car squashed into the road. It ends at a blind
  crest where the car goes light. Brake, compress, climb: every car brakes
  hard for the 80 m and 90 m corners (Claude, 15 October 2026, after the
  finishing pass; the road stays as released).
- **Overtaking:** the slipstream up Kestrel Straight into Les Combes; the late
  lunge into the Bus Stop.
- **Commitment:** Whitewood, a long fast left through the trees, flat out in a
  good car.
- **Landmarks:**
  - pit building, garages and the main grandstand on Pit Straight;
  - a café terrace on the outside of La Fontaine;
  - a small stone bridge over the red-brown stream at Red Water;
  - a big hillside grandstand full of people looking down The Wall;
  - a footbridge across Kestrel Straight;
  - the roofs and church spire of a village seen from Stavelot;
  - a tall timing tower at the Bus Stop;
  - tall dark firs and beech woods everywhere, with mist in the dips.
- **Sound:** existing cues, with the Tremblant forest bed (birds, wind in the
  trees).

Claude's fitted layout (13 October 2026). It closes with the fit tool, is
6.68 km, runs clockwise, and its closest separate stretches of road are 103 m
apart (Malmedy and the run back from Riverside). The steepest grade is 23.2% on
The Wall; the tightest radius is 16 m (La Fontaine). Map:
`docs/board/looks/ardennes/round-1.jpg`.

| # | Piece | Name | Notes |
| --- | --- | --- | --- |
| 1 | straight 417, climb -6 | Pit Straight | start line 60 m in; pit lane on the right |
| 2 | turn R 132, r 16, climb -2 | La Fontaine | tight right, first-lap scramble |
| 3 | straight 331, climb -26 | The Plunge | flat-out downhill |
| 4 | turn L 30.5, r 80, climb -4 | Red Water | the stream and the compression |
| 5 | turn R 39, r 90, climb +11 | The Wall | 23% climb |
| 6 | turn L 20.5, r 120, crest 2.5, climb +6 | Wall Crest | blind crest, light |
| 7 | straight 1010, climb +34 | Kestrel Straight | 16 m wide; slipstream; footbridge |
| 8 | turn R 69.5, r 40, climb +1 | Les Combes | heavy braking, overtaking |
| 9 | straight 50 | | |
| 10 | turn L 60, r 40, climb -1 | Combes Exit | |
| 11 | straight 204, climb -10 | | |
| 12 | turn R 66, r 50, climb -4 | Malmedy | |
| 13 | straight 254, climb -16 | | |
| 14 | turn R 159.5, r 20, climb -4 | Riverside | downhill hairpin |
| 15 | straight 180, climb -10 | | |
| 16 | turn L 78.5, r 60, climb -6 | Woodland Left | |
| 17 | straight 282, climb -18 | | |
| 18 | turn L 121.5, r 120, climb -6 | Long Left | fast double-apex left, downhill |
| 19 | straight 286, climb -6 | | |
| 20 | turn R 62, r 60, climb -2 | Fagnes | |
| 21 | turn L 48.5, r 60, climb -2 | Fagnes Exit | |
| 22 | straight 181, climb -4 | | |
| 23 | turn R 63, r 50, climb -2 | Campus | |
| 24 | straight 146, climb -2 | | |
| 25 | turn R 80, r 60 | Stavelot | lowest point; village view |
| 26 | straight 330, climb +20 | Forest Run | |
| 27 | turn R 35.5, r 300, climb +8 | Woodcutter | flat out |
| 28 | straight 390, climb +14 | | |
| 29 | turn L 29.5, r 400, climb +10 | Whitewood | flat out in a good car |
| 30 | straight 358, climb +22 | | braking boards |
| 31 | turn R 83.5, r 25, climb +1 | Bus Stop | chicane, last-corner lunge |
| 32 | turn L 71.5, r 25 | Bus Stop 2 | |
| 33 | straight 40 | | |
| 34 | turn R 29.5, r 60 | Bus Stop Exit | timing tower |
| 35 | straight 180, climb +4 | | onto Pit Straight |

## 6. Variations (P4-VARIANTS)

| Track | Events |
| --- | --- |
| Panorama Ridge | Sunset (default), Night, Reverse |
| Harbour Lights | Night (default), Dusk, Reverse |
| Tremblant Woods | Autumn (default), Snow, Reverse |
| Summit Run | Race (default), Time Attack |

Reverse uses the track script's reverse build; braking boards, kerbs and
pit lanes follow the new direction. A track's variants unlock when you
finish its default event in the top three. Each event is its own entry in
`COURSE` with a stable id (`panorama-ridge`, `panorama-ridge-night`,
`panorama-ridge-reverse`, and so on), appended after the existing events.

## 7. Career (P4-CAREER and P4-CUPS)

- **Where:** a GRAND PRIX section on the course screen, listing the new
  tracks and the Grand Prix versions of existing circuits (3.3).
- **Unlocks:** Ardennes Forest 2,000 credits (13 October 2026), Panorama Ridge 1,600 credits, Tremblant Woods 1,600, Harbour
  Lights 1,800, Summit Run 2,600 (bought like other courses). Grand Prix on
  existing circuits is open on any circuit you own.
- **Pay:** by finishing position, scaled so a Medium Grand Prix win pays like
  a current circuit win (`progression.js`), with smaller pay down to 8th.
  Snowmen add their credits.
- **Cups:** a series of races with points (10, 8, 6, 5, 4, 3, 2, 1);
  ties go to the better best finish.
  - Mountain Cup: Tremblant Woods Autumn, Panorama Ridge Sunset, Summit Run.
  - Night Cup: Harbour Lights Night, Panorama Ridge Night, Neon Docks Grand
    Prix.
  - Winter Cup: Tremblant Snow, Summit Run, Alpine Serpent Grand Prix.
  - Grand Tour (after the other three): all four default events plus Eifel
    Crown Grand Prix.
  A cup win pays a bonus and puts a trophy in a **trophy case** in the
  garage (a row of small trophies, one per cup and difficulty). Cup state
  is saved per named player, can be abandoned, and settles once.
- **Records and ghosts:** per event, mode and car class, like today.
- **Saves:** new career fields are additive with defaults; old saves load
  unchanged (fixture tests).

## 7b. The Team Room: study the track like a real team (Kyle, 10 October 2026)

Kyle: getting faster should not be "drive a random lap and hope". A real
team prepares its drivers: track maps, corner notes, data from your own
laps, and pictures of the key corners to study before the race. The Team
Room brings that into the game, for every circuit, old and new.

**Where.** A TEAM ROOM button on each event's card and on the results screen
("ANALYSE MY LAP"). One screen per event, the **track dossier**:

- **The map**, coloured by the team's reference speed, with numbered and
  named corners, crests and the start line (the same picture as Claude's
  review tool, drawn by the game).
- **Flags at hot spots**: every slow corner, every crest, the overtaking
  zone and the signature moment. Click a flag (in the list, on its marker
  on the map, or on a numbered corner) and a **snapshot** opens: an
  elevated chase view, 9 m up and 18 m behind the braking point, looking
  down the road at the apex so the corner, kerbs and exit are in frame
  (never from the driver's seat, which showed straight road; Kyle, 11
  October 2026). It is rendered live by the game's own renderer (never
  stored pictures, so it always matches the current art), with the
  engineer's note under it.
- **The engineer's notes** for that corner, in a racing engineer's voice,
  short and practical: "Brake at the 100 board. Third gear. Clip the inside
  kerb and use all the road on the way out. Lose time here and you lose it
  all down Conrod." Written per corner in the circuit's file (Claude writes
  them in the finishing pass); existing circuits get notes generated from
  their corner data and edited by Claude.

**Intel you earn, level by level** (per event, per named player):

| Level | Unlocks | How you earn it |
| --- | --- | --- |
| 1. Track map | Map, corner names, flags with snapshots | Free when you own the track |
| 2. Corner notes | Braking board, gear, target speed and line for every corner | Drive 3 laps of the track (any mode) |
| 3. Telemetry | Your best lap's speed against the team's reference lap; sector times; the three corners where you lose the most time, each with advice | Finish a race in the top 5, or 400 credits |
| 4. Reference ghost | Race the team's reference lap as a ghost in Time Trial | Finish on the podium, or 800 credits |

- **The reference lap** is the test driver's best lap on Medium in a mid
  car (the same driver as the review tool), recorded per event and car
  class when the build is made, so it is fixed and fair.
- **Your laps** record speed, throttle, brake and position at small steps
  (added to what the ghost already stores), so the overlay and "where you
  lose time" come from what you actually did.
- **Where you lose time**: compare your lap with the reference corner by
  corner (entry speed, minimum speed, exit speed, braking point) and name
  the cause in plain words: "braking 30 m too early", "too slow at the apex",
  "late on the throttle".

**Race weekend (P4-QUALIFYING).** A Grand Prix can start with an optional
qualifying session: two timed laps alone on the track; your best lap sets
your grid slot among the field's own times (seeded from their skill).
Skipping it keeps the default back-half start. Practice laps count toward
intel level 2.

**Coach (P4-COACH).** An option, off by default, for learning a track: on
corners where you have level 2 notes, a small marker on the road shows the
braking point and a faint line shows the apex. Never in Hard Grand Prix
races or cups.

**Engineer.** One named race engineer for the whole team (text only for
now; a voice later if Kyle wants). Kyle and Gratian may name them; until
then, "your engineer".

### 7b.1 Reference laps and authored intel: final policy (Claude, 10 October 2026)

**Reference laps.**

- One reference per **event and route**. Route events (`ROUTE_EVENT_IDS`:
  Pacific Canyon, High Country, Harbor & Highlands, Ridge Rally) get three,
  one per route: `route_a` seed 1989, `route_b` seed 42, `route_c` seed 17,
  exactly as `src/route-variants.js`. Every other event, including scripted
  circuits and their variants, gets one, keyed `fixed`. Never reuse one
  route's reference for another.
- **Car and driver:** the Stuttgart 959-S, no upgrades, Club Driver, the
  test driver on Medium.
- **Run:** an isolated native fixture: no opponents, traffic, police, radar
  or weapons; memory-only; the route's seed (scripted circuits: the
  course's layout seed). One warm-up lap from a standing start, then two
  timed flying laps; the reference is the faster of the two.
- **Comparison note:** when the player drives another car, the dossier
  shows "Reference lap: Stuttgart 959-S" beside every comparison. Per-class
  references are not built now.
- **Stale references fail the build checks.** Each record stores the
  course's geometry fingerprint; a test fails when any closed-circuit event
  and route lacks a reference or its fingerprint no longer matches, with the
  rebuild command in the message.

**Sectors.** Three per lap. Default: equal thirds of the lap distance.
Authored boundaries in the circuit's intel replace them.

**Authored beats generated.** Written sectors, flags and engineer notes
override generated ones, item by item. Generated data only fills what is not
written: unnamed corners, missing notes, missing flags.

**Where authored intel lives.**

- Scripted circuits: an `intel` block in `src/circuits/<id>.js`.
- Existing courses: `src/circuit-intel/<event-id>.js`, registered with one
  line in `src/circuit-intel/index.js`. Shared code never names a course.
- Route events may author per route: `routes: {route_b: {...}}` overrides
  the event's block for that route.

```js
// Authored intel. Every field is optional.
intel: {
  // Start distances in metres along the lap of sectors 2 and 3
  // (sector 1 starts at the line). Default: equal thirds.
  sectors: [1520, 3010],
  // Hot-spot flags shown on the map. kind: 'signature' | 'overtaking' |
  // 'corner' | 'crest'. Exactly one signature and at most two overtaking
  // flags per lap. camera is the elevated chase snapshot: metres before the
  // flag's point where the view is taken, height above the road (default
  // 9; leave it out), look-ahead distance from that point. The eye itself
  // stands another 18 m behind that point. A corner flag is aimed at its
  // apex unless `ahead` is written.
  flags: [
    {id: 'skyline', kind: 'signature', s: 2480, title: 'Skyline',
     camera: {back: 30, ahead: 70}},
    {id: 'conrod', kind: 'overtaking', s: 3900, title: 'Conrod to Murray'},
  ],
  // Engineer notes by corner id: the slug of the script piece name
  // ('hell-gate'), or 'c1'...'cN' in lap order for unnamed corners.
  notes: {
    'hell-gate': {brakeBoard: 100, gear: 3, targetKph: 95,
      line: 'Wide on entry, clip the inside kerb, use all the exit.',
      note: 'First-lap scramble. Brake early on lap one, late after that.'},
  },
  routes: {route_b: {/* same shape; overrides this block for route B */}},
}
```

**Reference record** (generated by `tools/build-reference-laps.mjs` into
`src/generated/reference-laps.json`, committed because the game loads it;
keep it small):

```js
"pacific-canyon|route_a": {
  "eventId": "pacific-canyon", "route": "route_a", "seed": 1989,
  "car": "stuttgart_959s", "driver": "club", "cpu": "medium",
  "fixtureVersion": 1, "courseFingerprint": "<geometry hash>",
  "lapMs": 50390, "sectorMs": [17010, 16420, 16960],
  // [distance m, speed km/h] every 20 m along the lap
  "trace": [[0, 221], [20, 226]],
  // in lap order; ids match the notes keys
  "corners": [{"id": "c1", "s": 40, "brakeS": 3920, "entryKph": 304,
               "minKph": 220, "exitKph": 260, "gear": 4}]
}
```

**Player laps** record the same fields (trace every 20 m, sector times,
corner entry, minimum and exit speeds, braking points), so "where you lose
time" compares like with like. Saved per event, route and named player:
best lap only, within the save budget.

**Shared code.** The corner, crest and sector analysis moves into
`src/track-analysis.js`, used by both the game and Claude's review tool, so
they always agree. Race state is never changed by the Team Room; it only
reads saved laps and the course.

## 8. Art (P4-ART-SRC first, SPEC 0.11)

One sourcing sheet for Kyle with two or three candidates for each:

- start gantry with five lights; pit garages and pit wall; grandstands (the
  existing stadium crowd fills them);
- kerbs (can be made in code), armco, concrete walls, catch fences, tyre
  walls, marshal posts, braking boards;
- street circuit: shopfronts, neon signs, lanterns, harbour boats, the
  Lantern Tower;
- forest resort: ski lodge, chairlift (towers, cable, chairs), dock, autumn
  trees;
- snow kit: snow-loaded pines, snow ground, rocks with snow, plough banks,
  snow shed (gallery) pieces, summit hut and observatory;
- snowman (Kenney's holiday kit is CC0) and yeti (Quaternius monsters, CC0).

Gritty and believable, never toy-like. Kyle picks before building. Each
track's look gets at most three rounds (SPEC 0.11), with sheets sent to
Claude.

## 9. Sound (named cues)

`race.start.light`, `race.start.go`, `race.position.gain`, `race.lap.final`,
`race.finish.flag`, `pit.limiter`, `pit.wrench`, `pit.go`, `surface.gravel`,
`surface.snow`, `surface.ice`, `avalanche.rumble`, `avalanche.slide`,
`yeti.roar`, `snowman.burst`, `crowd.cheer` (passing a grandstand),
`wind.summit`, and an ambient bed per track (harbour night, forest morning,
mountain wind). Library recipes first (`tools/audio/catalog.json`);
ElevenLabs only by the audio owner within budget.

## 10. Performance

- 8 cars at the start and at night within the usual frame limit (p95) on
  High and Performance, measured at each track's busiest view.
- Only your car's headlights are a real light; other cars use emissive
  lamps and sprites.
- Snowfall, blowing snow, tyre tracks and wet-look reflections all have
  Performance-quality reductions.
- Distant cars use simpler models (existing level-of-detail rules).

## 11. Claude's finishing pass

Kyle wants Claude's taste on every track. Each track has a Claude card
(`P4-FINISH-<track>`) that opens when Codex merges the track.

1. **Codex builds to acceptance** and merges behind the track's switch.
2. **Claude drives and looks.** The review tool (P4-REVIEW-TOOL) gives
   Claude, without playing by hand: a top-down map with corner names; a
   strip of 16 frames from the chase camera at named points (grid, every
   signature point, every slow corner's braking point and apex, every
   crest, the landmark views); a speed trace of a test-driver lap with
   corner speeds and lap time; and a pack frame at the first corner.
3. **Claude tunes the data directly.** While a finishing card is open,
   Claude owns that circuit's data in `src/circuits/<id>.js`: corner radii,
   crest heights, widths, banking, kerb and board placement, landmark
   positions and framing, scenery density by section, light keyframes,
   ambient sound levels. Codex does not edit that file during the pass.
4. **Code-level findings become small Codex cards** with settled rules.
5. **A postcard sheet** (the track's six best views) goes to Kyle with
   Claude's verdict. Kyle and Gratian play it in the Preview; their notes
   come back to Claude.
6. A track is released only after its finishing pass and Kyle's approval.

The finishing pass judges the section 4 feel targets, plus: the first view
from the grid should make you want to race; every corner should look like
it belongs in its place (no scenery floating, nothing clipping the road);
the light should flatter the track at its signature moment.

## 12. Order and cards

Run independent cards in parallel lanes (at most four). Shared files are
edited by one card at a time: `course.js` (P4-TRACK-SCRIPT first),
`game.js` and `sim-rival.js` (P4-FIELD first), `render3d.js` (P4-DAYNIGHT
before P4-SNOW).

| Wave | Cards |
| --- | --- |
| A, foundations | P4-TRACK-SCRIPT, P4-FIELD, P4-REVIEW-TOOL, P4-ART-SRC (Kyle picks) |
| B, first track | P4-PANORAMA, P4-GRIP, P4-DAYNIGHT, P4-GP-EXISTING, P4-AUDIO, P4-CAREER |
| C, more tracks | P4-HARBOUR, P4-TREMBLANT, P4-SNOW, P4-PIT |
| D, the mountain | P4-TREMBLANT-SNOW, P4-SUMMIT, P4-AVALANCHE, P4-SNOWMEN, P4-YETI, P4-VARIANTS, P4-SUMMIT-ATTACK |
| E, career | P4-CUPS, P4-INTEL-DOSSIER, P4-INTEL-TELEMETRY, P4-INTEL-LEVELS, P4-QUALIFYING, P4-COACH |
| Claude | P4-FINISH-PANORAMA, P4-FINISH-HARBOUR, P4-FINISH-TREMBLANT, P4-FINISH-SUMMIT, P4-FINISH-TEAMROOM, P4-RELEASE |

Releases go in batches as Kyle approves them: Grand Prix on existing
circuits and Panorama Ridge first; then Harbour Lights and Tremblant Woods;
then the snow, Summit Run and the cups.

**Switches:** `grand-prix` (the field, Grand Prix mode and the career
section), `panorama-ridge`, `harbour-lights`, `tremblant-woods`,
`summit-run`. Grip, tyres, pit stops, moving light and snow come with the
first track switch that uses them. All are on in the Preview.
