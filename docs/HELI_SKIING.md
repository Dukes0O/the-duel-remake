# H5 Heli-skiing

Design packet H5, written 24 October 2026 by Claude from Kyle's storyboard
("Helicopter Storyboard Ideas", section "Heli-skiing", 14 October): the
helicopter drops a skier at the top, the run down is a new kind of race,
with slalom, giant slalom, a mogul run with two small jumps, an aerials
kicker and a powder run; thin air at the top limits what you can land with;
the yeti may appear; at the bottom the helicopter lands on autopilot and you
fly on. Kyle handed this design to Claude on 24 October.

## 1. What the game does today

- Kestrel One's thrust falls with height: most thrust = 1.08 x 3,130 kg x
  e^(-altitude / 8,500 m) (`docs/HELICOPTER.md` 3). Summit Run is a
  destination (base 2,860 m) and the game reckons a height there as the base
  plus the height above the start of the road (`altitudeOffset`). The road
  climbs 726 m, so the highest clear landing circle in the Summit world, by the
  hut, is at 3,586 m, not the real summit's 4,302 m. (Corrected 24 October
  2026: the first draft quoted the real mountain.)
- The flying area is the course plus 250 m, ceiling 300 m above the start.
- The yeti lives at Summit. Snow surfaces, the avalanche and snowmen exist.
- Free character models (Quaternius) and ski-resort pieces are in the art
  library (`docs/HELICOPTER.md`, storyboard).

## 2. H5 in one paragraph

At the helipad, the dispatch board offers a **heli-ski drop** at Summit Run
(your own run, free) and, some days, a **heli-ski group** (a guide and four
guests, paid). You fly to a drop pad high on the mountain and land. You step
out with skis on; the helicopter flies itself down to the pickup pad. You
ski the run: a timed race through gates, a judged mogul or aerials run, or
the powder bowl with no course at all. At the bottom you climb back in and
fly on. One player at a time, as everywhere in the game.

## 3. Thin air: the part the Lab teaches

Real heli-ski helicopters carry a guide and four or five guests. The game's
own thrust rule (most thrust = 1.08 x 3,130 kg x e^(-altitude / 8,500 m)), at
the altitudes the Summit world really has (the pads in section 6):

| At | Most thrust | Full group (guide + 4 guests, 95 kg each) and full tank: 2,105 kg | Same, half tank: 1,905 kg |
| --- | --- | --- | --- |
| Pickup pad, 2,886 m | 2,407 kg | hovers, 302 kg to spare | hovers, 502 kg to spare |
| Devils Playground pad, 3,237 m | 2,309 kg | hovers, 204 kg to spare | hovers, 404 kg to spare |
| Summit pad, 3,586 m | 2,217 kg | hovers, 112 kg (5%) to spare | hovers, 312 kg to spare |
| Summit pad, with the Lab's altitude tune (e^(-altitude / 10,000 m)) | 2,362 kg | 257 kg to spare | 457 kg to spare |

The weights are the empty helicopter 1,150 kg, the pilot 80 kg, the fuel and
the group's 475 kg. So in this world a full group on a full tank **does**
hover at the summit pad, only just: the thin air shows as a sluggish climb (112
kg of spare lift is about 0.5 m/s2) and as a helicopter that cannot take much
more. A full tank and the group would stop hovering at 4,027 m, which the
Summit world does not have. The first draft of this packet said "take half a
tank" because it used the real mountain's 4,302 m; that lesson is dropped,
and nothing in the helicopter or the group's weight is tuned to bring it
back. The Lab's air-and-altitude lesson still teaches thin air, and the radio
says it the first time the collective runs out: "Thin air up here. Less air
for the rotor to push. Lighten up: burn fuel or leave some behind."

## 4. Skiing (true, and how the game does it)

All skiing rules are a pure simulation in `src/ski/`, fixed step 1/120 s,
repeatable from inputs, runnable without graphics.

| What happens | Real reason | Game rule |
| --- | --- | --- |
| Going downhill | Gravity pulls along the slope | Gravity's share along the slope under the skis |
| Gliding | Skis slide on a thin film of water that their own rubbing melts | Snow friction 0.05 (right wax 0.045, wrong wax 0.06) |
| Speed limit | Air pushes back, more the faster you go | Air drag grows with speed squared; standing up catches 0.6 m² of air, a tuck 0.25 m². Thinner air at height drags less |
| Turning | Tip the skis on edge and their curved sides bend them into an arc; more tip, tighter turn | Carving radius = 17 m x cos(edge angle), up to 60 degrees (8.5 m); a carve keeps its speed |
| Slowing | Skis turned across the slope scrape | Skid: friction 0.4 while held |
| Jumps | You leave the snow when the slope drops away faster than you fall | Leaves the ground when the ground falls away under the ballistic path; Space adds a small pop |
| Landings | Landing on a downslope is gentle: you keep moving along it | Safe when the slope under you is within 20 degrees of your path and any spin or flip is finished (within 30 degrees); flat or crooked landings tumble (3 s, no other cost). A landing hill may state a wider window: the aerials hill's is 40 degrees (Claude, 24 October 2026) |

**Controls (one keyboard):** A and D tip the skis (turn), S skids to slow,
Shift tucks (no hard turns while tucked), W skates on the flat (below
15 km/h), Space pops; in the air A and D spin, W and S flip. C changes camera,
Esc pauses.

## 5. The runs (Summit Run first; Tremblant later)

| Run | Drop | What it is | How it is scored |
| --- | --- | --- | --- |
| **Slalom** | Devils Playground pad | 450 m long, 180 m drop, 50 gates of red and blue poles, close and quick | Time; a missed gate adds 5 s (in real racing you would hike back up) |
| **Giant slalom** | Devils Playground pad | 1,100 m long, 350 m drop, 40 wider gates with panels | Time; a missed gate adds 5 s |
| **Moguls** | Devils Playground pad | 250 m of bumps at 28 degrees with two small jumps, like a real mogul course | Like the real sport: turns 60%, air 20%, speed 20%. Turns: linked turns along the bump line. Air: a spin or a flip off each jump, landed clean |
| **Aerials** | Above the pickup | One steep kicker onto a 37-degree landing hill, like the real event | Like the real sport: air 20% (height and distance), form 50% (rotation finished, steady), landing 30% |
| **Powder** | Summit pad | No course: the north bowl from the summit to the pickup, any way down. Deep snow slows you, so keep your speed | Not timed. Three untouched stashes to find (each a short, fresh field of powder), and the yeti watching from the rocks |

Moguls form by themselves on real slopes when many skiers turn in the same
places; the loading tip says so. The guide's run (the game skiing each timed
run at 92% of its best line, like the driving instructor) sets the medal
times: gold at the guide's time, silver 8% slower, bronze 18% slower. Judged
runs have fixed medal scores (gold 80, silver 65, bronze 50 out of 100).

**Ski zones.** Like the Deep's zones, each run is authored data: a slope
heightfield (a smooth fall line with the bumps, kicker or bowl shaped in by
a recipe), its gates, the drop and pickup pads and the stashes. The drop pad
matches a landing zone in the Summit Run world, and the Summit world's far
terrain is the backdrop. Stepping out of the helicopter switches into the
zone; climbing in at the pickup switches back.

## 6. The helicopter's part

- **Pads:** two drop pads (Devils Playground, 3,237 m; the summit, 3,586 m)
  and one pickup pad near the bottom of the runs (2,886 m): the Summit world's
  own clear, level 12 m circles (`SUMMIT_PADS` in `src/ski/runs/summit-zones.js`),
  348 m and 351 m apart. Summit's flying
  area grows to include them (its ceiling rises above the summit for these
  flights only).
- **The drop:** land on a drop pad, choose the run, step out. The helicopter
  takes off on autopilot and waits at the pickup.
- **The pickup:** at the bottom, ski into the pickup circle and stop; the
  helicopter is landed and you climb in. If you crash out of a run you can
  restart it from the drop (the helicopter fetches you: no fuel cost) or
  ski on.
- **The group job:** some play days the dispatch board offers "Heli-ski
  group at Summit Run": fly the guide and four guests from the home pad to a
  drop pad you choose, ski your run with them (the guide and guests ski down
  as figures beside the run), and fly them home. Pays 5,600 credits, and a
  quarter more for a clean delivery (no hard landing or dropped load); Real mode
  pays a quarter more, as for other jobs. The weights of 3 apply.

## 7. Rewards

| Goal | Pays (once per player) |
| --- | --- |
| Each run's bronze, silver, gold | 1,050, then 1,050 more for silver, then 1,400 more for gold (3,500 in all per run) |
| Each powder stash found | 700 |
| The group job | 5,600 each time, +1,400 for a clean delivery (a job, like the dispatch jobs) |

Four runs give at most 14,000 credits in medals. (HELI-PAY-CONTINUE: all helicopter pay now follows the race rate; see docs/changes/HELI-PAY-CONTINUE.md.) The Lab's two snow lessons
(Launch angles, Ski wax; `docs/LAB.md` 4.3) open the aerials tips and a wax
kit; the altitude tune (`docs/LAB.md` 4.1) adds thrust at every height
(257 kg to spare at the summit pad with a full group).

## 8. Sounds, voice and art

- **Cues:** `ski.carve` (edge hiss rising with speed), `ski.skid` (scrape),
  `ski.wind` (rising with speed), `ski.gate` (pole slap), `ski.pop`,
  `ski.land` (soft thump; heavier for a hard landing), `ski.tumble`,
  `ski.powder` (soft whoosh), `ski.step-out` (boots on snow, bindings click).
- **Voice:** Roger (the lodge's voice, already recorded for supply runs)
  for the drop, the pickup and the group job; Brian for the thin-air line.
  About ten new lines, radio filter as usual.
- **Art:** the skier from a Quaternius base character in a ski suit,
  helmet and goggles, with skis and poles, in the player's driver colours;
  poses: stand, crouch, lean left and right, tuck, air, tumble. Slalom poles,
  giant-slalom panels, the kicker and the drop and pickup pads with flags;
  guests reuse the same figure in other colours. Slope shapes come from the
  zone recipe. Blender recipe `tools/blender/ski.py`, at most three rounds.

## 9. Save

Optional `profile.heli.ski = {version: 1, best: {<run>: number}, medal:
{<run>: 0..3}, paid: {<run>: 0..3}, stashes: [<id>]}`, runs `slalom`, `gs`,
`moguls`, `aerials`, `powder`. Old saves read as nothing skied.
`normalizeHeli` already keeps unknown keys.

## 10. Switch, files and cards

Switch `heli-skiing` (dev); it works only with the helicopter on and
Summit Run owned. Files in `src/ski/` and `tools/test-ski-*.mjs`.

| Card | Owner | Starts | What |
| --- | --- | --- | --- |
| SKI-RULES | claude-cloud | now | Section 4: the ski simulation, gates, scoring, the guide's run |
| SKI-RUNS | claude-cloud | after RULES | Section 5: the five Summit zones, pads and stashes, as recipes and data |
| SKI-SAVE | claude-cloud | now | Section 9 (lock `save-shape`) |
| SKI-HELI | claude-cloud | after RUNS, SAVE | Section 6: pads, drop, pickup, the group job, thin air |
| SKI-ART | codex | now | Skier, guests, gates, pads (three rounds) |
| SKI-AUDIO | codex | now | The cues and the lines (lock `sound-bank`) |
| SKI-VIEW | codex | after HELI, ART, AUDIO | Drawing, camera, the timing and score cards, controls help (lock `busy-game-files`) |
| LAB-SNOW | claude-cloud | after RULES, LAB-BENCHES | The Lab's Launch angles and Ski wax lessons on the ski rules |
| SKI-FINISH | Claude | after VIEW, LAB-SNOW | Ski every run as a player; medal times fair for an 11-year-old |

Tremblant (Mont Tremblant's top is 875 m: no thin air, gentler slopes) gets
its own zones after Kyle has skied Summit.

## 11. Picked for Kyle (24 October 2026)

- Summit Run comes first: it is the big mountain, it has the thin air and
  the yeti; Tremblant follows as the gentle mountain.
- The group is a guide and four guests, as on real heli-ski trips; it keeps
  solo skiing easy and the helicopter heavy (the summit pad is only just within
  reach of a full group; section 3).
- A missed gate costs 5 s instead of hiking back up, so a child's run is
  never lost to one mistake.
- Medals pay up to 3,500 credits a run, about ten minutes of racing at the race rate.
