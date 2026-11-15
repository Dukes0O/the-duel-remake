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
