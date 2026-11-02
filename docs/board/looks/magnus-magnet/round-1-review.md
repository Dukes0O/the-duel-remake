# Magnus the Magnet's roof crane, round 1 of 3 (WARLORD-NINE)

Sheet: `round-1.jpg` (three-quarter front, side, front, top, a close look at the
magnet, and the pole face as saved, blue and red). The car is the real
Falcone Heritage body (the licensed GLB scaled to 4.8 m, as the game does) in a
red close to its game paint, with only the scrapper plates of its armor kit
shown. The crane is the exported GLB, placed where the game will put it.

## Rebuild

```
blender -b --python tools/blender/magnus-magnet.py -- --root .
blender -b --python tools/blender/magnus-magnet.py -- --root . --render <folder>
python docs/board/looks/magnus-magnet/round-1-sheet.py --captures <folder> --output docs/board/looks/magnus-magnet/round-1.jpg
```

The first writes `public/assets/models/wasteland/kits/magnus-magnet.glb`. The
second also renders the eight pictures (`--only side,close` and `--samples` for
quick tests; `--no-build` renders the GLB already on disk). The recipe stops with
an error if the model goes over 6,000 triangles or 300,000 bytes.

## The file

- `public/assets/models/wasteland/kits/magnus-magnet.glb`: 287,388 bytes, 5,510
  triangles (base 1,148, arm 2,026, disc 2,336). Two small JPEG textures (worn
  yellow paint 512 px, dark steel 256 px) and four plain materials.
- Metres, +Y up, +Z is the car's forward (as every car model and the Gunn turret),
  +X is the car's left. Origin: the top of the roof plate at the car's roof socket.
- Nodes: root empty `magnus-magnet` with three mesh children at the identity
  transform: `magnus-magnet-base` (roof plate, slewing ring, turntable,
  counterweight, A-frame, generator, winch), `magnus-magnet-arm` (boom, ram, tip
  head, hook block, three chains, winch cable, power cable) and `magnus-magnet-disc`
  (the magnet).
- Materials: `magnus-magnet-paint`, `-steel`, `-iron`, `-cable`, `-copper` and
  `magnus-magnet-glow`. The glow material covers only the flat pole face (the centre
  disc with three shallow rings, 0.8 m across). Its base colour is dark and its
  emissive is zero in the file, so the game can light it by setting the emissive
  colour (the sheet uses a blue and a red at strength 3).
- Size: base 1.04 m wide, 1.14 m long; reaches 0.65 m behind the origin and 2.49 m
  ahead; 1.29 m tall. The magnet is 1.23 m across and 0.4 m deep, its face centre
  level with the origin and tilted 9 degrees so the face looks down and a little
  forward.

## Where it sits on the Heritage

The Heritage uses the licensed body (`src/hero-vehicle.js`, size 2.3 x 4.8 x 1.3
m). `src/vehicle-sockets.js` puts its roof socket at (0, 1.30 + 0.10, -0.22) =
**(0, 1.40, -0.22)** in the car's own metres (x left, y up, z forward). The roof
surface measured on the scaled body is 1.435 m at that spot, and falls to 1.36 m
over the front of the plate, so the plate's underside is 0.04 m below the origin
to sit into the crown. The Gunn turret goes to the same socket but is then moved
to its own car-local mount (the Heritage's is (0, 1.70, -0.18)); this crane needs
no extra offset: `crane.position` relative to the roof socket is (0, 0, 0). On the
car that puts the magnet's face centre at about (0, 1.40, 1.68), the face 0.3 m
above the bonnet at its closest (over the back of the rim, rising to 0.5 m at the
front) and its front rim at z 2.27, inside the nose (2.4 m;
the scrapper bull bar reaches 2.57 m). The counterweight ends at z -0.84, still over
the roof glass.

## What looks weakest

1. The boom runs along the centre line above the windscreen. It is an open lattice
   and 0.7 m or more above the roof, so it does not block the view out, but from
   behind it still draws a line down the middle of the screen.
2. The magnet is a plain round can. The copper coil ring is only seen from below; the
   side has just the yellow band. A stencilled mark or a dented rim would give Magnus
   more character.
3. The yellow is worn but even. Chips come from the texture only (no chipped edges
   on the shapes), so a close look shows clean edges on the plates.
4. The power cable, generator and winch are small and read poorly from the usual
   chase view; they exist for the close views.
5. The magnet hangs from chains that do not move. If the game swings it, the three
   chains, hook block and cable would need to move with it (they are in the arm
   node; the disc is a separate node, so it can swing on its own, but its pivot is
   the crane's origin, not its top). Say so if round 2 should add a pivot at the
   hook block.
6. Triangles are at 5,510 of 6,000 and bytes at 287 KB of 300 KB: there is little
   room left for round 2 additions without cutting elsewhere.

## Verdict (Claude, 2 November 2026)

Round 1 is final. The crane reads at a glance: worn yellow lattice boom, chains, a heavy round magnet clear of the bonnet, and the face's blue (pull) and red (hot) states are plain from the chase view. Kept as they are: the plain magnet can and the boom's line over the windscreen from behind. Rounds 2 and 3 are not used.
