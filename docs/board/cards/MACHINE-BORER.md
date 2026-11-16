# MACHINE-BORER

The short board entry controls current state, ownership, dependencies and locks.

MACHINES section 6. Waits for TUNNEL-TRIAL's go. Thrust and slow steering, cutter head turning, dirt on the conveyor, rock and sparks at the face, breaking through into daylight. Name it when you build it. Tunnels join the road and pipe networks. Stops at reserved places with a sentence. Gratian's favourite thing in the game: Claude plays it before anyone calls it done.

Design: [docs/MACHINES.md](../../MACHINES.md), which wins over [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md). Read MACHINES sections 1, 2, 8 and the section this card names. **No button makes a thing. Real materials, machines and physics, no paperwork. The game will be added to for years: no fixed limits, content in data, and a town saved today loads in every later build.** Pure sim files import no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. Everything is behind `wasteland-town`. Keyboard always works. If something the card needs is missing, write your choice under "Codex decided (Claude to review)" and carry on, unless it touches saves, a released course or a replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list exactly what Claude should try in the browser. No Chrome under `codex exec`. Memory-only saves. No network, account or key; a library only if MACHINES section 12 names it.

## Claude answers

**The trial passed (Claude, 15 November 2026).** Read `docs/board/cards/TUNNEL-TRIAL.md`, "Claude answers" and "Claude's
verdict", before anything else. What it settles for this card:

- **The tunnel is the trial's:** `src/world/ground-tunnels.js` (the rules), `course.setGroundTunnels(list)` (the scene
  follows its revision), the rule of floors. The machine adds segments as it cuts; the last end is a closed face until
  it breaks through.
- **A tunnel begins and ends in a face.** The machine may start only where the ground rises the bore's full height
  within 12 m of the mouth, and it breaks through only into such a face. Anywhere else it stops with a sentence ("There
  is not enough hill over her here. Dig her a cutting first."). The first place to bore on the Scablands is the Ridge.
- **Saving.** A town's tunnels are a list of segments in the town's own ground data, beside the dug ground: start, end,
  radius, and whether each end is open. A save with no list has no tunnels. Nothing already saved changes shape. This
  touches saves, so it gets the save checker and an independent review before it merges.
- **Drawing is Claude's:** rock lining with rings and a pipe run, lamps, darkness between them, the portal at each
  mouth (`public/assets/models/wasteland/town/borer.glb` holds `borer`, `tunnel-ring` and `portal`), sparks and dirt at
  the face. Build with plain shapes and hand over.
- **Not yet explained from the trial:** for the first second after a car is set down outside a mouth, neither car nor
  mouth showed in two of Claude's pictures. Look for it when the camera is touched.

### The design, settled before code (Claude, 15 November 2026). Codex is building it in lane `borer`.

**Where she works.** On any ground of the Scablands that the machines may dig (MACHINES section 10, `editable`), driven
the way MACHINE-CORE's machines are driven and from the same place in the game. She is one more machine in the machines'
data: data plus a model, with drive mode and work mode like the others. Her default name is Mabel; the player may name
her (a name box is FAR-BORE's work, not yours: keep the name as data with the default).

**The bore.** Radius 3 m (6 m across), as data on the machine. The rules already take any radius. The tunnel is the
trial's: `src/world/ground-tunnels.js`, `course.setGroundTunnels(list)`, the rule of floors. She adds a segment as she
cuts; her end of the tunnel is a closed face until she breaks through.

**A tunnel begins and ends in a face.** She may start cutting only where the ground ahead rises the bore's full height
(6 m) within 12 m of her head. Anywhere else she refuses, with this sentence: "There is not enough hill over her here.
Dig her a cutting first." A cutting dug with the excavator into a slope, until its end wall is 6 m high, is a face: test
that with the dig layer. She breaks through only where the far ground falls away the same way; if she comes up under
level ground she stops 3 m short of the surface with: "She is coming up under open ground. Turn her down, or stop here."

**Driving her (work mode).**
- Thrust (W, or the stick forward) pushes her into the rock. The head turns by its own motor. Her fastest advance is
  0.5 m a second in soft rock.
- **The head can stall.** The dig layer's material at the face sets how hard the rock is. The head has a fixed turning
  force. Thrust asks for an advance; the head can cut only so fast in this rock. Push harder than the head can cut and
  the head slows; hold it there for 2 seconds and it stalls: she stops, and the screen says "The head has stalled. Ease
  off, then push again." Releasing thrust for 1 second frees it. Soft rock takes full thrust; the hardest rock takes
  about a third. The screen shows the head's speed as a dial so that a child can learn to keep it turning.
- **Steering is slow.** Left and right turn her by at most 0.5 degrees for each metre cut; up and down change her slope
  by at most 0.3 degrees a metre, within 6 degrees of level either way. She does not steer while stopped.
- She moves backward along her own tunnel at walking pace with the head stopped, and drives on open ground at 4 km/h.
- Keyboard always works; the stick and the wheel use the machines' existing mapping.

**The muck is real.** Every metre cut is the bore's rock volume, taken through the dig layer's `cut` so that the
materials are the land's own, bulked by a quarter as the dig layer bulks, carried by her conveyor and dropped as a real
pile (`fill`) at the tunnel's first mouth, 10 m to the right of the track. Trucks and the loader take it away as they
take any pile. No limit on the pile.

**What she may not cut.** She stops at the edge of a story place, a building, a road that is not the player's, a deck
and any `reserved` shape, with the place's own sentence where one exists (MACHINES section 6: "That's Tin Town. Auntie
Solder would have words.") and otherwise: "She will not cut there. Something stands in the way." Another tunnel is not
in the way: she may break into her own or another tunnel from the side, and the two join.

**A finished tunnel joins the networks.** When both ends are open the tunnel is a link that the player's roads and
pipes may be routed through, as flat ground with no earth to move. Use the routes' and pipes' existing rules; add the
smallest hook that lets a route pass along a tunnel's centre line. If that needs more than a small hook, write what it
needs under "Codex decided (Claude to review)", build the tunnel without it and say so plainly.

**Saving (this touches saves: go carefully).** A town's tunnels are a list of segments in the town's own ground data,
beside the dug ground: start, end, radius, and whether each end is open. A save with no list has no tunnels. Nothing
already saved changes shape; an older save loads exactly as before. Where she stands and her name are saved with the
town's machines as the others are. Run the save checker the repository has for the town's store and name it in your
note. Claude sends this part to an independent review before the merge.

**An apprentice** can run her once the player has cut 20 m with the apprentice beside her (MACHINES section 2), at the
pace that section gives. If the apprentice rule cannot take a machine that cuts along a line, say so under "Codex
decided" and leave the apprentice out; do not invent a new apprentice system.

**Sound cues** (name them in the cue list; plain synthesised cues are enough): `borer.head` (the head turning, a loop
whose pitch follows the head's speed), `borer.stall`, `borer.refuse`, `borer.breakthrough`, `borer.muck` (the conveyor).

**Drawing is Claude's.** Build her, the lining, the lamps and the portal with the plain shapes the model file gives
(`public/assets/models/wasteland/town/borer.glb` holds `borer`, `tunnel-ring` and `portal`; use them where the trial's
plain tube stands, one ring each metre drawn by distance, a portal at each open mouth). The head turns, dirt rides the
conveyor, and sparks and rock fly at the face with the game's existing effects. Do not edit
`src/world/scablands-ground-look.js` or `src/world/scablands-things-look.js`: Claude is drawing in them. The chase
camera sits behind and above her on open ground and inside the bore behind her when she is in.

**One thing left unexplained by the trial:** for the first second after a car is set down outside a mouth, neither
the car nor the mouth showed in two of Claude's pictures. If you touch the camera, look for it.

**Saving, corrected (Claude, 15 November 2026, on Codex's question).** Codex found that the Dig keeps its dug ground
in page memory and that nothing joins it to a town's store yet. So this card saves nothing, as THE-DIG saves nothing:

- **She lives in the Dig.** She is one more machine of the Dig (`src/machines/dig-sandbox.js`), and her tunnels are
  kept for the visit beside the Dig's dug ground, in memory, and are gone when the visit ends, exactly as a ditch is.
- **Ready for the save that comes later.** One function gives the Dig's tunnels as plain data (a list of segments:
  start, end, radius, whether each end is open) and one takes that list back and rebuilds them; a test sends a bored
  tunnel through both and gets the same tunnel. No store is read or written. The card that later joins the Dig's
  ground, machines and tunnels to the town's store keeps the shape written above and gets the save checker and the
  independent review; this card needs neither.
- **Where she is parked.** Not beside the Dome: there is no hill there. She stands 30 m out from the foot of the west
  scarp's face, at the middle of its first stretch, facing it (where the trial's tunnel ran), with a clear run to the
  rock. In the Dig the player gets into her as into any machine there; if the Dig's way of changing machine needs the
  player to walk, add her to the key that changes machine so that nobody walks 3 km. The ground above that scarp is
  level, so a straight bore ends under open ground with its sentence: to break through she must be steered round and
  back out of the face, which the steering limits allow in about 400 m. That is the Dig's first tunnel. When hill
  country is merged, a mesa gives a straight way through.

**Claude's drawing, first part (15 November 2026): the inside and the portal.** `src/world/tunnel-look.js`, new, all in code.
- **The lining makes its own light.** The sun does not reach inside. A lamp at the crown every 14 m with dark between, the grey
  of day for a few lengths in from an open mouth, and the beam of the player's headlights. It wears steel liner plates bolted
  ring by ring, rust run down from the joints, dust up the lower walls, an air duct and the lamps' cable along the crown, a
  water pipe on one wall, a floor of packed muck with two ruts, and fresh scored rock on a closed face.
  `createTunnelMesh` uses it for every tunnel, and the scene tells it each frame where the car and the open mouths are.
- **The portal** (`tunnelPortalShape`, `tunnelPortalSurface`): three steel arch ribs, timber lagging with boards missing, a sill
  under each rib, faded warning stripes on the outer rib and a board over the crown for her name. Drawn and looked at on a test
  page; **not yet stood at a mouth in the game**: Codex places one at each open mouth (its own frame is the bore's centre line
  at the origin, y up, z pointing out of the hill), in place of the model file's `portal`.
- Seen in the game with scenario `tunnel-trial` (passes, twelve views): inside it reads as a plated bore with lamps, a pipe and
  the car's own pool of light, and the far mouth as a disc of day. Still to draw: the machine herself, sparks and dirt at the
  face, the rings as she sets them.

**Three more answers (Claude, 15 November 2026, evening).** The scenario may read `window.__theDig`, as the Dig's own scenario
does. A car driving a tunnel bored in the Dig is put off to the card that saves the Dig's ground and tunnels for the land; this
card's third picture is from inside the bore behind Mabel. Mabel goes last in the order in which the Dig changes machine, so
`test-machine-roads` stays exactly as it is.

**Claude's hand drive (15 November 2026, night, in real time with `tools/hand-drive.mjs`) and the rulings from it.**
She is a real machine to look at: a rusted shell 6 m across with her cutter head, in the Dig, chosen with Q. She drove 31 m to
the west scarp at 4 km/h, cut 12.5 m and backed out; the dial, the mode and the words on screen are right. Not right, and with
Codex now:
- **Camera.** Every view was the small machines': on her back, inside her shell, or against her side. She gets two of her own.
  Following: 26 m behind and 11 m up on open ground; off her right rear quarter at the face; on the bore's centre line 16 m
  behind her tail once she is inside, never through rock. From the mouth: 22 m out, looking in. Never inside her body.
- **Thrust is a lever.** On the keyboard W pushes it forward, S pulls it back, and it stays where it is left. Her advance is
  the lever times 0.5 m a second while the head can cut that fast; past that the head slows and in 2 seconds stalls; the lever
  at nothing for 1 second frees it. The screen draws the lever beside the dial, with a marked band where the head works well.
- **The rock must test the player.** Full thrust never stalled her at the scarp. Under more than 3 m of cover the face is rock
  with softer seams, changing every 8 to 30 m, seeded.
- **The muck is a spoil bank,** not a spike in one spot: laid along a line that starts 12 m right of the first mouth and runs
  away from her track, never higher than 5 m, growing longer as she cuts.
- **From the independent review (Codex):** the Dig did not pass the tunnels to her rules, so she could cut through her own
  tunnel; buildings, decks and roads were not refused; every cutting step rebuilt the whole tunnel; the face rule read one
  line. All with Codex.
- **Changed assertion, reviewed by Claude (rule 18):** `tools/test-machine-roads.mjs` lists the machines that Q reaches in
  order; `borer` is added before the last `excavator`. Nothing is loosened: the list is longer and still proves the wrap.
- Not heard: her sounds (the window was muted). Not seen: the bank, a bend, a break-through.

**Claude's second hand drive (15 November 2026, late).** Her two views show her whole; the lever works and full lever
stalls her with its sentence; a second Codex review confirmed the refusals, the face rule, the seams and the road test.
**The large fault: she bores into nothing.** The Dig draws the ground at the west scarp flat, so after 14 m of cutting she
stands in the open with the portal's boards round her head. The Dig must draw the land's real ground wherever the active
machine is, with the mouth cut out of it. Also back with Codex: the picture check still times out; the tunnel may stop
being redrawn; the camera can sit inside her while she reverses; the spoil bank draws as separate spikes and may run into
the river. **Her parking place moves to the foot of the mesa nearest the yard once hill country is merged:** a mesa is a
wall of rock 30 to 55 m high, and the west scarp is only a step.

**Corrected (Claude, 15 November 2026, late).** After Codex made the Dig follow the land's ground, I still read the pictures as
level ground and told Codex the scarp was drawn in the wrong place. That was my mistake. Measured in the browser, the Dig's
drawn ground agrees with the rules everywhere (13.62 m drawn against 13.60 m, 60 m ahead of her). The slope is drawn in the
plain's flat colour with no rock and no shading, so head-on it looks like level ground. What is left: the Dig's ground wears
the land's own look; the scenario's roof ray is taken from inside the bore; and the face rule, which let her start in a slope
that rises only about 5 m within 12 m, is made what this card says (6 m, from her floor, across her width). At the west scarp
she will then refuse, rightly, and she is finished at a mesa once hill country is merged.

### Coming out the far side (Claude, 15 November 2026, night): she climbs by the player's hand

Codex parked Mabel at the mesa nearest (2214, -518) and found that a level bore never comes out: the plain is not level. Her
floor at the near foot is at -1.6 m and the ground at the far foot is at +1.2 m, 2.8 m higher, 307 m on. Every mesa on this
land has a difference of this kind (0.5 to 24 m). So the line of a tunnel is a thing the player sets, as a real crew does.

- **The head tilts.** The rules already hold it: the arrows tilt the head up or down, 0.3 degrees for each metre bored, to 6
  degrees at most, and the floor follows. Nothing new is needed in the rules for climbing.
- **The survey line.** When she stands at a face that the face rule accepts, before the first thrust, the screen gives the
  line a surveyor would: how far on the far side is on her heading (the first place beyond the hill where the ground comes
  down to her crown or lower), and how much higher or lower the ground is there than her floor. In words: "Far side on this
  line: 307 m on, 2.8 m higher. Hold a rise of 1 in 110." While she bores the screen keeps three numbers: her floor's height
  from the mouth, her head's grade as "1 in N up", "1 in N down" or "level", and what is left ("212 m to go, 1.9 m to gain").
  Beside the numbers a plain strip shows the hill from the side on her line: the ground, the bore so far and the far foot.
  The player still steers; the numbers only say where to aim.
- **Breaking through.** The covered tunnel ends where the ground over her centre line comes down to her crown across her
  whole width, if that place is in a face (12 m back along the bore the ground stands 6 m or more above her floor). A second
  mouth is cut there with its portal. Then:
  - ground beyond within 0.5 m of her floor: she is out. "Daylight. She is through, 0.3 m off level."
  - ground beyond up to 3 m above her floor: she goes on in the open as an exit cutting, climbing as the player tilts her,
    until her floor meets the ground. A cutting longer than 60 m stops her: "She is cutting a trench, not a tunnel. Raise her
    head and bring her up to the ground."
  - ground beyond more than 1 m below her floor: she stops at the lip. "She has come out 2.4 m up the face. Back her up and
    turn her down." A drop of 1 m or less she drives off; the spoil makes the step.
  - no face behind (she is rising under level ground): the sentence already built, "She is coming up under open ground. Turn
    her down, or stop here."
- **The result differs with how she was driven:** how far off level she came out is kept in her state and shown. Half a
  metre or less is a clean hole.
- **The west scarp, corrected again.** I asked for a refusal at every metre of its first 20 m. That was wrong: partway up,
  the scarp does rise 6 m within 12 m, and a bore started there sits in a real face. The rule stays as written (6 m within
  12 m, from her floor at her head, the lowest of left edge, centre and right edge). The test keeps the refusal at the foot
  and on level ground, and the start at the mesa's side.
- **Sound:** `borer.daylight` for breaking through (wind, and the head running free), beside the cues she has.

### After the third review (Claude, 15 November 2026, late night): no state of hers is a dead end

Codex built the break-through as ruled above and an independent Codex review read it. Three of its findings are faults in the
ruling, which Claude wrote, and one rule replaces them: **whatever stops her, some control the screen names gets her moving
again.**

- **The trench sentence warns; it does not stop her.** As ruled, an exit cutting stopped at 60 m, and since her head tilts only
  as she moves, she could then neither move nor tilt. She now hears the sentence at 60 m and at each further 30 m and goes on.
- **Out of the side of the hill, the cure is spoil.** As ruled she was told to back up and turn her down, which she cannot do:
  backing follows the bore already cut. The sentence is now "She has come out 2.4 m up the face. Tip spoil below the mouth
  until she can drive out." Filling the ground beyond the mouth with the dump truck or the dozer frees her. That is the right
  game: another machine's work, done by hand.
- **Rising under open ground ends that heading.** The sentence said "Turn her down, or stop here", and she cannot turn down
  where she stands. It now says "She is coming up under open ground with no face to come out of. This heading ends here. Back
  her out." The same sentence serves where the ground beyond a far face stands more than 3 m above her floor, a case the ruling
  left out and the code turned into a cutting 3 to 6 m deep.
- **Kept as built:** a drop of 1 m or less is driven off and counted as daylight; the spoil bank holds the compacted volume.
- **Also from the review:** the steep drive's test must name the one refusal it meets; the bound on where a refusal happens
  goes back; the screen's survey words are built when her numbers change and not every frame.

### Claude's third hand drive, at the mesa (15 November 2026, late night): not ready to merge

Commit 890610c2d in a visible window with real keys. Codex's picture check failed at "following camera enters the bore".

- **Good.** Her model reads as a real machine: a segmented yellow shield gone to rust, a cutter head, a trailing gantry. The
  survey is plain ("Far side on this line: 301 m on, 1.5 m higher. Hold a rise of 1 in 199."), with a strip of the hill beside
  it. She stalls in rock at half lever and frees after a second at nothing. The Dig holds 57 frames a second while she bores.
  Drawn ground and the rules agree at every place measured.
- **She stays in plain sight inside the hill.** 16.3 m in, under 23 m of ground by the rules, she is seen whole from outside,
  with no portal and no lining at the mouth. The pictures alone could have been misread again, so this is from rays: straight
  down over her the drawn ground is there at 26.2 m; from the camera toward her a ray meets drawn ground after 10.6 m.
- **The up arrow stops her** where it should tilt her (0.00 m in 12 seconds; the down arrow works).
- **The first push of W after Tab is lost** for about 1.2 seconds.
- **The Dig's ground is not the land's:** no hills' rock and no photographs, so the mesa is a mound of cracked plain.
- **Her pace, ruled:** 1.5 m a second at full lever where the rock allows (it was 0.5), about ten minutes for this mesa,
  until a bore can be saved. A bore that is lost when the player leaves must not take an hour.

All six are with Codex, each with its numbers. Not heard: her sounds. Not seen: a break-through, the lining, a bend.

**Corrected the same night.** "She stays in plain sight inside the hill" was not established. Codex measured her: the gantry
trails 25.8 m behind her head, so at 16 m in about 10 m of her is rightly outside the mouth, and the mouth's cut is a capsule
about the bore's own axis, which is right. What Claude saw may have been her trailing length, in a view where the hill's face
and the plain wear the same ground. That is the second time Claude has read a picture of this hill wrongly. The fault is now
put as three measurements in her picture check, and nothing is called a fault until they are in: which end of the model leads;
with her head 45 m in, how many of her pixels are drawn from a camera 40 m to the side (none, with the ground); and whether
the mouth shows its portal and lining with the hill's face round it.

### Claude's fourth hand drive: through the mesa by hand (16 November 2026, small hours)

Commit a8d1d3847 in a visible window with real keys: 300 m of bore, from the face to the far side, on the surveyed grade.

- **The hill hides her: there was no fault.** With her head 46.8 m in and 26.7 m of ground over her, from cameras standing over
  open ground: 30 m out from the mouth and 35 m to either side, 6,593 and 6,636 of her pixels drawn alone and none with the
  ground; from 60 m above the mesa, 6,862 alone and none with the ground; from 60 m out near the mouth's line, 54 of 2,485
  (through the mouth, which is right). The camera Claude had specified for Codex's check stood inside the hill.
- **The mouth is a mouth:** the striped portal, the lining, her tail and gantry inside it, the hill's face round it. From the
  first mouth, once she is through, the far end shows as a point of daylight 300 m away.
- **Her controls:** the up arrow tilts her while she bores. The slow first push is a hitch of about a second at the first cut
  (the simulation's clock moved 0.72 s in 1.68 s of wall time), not a lost key; Codex could not move the first cut's set-up
  earlier and it stays: one second, once. The following camera is inside the bore behind her from 21 m.
- **The survey works as a game.** The line said "301 m on, 1.6 m higher. Hold a rise of 1 in 189." Claude held 1 in 207 from
  52 m in, a little short, and at 178 m the screen said "122 m to go, 0.9 m to gain", from which the miss could be worked out
  in the head: about 0.3 m low. She came out with "Daylight. She is through, 0.3 m off level."
- **Three faults at the far side, with Codex:**
  1. After daylight she cannot go forward, in work mode or drive mode (45 seconds of W in drive mode moved her 0 m). She stands
     with her head at (2328.4, -617), floor 0.87, and 6.16 m of ground by the rules at that place. The Dig still counts one
     open mouth, and nothing of the far side is seen from inside. Daylight is declared where the ground comes down to her
     crown; the drawing opens a mouth only where the bore's end is in the open. The two rules must agree: she bores on until
     her head is out, the far mouth is drawn with its portal, and she can be driven out onto the far ground.
  2. The daylight sentence was not on the screen. The screen still read "1 m to go, 0.3 m to gain".
  3. Her pace was half the ruling. At lever 0.33 she made 127 m in 8 minutes (0.26 m a second) at a steady 60 frames a
     second, with the simulation on real time. The ruling asked for about 0.5 m a second in rock, ten minutes for this mesa;
     it took about twenty.
- **Short of right, Claude's to draw later:** the spoil bank is a flat pale slab with no ground look.
- **A note on the tool:** the drive's window was minimised by something part-way and drew no frames for four minutes
  (`document.hidden` was true). It was restored through the browser's own debugging port. `tools/hand-drive.mjs` should restore
  its window before every step.

Not heard: her sounds. Not seen: a bend, the far portal.

**The pace fault, found (16 November 2026).** It is not her pace. Driven again at a3ad0f98b with the page's own clocks
recorded: while she cuts, the Dig draws about six frames a second (29 in 5 s, the worst 205 ms) where it draws 60 standing
still, and the simulation's clock runs at half the wall clock, a third once the tunnel is long. Her advance per simulated
second is the ruled 0.5 m. A processor profile put 84% of the time in the near ground being laid again in full
(`src/world/near-ground.js`, `refresh` and `place`) every frame in which she cuts, each corner asking the land for its
height. Claude's first figure also included four minutes with the window minimised, and so proved nothing by itself. Codex
has the profile: a cut re-lays only the corners it touched. Smooth play is the first objective; she does not merge at six
frames a second. The far mouth and the daylight sentence are fixed in Codex's tests and will be seen once she bores at speed.

### Claude's fifth hand drive: she passes, end to end (16 November 2026)

Commit 5f9c0aa0c, a visible window, real keys, the page's own clocks recorded.

- **Frames while she cuts:** 283 in 5 s (the worst frame 20 ms) where there were 29, after Codex made a cut re-lay only the
  corners of the near ground it touched. The simulation runs on real time.
- **Pace:** 15.0 m every 30 s at a third lever, from 32 m to 288 m without a change: 0.5 m a second, ten minutes for this mesa,
  as ruled.
- **The line:** surveyed 1 in 189, held 1 in 187; at 292 m the screen read "9 m to go, 0.0 m to gain".
- **The far side:** "Daylight. She is through, 0.0 m off level." (0.03 m), on the screen; two open mouths; in drive mode she
  drove 39 m out onto the far ground, seen from inside the bore framed by the far mouth.
- **A fourth review by Codex (confirmation, rule 17)** confirmed the cures of the third and found one edge case (daylight
  accepted with the far mouth still closed where the ground falls more than 1 m away beyond it) and a missing sentence when
  she breaks into another bore. Both with Codex, with the picture check's last ill-posed measurement.

Not heard: her sounds. Not seen: a bend. The spoil bank's look is Claude's to draw.

### The apprentice is its own card (Kyle's direction, 16 November 2026)

This card left the apprentice out (Codex found that the town's apprentice rule had no way into the Dig and no rule for a cut
along a line). Kyle has since said that long cuts must be taught and sent, with a way to look in on the work. That is card
MACHINE-BORER-APPRENTICE, which starts when this one is merged.

### Result (Codex built her in rounds; four Codex reviews; Claude designed, ruled and drove her five times, 16 November 2026): merged, switch off

Look sheet `docs/board/looks/machine-borer/round-1.jpg` with Claude's review. Full notes: `docs/changes/MACHINE-BORER.md`.

- **Built, in the Dig only, behind `wasteland-town`, nothing saved:** Mabel, last in the Dig's machine order; a thrust lever
  that stays where it is left; rock that stalls her and softer seams; the face rule; a survey line and a strip of the hill;
  a head that tilts; breaking through to daylight with how level she came out; an exit cutting; her two cameras; the lined
  tunnel and portals; a spoil bank; six sound cues. A cut re-lays only the corners of the near ground it touched
  (`src/world/near-ground.js`), which the Scablands scene does not use differently from before.
- **No state of hers is a dead end** (the rule made after the third review).
- **Four independent reviews by Codex** (rule 17). The third found dead ends in Claude's own ruling; the fourth confirmed the
  cures and found one edge case (daylight with the far mouth closed), since cured and tested.
- **Changed assertions, reviewed by Claude (rule 18):**
  - `test-machine-roads`: the Dig's machine order has `'borer'` before it wraps to the excavator (reviewed when ruled).
  - `test-machine-borer` (her own suite, new with this card, rewritten as rulings changed): Shift-for-thrust became the
    lever; one press of Q became seven (she is last); every time and distance pinned to her pace was divided by three when the
    pace was ruled up from 0.5 to 1.5 m a second; the trench stop became a repeated warning; "out the side of the hill" and
    "open ground" have new sentences; a far end is closed until daylight; the steep drive names its one refusal and its place.
  - One is looser in form and is right: the spoil's place was "exactly on the bank's centre line" and is now "within a metre
    of it", because the bank became a ridge three cells wide. It still starts 12 m from the mouth and its cells must connect.
  - The picture check's roof measurement and side camera were Claude's own wording, wrong twice, and were replaced by
    measurements that mean something (the lining is hit within 3.5 m of the axis; a side camera that stands above its ground).
- **Not built, on purpose:** the apprentice (card MACHINE-BORER-APPRENTICE, Kyle's direction of 16 November); a car driving
  her tunnel on the land, roads and pipes through it, and joining separately restored passages (with the save card).
- **Open:** the spoil bank's look (Claude). Her sounds have not been heard by anyone. A bend has not been seen.

**Checks at the merge (Claude):** lane tier 55 of 55 on 5f9c0aa0c (45 minutes, with `test-everburn-easy` passing); on her three
later commits, which touch `src/machines/borer.js`, `src/world/ground-tunnels.js` and her own tests, `test-machine-borer`
(89 s), `test-tunnels`, `test-ground-edit`, `test-machine-roads`, `test-scablands-scene` and `test-scablands-solid` pass;
`npm run build` passes; browser scenario `machine-borer` passes in a visible window, six pictures, no failure listed, 301 frames
in 5.0 s while cutting.

## Checks (named before code)

- `tools/test-machine-borer.mjs`, new: she cuts 40 m straight and leaves 40 m of tunnel with a closed far end; the pile
  holds the bore's volume bulked by a quarter, within 2 in 100; the head stalls under too much thrust in hard rock and
  frees when thrust is released; she refuses with no face, at a reserved place and under level ground, each with its
  sentence; a cutting 6 m deep is a face; she breaks through into a face and both ends are open; a car then drives the
  tunnel both ways on its floor; her steering never exceeds its limits; the Dig's tunnels go out as plain data and come back as the same tunnels, and nothing is written to any store; with `wasteland-town` off nothing is made or loaded.
- `tools/scenarios/machine-borer.mjs`, new, for Claude to run (you cannot run a browser): start her at a face, cut 30 m,
  take pictures at the mouth, at the face from behind her, and from a car driven in afterwards; fail if she is not on
  screen, if the tunnel did not grow, or if a picture's view has no tunnel in it. The page uses only `window.__qaApp`
  and `window.__render`.
- Both replay suites and every world-signature suite: unchanged.
