# The art line: what works and what to watch for

Every art job reads this before it starts. Whoever finds a new kind of fault
(Kyle, Claude or a job) adds it here in the same commit as the fix, so that no
job has to learn it twice. The kits' own instructions are in
[ASSET_PIPELINE.md](ASSET_PIPELINE.md).

## The method

Six rounds per card is a guide, not a stop (Kyle, 16 November 2026), counted per building or
vehicle on a card that holds several. A piece gets another round for as long as each one makes
it better. If two rounds in a row show no improvement, stop adjusting and change the method.

1. **Start from what already passed.** Read the recipe nearest your subject, and
   copy its structure.
2. **Get photos first.** Generate dead-on photos of one original object from the
   side, front, rear and straight above, all showing the same object, in flat
   light on a plain pale background with an even floor. Parts stand clearly
   apart. No logos or real makers' names. Keep them in the model's `textures`
   folder, credited: `.evidence` is deleted when the lane closes.
3. **Measure on a grid.** Run `python tools/photo_grid.py photo.jpg .evidence/grid.png`
   for each photo and read off the ground, the ends, the centre line, each wheel's
   centre and radius, and each lamp. Do not read numbers by eye. All of an
   object's photos should share one scale.
4. **Split the piece between photos and drawing code** (Kyle, 11 November 2026). Photos give a body its surface;
   the game's own drawing code gives it everything that moves or glows. Fire, smoke, sparks, firelight, dust and
   scorch marks are never modelled: they are drawn by `src/world/scrap-look.js`, which also draws rust, runs and
   grain over plain-coloured parts that have no photo. Flat pictures (story cards, portraits, maps) are drawn as
   HTML pictures, not rendered from models. A piece that is only boxes and flat colours is not submitted.
5. **Choose the kit by the shape:**

   | Subject | Kit | Worked example |
   | --- | --- | --- |
   | Vehicles, buildings, anything that curves every way | **`carve_object` in `photo_carve.py`: fill in a table, write no carving code** | Dot's Diner in `town-outposts.py`; the table at the top of `photo_carve.py` |
   | People, and anything `carve_object` cannot reach | `hull_model.py` directly | `town-walkers.py`, `rattler-photo.py` |
   | Lattices, booms, masts, anything with open holes | `trace` and `slab` in `photo_model.py` | the tow rig's boom in `town-trucks-1.py` |
   | Plate-work, planks, drums, a steam engine | `photo_model.py` flat parts and lathes | `rail-trains.py` |
   | Wheels, lamps, reels, cannon | `tyre`, `headlamp` and `lathe` | `town-trucks-1.py` |

6. **One piece first, then the family.** A job with a long list adjusts old
   recipes and fails. A job with few pieces and an example passes. Jobs asked to
   copy carving code kept going back to shapes made by eye, so the code is one
   call now: if you find yourself writing boxes, stop and fill in the table.
7. **Moving parts are their own pieces,** with their origin on their true pivot.
8. **Render from the exported model,** imported into an empty scene, beside the
   photo at the same camera, in flat light with the Standard view transform.
   In Blender, give cameras a valid local up axis. For a camera tracking local
   `-Z`, use local `Y` as up; using `Z` for both track and up creates an arbitrary
   roll and can make a correct Y-up model look tipped.
9. **Look at it yourself before you submit.** Then commit, including a poor
   result with honest scores. Never delete work because it falls short: Claude
   judges. Commit after every piece.

## Route test: who builds, and how (Old Smoke's furnace, 10 and 11 November 2026)

One piece taken three ways, all judged in the game on the card's four points (facing and doors, stoke and glow,
damage, a gritty furnace on wheels), each out of 5.

| Route | Turns | Facing | Glow | Damage | Gritty | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Boxes and drums in flat colours, Claude in Blender (round 2) | 2 | 4 | 4 | 3 | 1 | Kyle: toy-like |
| The same boxes with wear, fire, smoke and sparks drawn in code (round 3, A) | 1 | 4 | 5 | 3 | 3 | better, still a simple shape |
| Body carved from four photos, plus the code-drawn fire and smoke (round 3, B) | 1 | 5 | 5 | 4 | 5 | Claude's pick |

What the test showed: the photo job for Codex was small (four pictures, about six minutes), the carve took Claude
one turn with the table kit, and the drawn effects took one turn and serve every later machine. The slow part of
the old way was restyling shapes by hand. A Sonnet helper then carved Big Bess from four photos in one job with
this recipe as its example (four build rounds, scores 4, 3.5, 4, 4), so carving goes to helpers and Claude judges in
the game.

## What to watch for

- **An open cage is not a roof.** The Scarab's roof weapon probe found the floor through its cage. Give an open vehicle a supported weapon bridge and check all four mount feet against its real geometry; do not raise the socket until the weapon appears to fit.
- **Generic kit dimensions do not prove a fit.** Probe each stack against the tyre rubber and each cage foot against the body below it. Scarab needed inboard stacks seated on its chassis; Longhaul needed the whole cage and turret moved onto its cab. A single roof-centre height cannot place feet over a truck bed.
- **Imported paint needs the full finish contract.** A standard GLB material has no clearcoat value. Convert painted surfaces to physical materials with an explicit factory clearcoat before preparing damage, so switching paint back to Factory restores the original finish exactly.

- **A family export can omit special-stage geometry.** When a recipe conditionally adds shared ground or drift meshes, include the family/export stage as well as the review stages; the GLB check caught missing standalone ship drifts in `scablands-ships.py`.
- **A branch-level `continue` can omit every later building.** Keep it inside the matching building branch, then confirm each registered child is actually emitted; the helipad's top-level `continue` skipped the notice board in `town-services-2.py`.
- **Something left on the ground, parented to a moving machine, is drawn twice as far out** (MACHINE-YARD-NEXT, 20 November). The yard's dust puffs were children of the machine's own moved and turned root but were given map places, so a puff stood as far from the machine as the machine stood from the map's centre: 47 m for the roller at its start. Put dust, marks and anything else a machine leaves behind in a world group, at the ground's own height, and check one puff's world place against the machine's.
- **A named part can sit at the world origin.** Geometry helpers return independent objects; parent every piece that belongs to a place before family export. Otherwise local coordinates are read as map coordinates and can look like a stray prop on the horizon.

### Flat photographed shapes

- **Smoothing turns flat things into cushions.** A carve rounds the edge of a
  flat crushed car into a pillow. Trace the side-photo silhouette and extrude
  it with `trace` and `slab`; keep the faces flat and do not smooth them.

### Photos and masks

- **Studio background below the sky threshold.** `Photo.sky()` refuses an edge
  seed darker than 185 average grey. A warm grey background then becomes a solid
  slab when traced. Brighten only the temporary mask pixels and restore the
  photo's real colors before building its material.
- **A scaled photo reused for later masks.** `Photo.rgb()` reads the image at
  its original dimensions. If a recipe downsamples a cached image before all
  masks are made, later reads fail or use the wrong grid. Finish every mask
  first; downsample the packed image copies only before export.
- **Background walled in by the subject** (Kyle, 6 November). The flood from the
  frame's edge cannot reach a patch between a person's legs, a window, the gap
  under a truck or the space inside a frame, and it may not match the studio's
  colour, so the carve keeps it as part of the subject. Look at every mask beside
  its photo. Take each patch out by a measured shape.
- **Ground stains and shadows** carve as a block under feet or tyres. Trim each
  mask below the ground line.
- **Background on an edge.** Bleed each photo using a wider colour match that
  takes in the ground shadow, so the studio's colour cannot show.
- **A photo cropped or off-centre.** Measure each photo's own centre line. A
  face its best photo does not show uses the next best.
- **Panels in a generated view board at different scales.** Measure a shared
  door or other feature in each crop. A multi-view board can make its overhead
  panel shorter or narrower than its side and end panels. Normalize the crop
  to the shared feature scale before carving, and check roof and centre-line
  landmarks on a grid.
- **A single generated picture contains several views.** The generator may
  return a four-panel perspective sheet despite a multi-view request. It is not
  a dead-on reference: request each side, end and plan view in its own call,
  inspect it, and regenerate any picture that contains a second view or
  perspective.
- **Separate orthographic pictures can disagree in shape.** Even when each
  generated picture is a clean single view, roof heights or profiles can
  conflict after scaling by a shared door. Compare the same landmark in every
  view before carving; settle the unavoidable silhouette mismatch and record
  which view controls it. The toll-bank front peak measured about 2.8 m while
  its side profile limited the crown to about 2.4 m.
- **A view label can be ignored.** A separate prompt for a side view may still
  return the front elevation. Check the projected silhouette and depth against
  the named camera before tracing; regenerate until the camera is correct.
- **Pale paint eaten by the background match.** Silver or white paint can match a wide colour test, and it comes out as flat blotches (the tanker's tank). Lower `bleed_tolerance`. White subjects need photos on a darker ground.
- **A photo lying sideways.** Say so in the table with `'along': 'x'`. If only part of the object comes out, a top photo's direction is the first thing to check.
- **Top-view front and rear pixel order follows `forward`.** With `forward: -1`, the top view's front pixel is before its rear pixel; with `forward: 1`, it is after. Reversing them can leave only a thin sliver where the top mask overlaps the elevations. Print the carved bounds and check the mask overlap before trusting the export.
- **Whole-picture recolouring** dyes faces and boots too (a green face, Kyle's
  people). Generate a real photo set for a new colour.
- **A photo shows two material states side by side.** Do not map that full
  picture onto either state: both surfaces will show both materials. Crop the
  requested state and repeat only that crop across its surface (formwork,
  TOWN-ART-PLANTS, 7 November).

### Vehicles

- **A part that stands on a different side in each photo** (Old Smoke's chimney: left in the rear view, right in the
  overhead view, centred in the front view) is carved away to nothing. Cut it from every mask and build it as its
  own piece wearing the side photo (`old-smoke-photo.py`).
- **A shield made from a crop of the photo wears a tyre** if the crop reaches into a wheel arch. Read the crop's box
  on the grid like any other measurement.
- **Lights that sit on a photographed door** hide the door when they are dark. Hide them until they glow.
- **A one-sided part lands on the wrong flank.** For a vehicle (`forward: 1`) `carve_object` reads the overhead photo
  mirrored left to right, so a part that is on one side only (Big Bess's ladder) lands on the other flank. Turn the
  overhead photo left to right in a working copy at build time and check a one-sided part. (`big-bess-photo.py`,
  11 November.)
- **A part built after the carve is painted over.** The carve's bleed paints over everything outside the mask,
  including cut rectangles, in its own copy of the photo. A part built after the carve must read a fresh copy of the
  photo. (`big-bess-photo.py`, 11 November.)
- **A tube that wears the photo's outline shows the photo's pale edge** along its sides. Sample inside the outline,
  at half the tube's radius. (Big Bess's exhaust stack, 11 November.)
- **An end photo that shows the tank behind the cab makes the cab as wide as the tank.** Use `ends_split` with a
  cab-only `keep` test, so the cab keeps the front photo and the tank keeps the rear one. (`big-bess-photo.py`,
  11 November.)

- **An overhead photo that disagrees with the side photo along the vehicle** (the Bully, 19 November: its roof began
  0.89 m behind the bumper from above and 1.08 m from the side). Read four or five landmarks on both photos and move
  the overhead photo's rows between them in a working copy before the carve (`working_top` in `bully.py`). The same
  copy is where its tyres are painted out, and where it is turned left to right.
- **Wings the overhead photo does not show.** A carve keeps only what every photo shows, so a bonnet came out as
  narrow as the overhead photo's with bare tyres beside it. Let `keep` allow a shell over each front tyre, and lay a
  strip of the vehicle's own plate where the shell's top will be in the working overhead copy, or its top wears tread.
- **A pale line under the body** is the studio floor seen beyond the vehicle between its wheels, walled in by the
  tyres and their shadow. Cut that rectangle from the side mask, from the skirt's lower edge down.
- **A pale streak down the bonnet's corner** is the headlamp's glass seen edge-on in the side photo. Lay the rust
  beside it over it in a working copy; the lamp is its own piece.
- **A curved plate (a plough blade) is a curve read from its side photo and swept across, wearing its front photo.**
  Take the first subject pixel of each row; bolt heads notch the ends, so give each point the middle value of five.
  Trace the arms a few pixels behind the blade's face so that no edge lies in the blade's surface. The back wears a
  plate photo at its own size: a narrow strip stretched across it comes out as stripes.
- **Lugs in one colour read as boxes stuck on a tyre.** Give each a piece of the tread from the end photo.
- **Wheels and lamps can wear the carve's own copies of the photos** when they lie inside the subject. Opening fresh
  copies embedded three photos twice, 1.2 MB of the file.
- **Tyres** (Kyle, 6 November). Use `tyre` and `wheel_well`. Without them, the
  arch's wall wears a ghost of the photo's tyre, the tread shows the background,
  and the tread smears into stripes.
- **Wheels that sit wrong in their cutouts** came from wheel numbers read by eye,
  up to 40 pixels out. Measure them on a grid.
- **An axle's end** pokes through a wheel face if it runs the full track. Stop it
  inside the tyre.
- When wheels on opposite sides share one `lathe` axis direction, the far wheel
  can shift inboard and sit on the wrong side of its rail. Put each wheel's
  stations outward from the track centre and cap the face that points outward.
- **Lamps** (Kyle, 6 November). A lamp carved on a curved surface wears two photos
  and garbles. Use `headlamp`. If it shows doubled, the front photo's centre or
  scale is wrong.
- **A body that comes apart at an angle** means it was built from flat parts. Carve it.
- **Bits that stand beside a wheel.** The overhead photo's tyres can reach further
  than the side photo's. Keep only wings near a wheel outside the body's width.
- **A thin boom vanishes in a carve.** Trace it, so that its holes stay open.
- **A detail appears on every vehicle in a family render.** World-positioned
  fittings left outside their vehicle root stay visible when the other roots
  are hidden. Parent each named part to its vehicle root.
- **Photo parts float after carving.** Remove photo details that are built as
  separate geometry (such as a hook or mirror) from that view's mask, or the
  carve makes a second copy.
- **A mask crop selects the wrong picture area.** Array masks are row, then
  column; check the crop against the source photo before carving. A swapped
  crop can turn a mirror or the background into floating geometry.

- **A tank under a tied cloth** (Dust's tanker, 6 November). Turn the tank and dress it with the side
  photo laid straight on, so that it shows bare metal where the canvas stops. Build the cloth as one
  draped surface from its hanging edge up to the crown, drawn in to the tank at that edge. Close the
  ends with the end photos as thin traced plates. Flat slabs of cloth standing beside a tank fail from
  every angle. See `town-peace-props.py`.
- **Choosing a vehicle's size.** Measure the same height on the side and front photos. Their ratio
  gives the width that goes with a length. The tanker's invented 11.2 m made its end photos 40% too
  narrow for its height, which squashed the goggles and tilted the look of everything.

### Buildings

- **A carve fills everything,** so an open building comes out a solid box with a picture on its front: it looks right head on and false from any angle. Cut the open bay out with a `keep` box and stand its contents in it as their own pieces.
- **Open bays that erase the whole front:** cuts wider than the measured openings remove the posts, and a `keep` box that reaches above the door removes the header and transom. Measure each bay and preserve its frame and upper wall.
- **Anything standing in front of a wall or roof** (a porch, a sign, a pump) gets painted flat on the wall, and on the far wall too, since both sides wear one photo. No mask can separate it, because the wall is behind it. Generate the same object again, same camera, with those things removed (Dot's Diner: `dot-diner-wall.jpg`, `dot-diner-roof.jpg`), and carve from those. The removed things are their own pieces, wearing the full photo. A generated clean photo lined up within a few pixels of its reference.
- **An overhead photo at a slant** shows side windows on the roof. Ask for a true plan view with no wall showing.
- **A round tube comes out square** wherever it tapers, because side and top photos alone cannot round a corner. Set `round` to 2 in the table.
- **Wide thin parts cannot be carved.** An aeroplane's wings fill the front photo's silhouette, and the carve fills that width along the whole length (the plane school, round 6). Photograph the body without them. Trace wings and fins as their own `slab`, or leave them out if the card does not ask for them.
- **A round tube comes out square** wherever it tapers, because side and top photos alone cannot round a corner. Set `round` to 2 in the table.
- **Two bodies joined end to end** (an aircraft nose and a bus) come out with the wider one's shape along the whole length. Set `ends_split`.
- **A windscreen pieced together from three photos** on a curved nose: set `front_favour` to 3 so that the nose wears its front photo further round.
- **End photos at a different scale** make a body far too wide, and it fails the eye before it fails a check. Each end photo now states its roof's pixel row as `top`, and the carve stops if it is missing. Choose the length from something you know in the photo: a door, a chair, a wheel.
- **End photos mirrored** against the side photo: work out which hand the porch should be on from the side photo, and set `front_x_flip` if the end photos show it on the other.
- **A photo the carve has used is painted over** outside the subject. Open a second copy for anything else traced from it (the diner's wings).
- **A named texture is not necessarily a material swatch.** `corrugated-tin.jpg` is a useful roof/detail photo but includes diner imagery; using it as a repeating whole-wall material puts unrelated photographic fragments across every tin panel. Inspect a proposed tile and use a clean standalone corrugated-tin swatch for broad surfaces.
- **Dark studio pixels are rejected as sky.** `Photo.sky` ignores seeds whose mean is below 185. Use `lift_if_dark` on the measuring photo before flood-filling, and inspect the saved mask; this changes only the in-memory mask copy, not the packed source photo. Without it, a tower traced from the original fire-station composite includes the grey studio as a solid plate.
- **Mirrored.** Check the front photo's `pick` direction: cans on a shelf swapping sides show it.
- **Separately generated orthographic views can describe different aircraft.** Even with a shared prompt, front/rear/plan references may disagree with the side view on fuselage proportions, wing sweep, tail or engine placement. Compare landmarks across all grids before carving; a mathematically measured but unrelated end photo still produces broken geometry.
- **Separate generated views can have different image sizes, framing and details.** A front photo with a taller canvas than the side photo can give the same figure two different measured heights; separate generations can also produce different faces and plate layouts. Use the first photo as an image reference for later views, check image dimensions and landmarks, scale each view to a shared physical landmark, and inspect the masks before carving.
- **An open frame photographed dead on still shows its far frame.** A generated end view of an open shed shows the far posts inset behind the near ones and the roof's underside, so a trace of the photo's mask takes them all in. Read each member of the near frame off the grid as a polygon and trace those (`polygon_mask` in `town-works.py`). Give the photo one scale for width and height: stretching it to reach a width made short stubs (the sawmill, rounds 2 and 3, 19 November).
- **A roof over an open shed hides what the card asks to be seen.** The mayor's camera sees about as far in under an eave as the eave is high. Leave a bay or two unsheeted over the machine, with the purlins showing (the sawmill's saw).
- **A small carved shed comes out as a cushion.** Smoothing rounds a carve by about two voxels. A 7 m shed at a 0.12 m grain had pillow corners; at 0.07 m they are rounded by a hand's width. Seat the body too: voxel centres leave its lower edge about 6 cm above the ground (the salvage yard's shed, 19 November).
- **A heap that is one flat shape wearing a picture reads as paper.** A low spiky mound of clay and a "tumble" of bricks wearing a photo of a wall both looked like sheets laid on the ground. A heap is several rounded mounds run together; loose bricks are separate bricks (62 cost 620 triangles) on a bank of rubble (19 November).
- **A heap wearing its overhead photo shows the studio at its foot.** The mound's outline wobbles beyond the photographed heap. Take the picture from the middle three-quarters of the photo's heap. The same holds for a side photo of a heap wrapped round a mound: take only the heap's middle (the sawdust's grey patch, 19 November).
- **A function that places a picture on a mound is handed points already measured from the mound's centre.** Adding the centre again put a metre of studio floor across every grave (Old Ground, 19 November).
- **Round boughs built along a photo's limbs smear it.** Wrapping the photo's width of a bough round a tube gave mirrored grain, then bands, and pale streaks of studio wherever a radius was guessed too wide; two rounds did not cure it. A bare tree is three cut-outs of the photo's own outline standing through the trunk a third of a turn apart, the middle one mirrored (`cutout` in `town-works.py`).
- **Ground cannot be dug in a model:** the town's ground hides everything below it. A pit or a trench is the photo's dark floor laid just above the ground, between a raised lip and the spoil bank, so that its depth is read from the banks (the test pit and trench, 19 November).
- **Generated views of one object disagree in proportion.** The flatbed's rear photo made its deck 2.7 m wide, its overhead photo 1.8 m and its front photo 2.0 m. Choose the width, give each end photo its `scale` from it, and set `ends_split` so the front photo shapes the cab and the rear photo the deck.
- **A wheel arch cut as large as its tyre comes up through a flat deck** and shows from above as two dark notches. Give `wheels` a smaller radius for an axle under a deck; the tyre built separately keeps its true size.

### People

- **A figure shows its face or arm twice from three-quarter views.** Flat views carve each limb square, and its corner faces wear the front and side photos at a slant. Set `round` to 2, and `ends_split` at the middle with `front_favour` and `rear_favour` at 3; carve a square plinth separately (the statue, 7 November).
- **A part the game moves must not also be carved into the body.** The mixer truck (round 7, 8 November) was carved whole from photos that showed its drum, then given a turning drum as well: two drums from above, a hole at the rear, the work pose turning one drum through the other. Carve only what is one solid (a cab from photos of the cab alone); build each moving part separately, and keep it out of the carve photos.
- **Machines: photograph the machine with its moving parts removed, and carve only from the frame up.** The mixer truck passed on 8 November after four failed rounds: photos of the same truck with its drum taken off, all four views showing the same cab (one front photo had shown a different truck); the carve cut at the bottom of the frame rails so the ground shows between the wheels; axles, tanks and tyres built as pieces; the drum a closed lathe built once. Generate all four photos in one go and check that they show one machine before carving.
- **Leave out of the carve photos anything that hides the body in any view.** The roller (rounds 20 and 21, 8 November) was photographed with its canopy; from above the roof covered the body, the recipe cut that region away, and the carve came out as a fragment. A canopy, a boom, a drum or a hopper is built as a piece and kept out of all four photos.
- **Never cut a part out of the one view where it hides the body.** The roller's rear tyre covers most of its body from the side; cutting the tyre from the side photo removed the body behind it and left a flat strip at 2 m for three rounds (9 November). Cut a wheel from the front, rear and top photos, where it stands beside the body, and keep it in the side photo; the separately built tyre covers that region.
- **Old joint code may face the other way from the carve.** The loader (rounds 28 to 30, 9 November) kept its arms and bucket at the back for three rounds: the carve faced front along game -Z (Blender +y) as the card says, but the older joint code put the front frame at Blender -y. Before placing moving parts, print the exported bounds of the body's front end and of each moving part, and check they agree.
- **A cut can sever the solid and make `largest_part` discard the cab.** Check each carve mask at every bridge between the cab, frame and bed. Do not cut a folded crane or deck support that is the only connection to the frame; remove only the separate moving cargo.
- **An open bed can carve as a solid cargo block.** The side silhouette includes the air inside stake walls, even when the top photo shows an empty bed. Measure and clear the volume above the deck before adding cargo as separate pieces.

- **Legs shifted out from the hips, wide stance** (Kyle, 6 November). A leg pivot's
  offset was counted twice. Check each foot's world position against the photo.
- **Four legs** (Kyle, 6 November). A coat's sides kept below the hip read as extra
  legs. A coat is one closed skirt.
- **Hats that float, or shards behind a head:** photos that do not show the same
  person, or a part not joined. Use `largest_part` and check all views.

- At conversation distance, a photo hull can carry a second profile on a cheek, a bright studio edge on a sleeve and a patch of floor between the boots. Measure the garment and each limb separately. Give the head one continuous front-to-back texture, keep the two boot soles separate, and inspect the exported skin in a turned pose. A long coat retains one skirt across both thighs with a vent down the front (STORY-PEOPLE, 18 November).
- A rigid outfit added to a skin can appear metres away even when its head anchor is correct. Transform the garment vertices from their old world position through the new joint's inverse bind pose. Check the actual deformed garment bounds in standing and resting poses.

### Placement and export

- **Two ground layers can share the wrong shader.** A material that changes the
  fragment shader in `onBeforeCompile` needs a distinct Three.js program cache
  key. Otherwise drawing the near ground first can make the coarse horizon cover
  the car. Compare the compiled program IDs and the pixels under the car with
  the horizon visible and hidden. On Tin Road the coarse layer stood 1.388 m
  above the car's support. (WORLD-FAULTS-18-NOV, 18 November 2026.)
- **An empty render sheet or a tiny prop:** an exported glTF is Y-up, but a
  Blender render scene is Z-up. Convert camera positions and targets with the
  same game-to-Blender transform as the model before judging framing; inspect
  one whole-object shot before assembling the sheet. (WW-ART-SEA, 7 November.)
- **A top-down comparison can be rolled a quarter turn.** The top photo may
  already put the building's front at the top of the frame. Check the roof
  courses and front edge against the source before copying another camera's
  roll; a needless 90-degree roll turns both. (TOWN-ART-PLANTS, 7 November.)
- **A model that is black in the game** had its colour made by a noise texture. The exporter writes no colour for a
  material whose colour comes from a texture node; the material arrives white, and any metal setting then draws black
  where there is no sky to reflect. Set plain base colours and keep metal at .2 or less for Scablands art. (Old Smoke's
  furnace, 10 November.)
- **A vehicle standing on its nose in the game** was authored +Y up and then exported with the exporter's own Y-up turn.
  A recipe authored +Y up exports with `export_yup=False`. (`scablands-vehicles.py`, 10 November.)
- **Fine gravel can make interrupted wheel marks look like continuous rails in chase view.** Measure the tyre centres
  on the driving mesh. Break up the marks over metres using the road's world-space wear texture, then use its fine
  grain inside each impression. Check the gaps from the moving driver's camera. At a gate, fade the old grader ruts
  across their whole width so the approach shows a single pair. (Tin Town, 18 November.)
- **Check a road lamp from the driver's approach.** Tin Town's first pool was too faint to read from 24 m in the
  game's dusk chase view. Compare the same exposure at 24 m and at 5 m. Up close, check that gravel and wheel
  marks remain legible inside the light. (Tin Town, 18 November.)
- **Look at the piece in the game before accepting it.** Both faults above passed three rounds of Blender renders,
  because the renders showed the noise colour and the review camera was turned to suit. A piece nobody has loaded in
  the game is not checked: its scene test must use the names and the file the real loader gives.
- **Art near black in the game while its file has good colours** was darkened in the game's code once for every part
  that shared a material: a rust used by forty parts ended at a thousandth of its colour, while a paint used by three
  kept most of it. Code that tints loaded art copies each material and tints it once. If one colour of a model reads
  and another is black, count the parts that share each material before touching the recipe. (`tintArt` in the
  Scablands scene, 10 November; round 1 of the furnace lightened the recipe's colours for nothing.)
- **Boxes and drums in flat colour look like a toy** (Kyle, 10 November, Old Smoke's furnace round 2). A recipe of
  plain cubes and cylinders with one colour per part reads as a furnace at 30 m and still looks like a toy, however
  the colours are chosen. A piece the player looks at for a whole chase is built from photos with the kits in "The
  method" above. Do not spend a round restyling box art.
- **Roof pieces float** when placed at the table's `height`, which includes the photo's roof kit. Read the carved body's own surface under each piece (the Vane escort's beacons, 7 November).
- **A piece built from raw points stands on end** when glTF points (Y up) go straight into Blender mesh data (Z up). Convert each point (x, y, z) to (x, -z, y) (the crusher's belt).
- **A trace takes in whatever lies in its box.** A leg box drawn where the photo has gravel made a false leg. Check each traced part against the photo before keeping it.
- **Wide seat-band cuts break a scaffold.** Removing horizontal seat bands from one whole stand mask also cuts through the posts and braces where they cross those bands, leaving broken supports. Trace seat rows as separate pieces and build or trace the open frame independently; inspect the full side view.

- **A part stands 22 m from its machine because a name was used twice.** `town-machines-2.py` named a paver track
  wheel `roller` inside a loop, after `roller` already meant the road roller. The line that lays the family out in a
  row then moved that one wheel to x = 22 and left the roller on top of the loader. Every sheet hid the other machines,
  so nobody saw it until the paver was loaded in the game, where a black lump hung in the air beside another machine.
  A recipe that builds several machines gives every loop its own names, and its last step prints each machine's
  bounds: a machine wider than its own table is this fault. (MACHINE-ROADS, 19 November 2026.)
- **A stand-in shape hides a model that was never loaded.** The yard drew a yellow box for the roller and a green box
  for the paver when their models were missing from the file it loaded, and so it never failed. The models had been
  finished in another file for eleven days. Where a model is missing the game should say so, not draw a box.
  (19 November 2026.)

- **Double-counted positions.** Set a child's position from its true world point,
  as `attach` does. Subtracting a parent's position in a chain doubles it.
- **A drum spins around the wrong axis in a Blender review.** Town models convert game Y-up to Blender Z-up, so a part whose long axis is game Y spins around Blender Z (local Euler Z), after checking its imported joint orientation. The mixer-truck review pose originally rotated around Blender Y and looked unchanged end-on.
- **A small bank becomes a ramp.** Blender Euler rotations take radians. Passing a value converted to degrees into a rotation field turned a half-metre ship bow slope into a steep ramp; keep the `asin` result in radians.
- **A horizontal beam turns upright.** `to_track_quat('Z', 'Y')` is ambiguous
  when the beam points along Blender Y. Use an axis-aligned box or a different
  non-parallel up axis, then print and check its bounds.
- **Moving parts can sit away from their parent.** A gate leaf was parented to a
  hinge empty after its planks were made at world origin, so the exported leaf
  stayed in the road instead of under the gate header. Place each child at its
  true world point before attaching it, put the empty at the real hinge, then
  render both closed and rotated poses from the exported GLB.
- **Shared mesh instance moved on the wrong up axis.** `Mesh.finish` converts
  Y-up vertices into Blender's Z-up coordinates. Convert an instance's Y-up
  translation too: `(x, -z, y)`. Otherwise a reused load can float above its deck.
- `carve_object` already returns a Blender Z-up mesh: `voxel_surface` maps the
  photo grid's game coordinates while it builds the vertices. Applying
  `game_vector` to that mesh a second time swaps length and height and separates
  it from Blender-built parts (roller, round 21).
- **Which way is forward.** A town object's front is -Z; a car's is +Z. Check one
  box before modelling. A model that lies on its side, or a side view running
  backwards, is this.
- **Flat colour where a picture should be:** lost picture coordinates. Every
  layer is named `UVMap`, and each primitive has only `TEXCOORD_0`, with a range.
- A joined home can have a healthy UV range even when an entire wall samples
  one line of the picture. Compare the UV area of each triangle on the colour
  texture's sampled channel with its area in square metres. Recover the original
  island from a secondary channel where possible. A vertical wall needs a
  horizontal coordinate that varies along that wall (Founding homes, 18 November).
- **Text reads backwards** on a far side, whose coordinates run the other way.
  A sign is its own `slab`.
- `metallicFactor` at most 0.3, since nothing is there to reflect.

### Ground that a machine has changed

- **Dug ground that reads as paper** (pale patches with hard straight edges) was three grounds drawn in one place: the
  yard floor, the coarse near ground and the fine edited chunks, and only the chunks know what was heaped or cut. Where
  either of the other two stood above them the player saw the wrong one. Measure it in the running game with a ray
  straight down over every changed cell and name the mesh it meets first; cure it by keeping the other grounds below the
  edited ground inside every edited chunk. (The Dig, 16 November 2026.)
- **Every heap was drawn as a tunnel's spoil**, grey broken rock, because the drawing of made ground was written for
  Mabel. A heap of topsoil or clay is the ground's own earth turned over, darker and duller. The chunk carries which
  it is (`aSoil` in `src/world/ground-view.js`). (16 November 2026.)
- **Tell colour from light before changing a colour.** Switch the sun off in the running game: what stays pale is colour,
  what goes dark was only lit. A heap's body turned out to be light and its pale ring colour. (16 November 2026.)
- **Work painted on a ground that lies under another ground is never seen.** The road machines coloured the yard's
  floor, and the floor lies under the edited ground wherever a machine has worked, so a finished road showed nothing at
  all for five days. A picture from straight above after one pass settles it. Worked ground is now its own thin surface
  0.07 m above the ground (`createRoadWorkView` in `src/machines/roads-view.js`), on the same one-metre corners and the
  same diagonal as the edited ground so that the two lie parallel, with its states drawn by a shader the way wear is
  drawn on a machine. (MACHINE-ROADS, 19 November 2026.)
- **A drawn ground colour comes out two or three times too pale.** A colour written into a shader is multiplied by the
  yard's sun and sky light before the picture is toned. Loose earth written as it should look came out as pale sand, a
  road mat as grey, and standing water as a white disc. Start from about a third of the colour wanted, look at it in
  the game beside the ground it lies on, and keep a made surface rough: a smooth one mirrors the pale sky and reads as
  mist. (MACHINE-ROADS and MACHINE-DRILL, 19 November 2026.)
- **Cracks drawn from the level lines of a noise picture run in loops** and read as worm trails. A surface that has
  broken up is a net of small plates: draw the walls between scattered cell centres (`roadPlates` in
  `src/machines/roads-view.js`). (19 November 2026.)
- **A heap or a pit taken for worked ground.** The yard starts with a one-metre heap and a one-metre ditch recorded as
  road cells. Drawn as "cut" they came out as one flat pale slab, the paper fault again. Only what a tool did is drawn as
  work; a heap or a hole is the ground's own shape and the ground draws it. (19 November 2026.)

### A site drawn in code, stood in the open land (OPEN-LOOK-RATS-NEST, 26 November 2026)

- **A cloud session can take the pictures itself.** The browser harness ran in the cloud container: `DUEL_CHROME_PATH` set to a two-line script that starts the container's Chromium with `--no-sandbox` (it runs as root there), and the harness's own `--enable-unsafe-swiftshader` draws without a graphics card. A look scenario of seven pictures took about four minutes, the QA build included. They are pictures on Performance from a software renderer: good for shape, colour against the land, and what hides what, and never the laptop's verdict.
- **Colours chosen without seeing the land are wrong.** The cutting's walls were drawn in pale tan and stood in red earth: the wreck fields north of the Boneyard are red. Take one picture in the land before choosing the colour of anything that is cut from it or lies on it.
- **The land's near ground stands inside a deep cut.** The near ground is drawn in cells of about 23 by 17 m (`src/world/near-ground.js`) and the coarse ground in larger ones, so a cut 9 m deep with steep sides showed red dunes across its floor: the three-grounds fault of the Dig at a larger size. `tools/open-look-stand.js` cures it for pictures only (it has the edit layer draw every 32 m square round the site and sinks the near ground's corners there). A site with ground of its own needs a real join in the card that places it.
- **A mark's strength multiplied into a dark colour makes it darker.** Worn ground at "a third of the strength" came out as black blots like the shadows of clouds. Strength belongs in the alpha (a `color` attribute of four numbers) for a mark on the ground, and in the colour only for a pool of light that is added.
- **A fire's smoke column between a viewpoint and what it looks at hides it.** `createSmokeColumn` is one upright sheet and it is wide a few metres up. Keep every fire a few metres off the line from each place to look from to its target, and keep `foot` under a metre.
- **A wreck on its side, seen from its roof, is a box.** A shell built from stations along its length reads as a car from the side (arches, window openings, pillars). Stack wrecks upright where they face the viewer.
- **The rear view is drawn into the game's own canvas,** so hiding the page's other elements leaves it in every picture. Give `.rear-view-frame` no size (`display:none`) and send a `resize`: the rear view is not drawn while its frame measures nothing.
- **The nearest road may not see the site** (OPEN-LOOK-BUS-RING). The Ridge Road passes the Bus Ring 740 m off but 40 m up, behind the ridge's edge, and the first far picture was of a bank. Pick the far view by sight line (`sees` along each road, sampled every few metres), and face the gate and the tell towards that road.
- **A light-card for a far tell needs a least size.** A welding flash sized for the yard was a second sun close up and nothing at 700 m. Give the card a least angle (its size grows with distance only beyond it), so that it is small near and a few pixels far.
- **A point light beside thin tube makes it neon.** The arc's light a few centimetres from the buggy frame lit its tubes white. Stand the light off the work, a metre up and out towards the viewer, and keep it near the lamps' strength.
- **Vertex rust in whole-number cells reads as planks.** Weathering picked per cell of `floor(z), floor(y)` came out as boards on a bus side; interpolate the noise smoothly, and keep `createScrapWear`'s `paint` near 0.45 on long metal sides.
- **Judge a colour by the pixels, against the land's own rocks** (OPEN-LOOK-RADIO-HILL, 26 November 2026). The open land is lit hard and the tone mapping squeezes every sunlit face: halving a stone's colour moved it on the screen from 222 to 205. Sample the picture (the land's rocks read about 165, 140, 95 lit and 88, 71, 52 in shade on the hilltop north-west of Tin Town) and keep pale things few and broken up; a heap of identical pale slabs reads as cardboard whatever its colour.
- **A far view stands on the road, not on the ground drawn under it.** The East Road crosses a wash on a truss bridge 1.35 to 1.47 km from Radio Hill: the first far picture was taken under the deck, the second inside the truss. Pick the point by the road's own height, level with the land either side, and test that it sees the tell (`roadView` in `tools/scenarios/look-radio-hill.mjs`). Nothing is drawn beyond `tellWithin`, so never pass it.
- **Unlit things glow at night.** Lines, the smoke column and any shader without the scene's light keep their day colour when the land goes dark: wires showed white and the smoke a bright streak. Take them down by hand at night. A glow's level must be the same uniform object the update sets, or it never lights.
- **Every wire ends at something.** A dipole drawn to a point in the air read as a broken line from the mast's foot. End each wire at an insulator, a rope and a stake.
- **In software drawing the dusk blends one frame at a time,** so blend it with the camera on a near view and only then turn to the long one, or the wait runs out.
- **A lamp's glow that only adds light goes white at dusk** (OPEN-LOOK-RADIO-HILL-2, 26 November 2026). Hetty's red lamp, added to a pink dusk sky, read 255, 255, 206: the red channel was already near full and the tone mapping turns a strong red to white. Let the lamp's core and haze cover what is behind them a little (blending one and one-minus-alpha, the colour given already weighed by how much it covers) and keep the core below the brightness where the tone mapping whitens it. A warm glow inside a lit doorway only adds light: covering the doorway made a grey hole in it.
- **A mast at 1.4 km is a line one pixel wide,** and a real flag on it is half a pixel. Draw the far outline as upright strokes at least 1.5 pixels wide, one for each 2.5 m of mast so the land in front hides each length on its own, seen only beyond about 320 m where the lattice itself has thinned; and a coloured patch for the rag at least 4 pixels across. The strokes, the rag and the lamps share one draw of points with that blending, which can both darken and add. Draw the lamp last in that draw, or the outline covers it.
- **Take one picture close to a light that falls on the ground.** From 50 m at eye height the pool of light in front of a door is a line; the change only showed from 10 m (`camp-night-door`).
- **Wear written for scrap turns timber orange and dark rock pale** (OPEN-LOOK-DACE, 26 November 2026). `createScrapWear` paints rust on whatever wears it, and its dust colour is several times brighter than a dark stone: boards came out orange, and basalt at a quarter of the land's rock colour still read as pale tan. Timber, stone, concrete and rubber wear a grain of their own (`createGrainWear` in `src/world/open/looks/dace-look-kit.js`: grain, darker blotches, bleached tops, dust at a third). Keep rust for iron and tin.
- **A thing stood at a rule's spot can stand in its neighbour.** The pickup's spot is 2.75 m in front of the forge shed and the key's spot is a hand's width off the shed's wall. A five-metre truck centred on its spot stood with its tail inside the shed, and a key drawn on a post of its own stood against the wall like a grave marker. Take the first picture where the story puts the thing, with its neighbours, before choosing where its origin lies and what it hangs on.
- **A light on the ground that writes no depth is painted over by the road.** The pickup's lamp light was missing from five sets of pictures. First it was outside the frame: it lies seven metres ahead of the truck and the camera stood five metres off looking at the grille. Then neither more strength, nor another blending, nor lifting it showed it, while the scenario's count of draws said that it was drawn. What found it was the same mesh in plain opaque red, which showed whole: the roads and the marks of the land are drawn late (`renderOrder` 1 in `src/world/scablands-draw.js`), after a sheet that writes no depth, and so over it. Give a doubtful mark a plain opaque colour before changing anything else, and give any light or mark laid on the land a `renderOrder` above 1. The light is a sheet 22 cm up that follows the ground (`groundAt` in `dace-pickup-look.js`) and multiplies what lies behind it, so that it reads at dusk and does not vanish in the land's hard light.
- **Sheets taken off a roof one by one read as a checkerboard** from inside, dark squares against the sky. A storm takes them in patches: pick the gaps from a smooth noise over the roof (the Hangar).
- **A cloth in the truck's own shade reads near black.** The same canvas was pale sand as a heap in the sun and a dark blob hanging on the shaded side. Give a cloth a paler hem, seams and a patch, so that it has a shape in either light.
- **A small thing is found from a car by its outline against the sky** (OPEN-LOOK-DACE round 2). A stack of stones 1.3 m high, pale, lay under the skyline from a seat 1.2 m up and could not be found at 40 m. At 2 m its top stands above the skyline; make that top dark, since the sky is pale, and give it a shape that nothing natural has (a slab across).
- **The look stand stands a thing on the surface the rules read; the open land's own views stand it on the ground as drawn.** A row of the stand that sets `onDrawnGround` is lifted by the difference, as the game's `positionAt` does, so that a mark laid a few centimetres up is judged as the player will see it.

### Trains, and white things (WW-ART-MULE, 27 November 2026)

- **A white subject is photographed on a blue backdrop and cut out by colour.** Ask for one flat saturated blue with no floor line or shadow, and say that nothing on the object is blue. Everything not blue is the subject, so gaps walled in by the subject (between wheels, through a lattice) open with no seed points. `keyed` and `Shot` in `tools/blender/scablands-mule.py` do this and hand the mask to `hull_model.py` in place of its pale-sky flood. Fifteen photographs needed no mask repair.
- **Read the game's own distances before asking for photographs.** The image generator draws a wagon about three and a half times as long as it is high whatever length the prompt names. The job code stood the tank wagons' roof plates 20 m apart, and the photographed wagon scaled to 12 m. A tank is turned and its frame traced in two lengths of the same photograph, joined on a riveted band (`tank_wagon`), which costs a second truss and valve and no stretching.
- **The kit gives every face its own points, and the exported file carries each of them.** Joining points that share a place before export (`weld`) took the Mule from 2.97 MB to 1.96 MB with no change to the picture. A traced plate's edge costs four points a corner in `slab`; `plate` shares them and suits anything about 5 cm thick.
- **A dark box under a wagon, down to the axles, reads as a block the wagon sits on.** Stop it at the solebar's lower edge, so that daylight, axles and rods show between the wheels as in the photograph. An engine with skirts keeps its box low.
- **A door hung at a carved body's widest measure floats off the wall.** A roof's eaves are wider than the walls. Read the wall's width from the end photograph's mask at wall height.
- **A wheel half hidden by a skirt or a bogie frame wears its lower half twice** (`lower_only` in `wheelset`), or its upper half shows the frame's picture through every gap.
- **Bars are traced with the dark between them left open,** taking the dark pixels inside the window out of the door's mask, and the wagon is given a dark wall down its middle: with a barred door on each side, daylight otherwise shows straight through.
- **A chimney or dome carved with a body comes out as a ridge as wide as the end photograph shows it.** Cut it from the side mask for the carving and turn it (`turned`), its crown wearing the overhead photograph.
- **Codex's image tool still answers on an older model when its configured one is refused:** `codex exec -m gpt-6.1-sol` made thirteen pictures in about ten minutes on 26 November, with the first picture of each object given to its later views.

### Bolt-ons and laid strips (COMBAT-ROOF-BOW-LOOK, 26 November 2026)

- **A long straight piece set at its middle's height floats over rolling land and sinks into it.** Each town road was one flat
  box: the road from the Dome's gate stood 1.9 m over the land, and from a truck's hood its unlit underside filled the top of
  the view as a near-black slab. Lay a road or strip as a ribbon on the drawn ground (`createStripRoadsDraw` in
  `src/world/scablands-draw.js`), and check the middles of its triangles against `nearGroundHeightAt`, not only its corners.
- **Ribbons that meet end to end show a hard edge** where one's square end crosses the other. Run each ribbon on past its ends
  and fade it there (a `color` of four numbers); whole at the meeting point, so a crossing is never bare.
- **One bolt-on for every car is seated from the car's own skin,** not from its socket: the socket stands at the model's
  bounding height, which on a car with a tall wing is 0.3 m over the roof. Read the roof from the model's triangles
  (`roofSkin` in `src/combat-roof-bow.js`) and keep only faces that face up: a steep panel seen from above is a sliver whose
  heights run its full height, and a one-sided lining turned down is not drawn from above. Both held a foot 0.26 m in the air.
  Check each foot with a ray that ignores the bolt-on itself (`tools/test-vehicle-sockets.mjs`).
- **The point of a roof weapon decides where it can stand.** A bolt reaching 0.36 m past the prod pushed the whole bow back off
  a short roof onto the engine cover. Keep what sticks forward short, and let the butt overhang the back instead.

### Moments (a thing that happens, not a thing that stands)

- **A drawn moment that no player sees.** Hot Delivery's hand-over and the
  forge taking the fire played behind the results screen, which comes up within
  a second of the car stopping (found by hand, 16 November 2026). Before drawing
  a moment, take pictures in the real game at that moment and for the seconds
  after it, with the game's own camera and every screen the game puts up. Three
  things must hold: the camera faces it, no screen covers it, and the game waits
  for it. Where the game does not wait, the cure is a rule (a timed hold in the
  job) and a camera, built by Codex, and it comes before the drawing.
- **A moment keeps one clock.** The drawing's timing is set in seconds after
  the event that starts it (`FORGE.times` in `src/world/forge-look.js`), never
  by how far something has to travel, so that the job's rule and its sound can
  be timed to the same numbers and a test can hold the two equal.
- **A blow seen end on from the driver's seat.** The Bowl hammer's arm points straight away from the chase camera when
  it lands, so its hit vanished in the game's own pictures (BOWL-WEAPONS-LOOK, 20 November 2026). Check each weapon's
  hit from the driver's seat; where the part is end on, the hit is carried by something facing the viewer (a flash,
  sparks, grit thrown up over the struck truck). The same check moved the saw up and threw its sparks back over the
  bonnet, where the driver sees them.
- **Under or behind the chase camera.** A box dragged 5 m behind the truck sits under the chase camera, so sparks
  thrown back off it never entered the picture (BOWL-LOOK-FIX, 21 November 2026). Put a moment's effect where the
  camera looks: at the hitch, over the cab, or thrown high enough to rise into view. Close up, cap how much of the
  picture an additive card may cover (`nearCap` in `src/bowl/bowl-fx.js`), or a fire floods the screen.
- **A frozen rule is still drawn.** The weapon rules stop a wrecked truck's clock wherever it was, so a drawing that
  reads the weapon's phase kept a wreck breathing fire. A drawing gates on the wreck and on the event still running.
- **Another mode's fittings on a new mode's vehicles.** The arena draws its armour kits, spiked bumper and roof
  crossbow on every fighting truck, and they buried the Bowl rivals' own bolt-ons. Before judging a vehicle's look,
  take a picture of it with the new drawing off and name every part that is still there.

### Animals (WILD-ART-WASTE, 19 November 2026)

- **Judge an animal beside a photograph of the real one, at the player's distance.** `tools/blender/wildlife/waste_sheet.py` puts a public-domain photograph beside close views of the exported GLB and beside 1:1 crops of a 1080p frame from a car at 10 and 30 m and from the town's camera 60 m up. Fetch the photographs with `waste_references.py` (Wikimedia Commons, public domain or CC0 only); they stay in the art library.
- **A dark coat comes out grey.** The default material's shine lays a grey veil over black fur and feathers, in Blender and in the game. Give dark animals roughness 1 and a low specular (`MATTE` in `adapt.py`; `roughness` and `specular` in a bird's table or in `original.finish`).
- **A review scene that is too bright washes every coat out.** In Cycles a sun of strength S lights a white surface to S divided by pi. A sun of 2.7 with a weak sky exposes white at about 1; a sun of 4 made a black goat look grey for two drafts.
- **Dust over the whole animal flattens it.** Keep dust to the legs and belly, a few per cent above.
- **A tail or crest made of one sheet reads as a paddle.** Fan it from separate feather blades (the chicken).
- **A sprawled limb built from two straight tubes with a pad reads as a peg from above.** Run one bent tube from inside the body through the elbow to the wrist, and give the foot separate toes (the desert monitor).
- **Paint a pattern no finer than the mesh.** Coats are painted on vertices and then baked, so spots and narrow bands need vertices at their size: the monitor's body went from 14 to 18 sides and 12 mm steps before its bands could break up.
- **Markings finer than the mesh are drawn when the coat is baked** (WILD-ART-DESERT, 19 November 2026). Streaks, flecks and spots cannot be painted on vertices inside the triangle budget: the roadrunner's streaks came out as ribs, then as blotches. A recipe now says where the marks go and in what colour (`a.mark = function(point) -> (r, g, b, strength)` before a part; `P['marks']` in a bird's table), `MARKS` in `adapt.py` gives the pattern in the animal's own metres (a stretched noise for streaks and flecks, `spots` for round spots), and `common.finish_coat` draws it at the map's resolution.
- **A mark that must have a clean edge on a wing is a sheet of its own.** A wing has four rows of vertices from front to back, so a patch painted on it blurs into a band. The condor's underwing triangles and wing bars are thin white sheets a centimetre clear of the wing, weighted to the same bones.
- **The underside of a flying bird is lit only by the ground,** in the sheet and in the game, so white there shows as tan. Make an underwing mark larger and whiter than the photograph's, and judge it against the black beside it, not against white.
- **Bands painted by a vertex's own x come out as a checker where the spine climbs,** because the rings of a loft lean with it. Band by where the vertex's ring crosses the spine (`along` in `collared-lizard.py`).
- **Horns centred behind the head leave a ring of daylight.** A ram's curl is centred on the cheek, so the face fills it (the desert bighorn's first horns were a doughnut on the nape).
- **Breathing on a bone that carries the legs lifts the feet.** Scaling a bone scales everything under it: the jackrabbit's feet rose and sank 4 mm. Breathe on a bone with no leg beneath it, or not at all.
- **A bound made of joint angles needs the ground put back.** After posing, read the lowest foot bone, allow for the foot's thickness there, and move the root so that it touches (`bound` in `jackrabbit.py`).
- **Two animal cards at once: add to shared files in different places.** Each card puts its rows in its own block, apart from the last card's (in `sources.json`, `adapt.py`, the model table, the test lists), so that the two branches merge without a conflict.
- **Stilt legs, or a tail through the ground, on a standing bird:** in `bird.py` the tail's drop below the hip is about its reach behind the hip times the sine of `tilt`. Work it out before choosing `leg`.
- **A smoothing pass rounds a faceted bird.** `refine` (one subdivision, then back to budget) now reaches birds through the table; the vulture's body and folded wings were flat plates without it.
- **One Blender turn can carry a whole round.** With many sessions sharing two heavy places, build every animal and render every view in one batch, and judge the pictures while the next batch waits.

### City animals (WILD-ART-CITY, 19 November 2026)

- **A colour that changes part of the way down a bird's leg smears along half of it.** `bird.py`'s leg has three rings. Put a sleeve over the part with the other colour (`city_parts.stocking`): a raptor's feathered thigh, a heron's black shank above yellow feet, an owl's white legs.
- **A bar on a folded wing is its own strip.** The folded wing has six rings, too few to carry a painted bar, and the cut back to budget moves what vertices there are. The pigeon's two bars are narrow blades lying just proud of the wing, on the fold bone, so they hide with it in flight (`city_parts.fold_bar`).
- **A tail that forks, or ends in a dark band, is fanned from feathers** (`city_parts.fan`): a fork is the middle feathers shorter, a round tail the outer ones shorter. Give `bird.py`'s own tail a width of a few millimetres so that it hides underneath.
- **The smoothing pass takes a face's rings with it.** `refine` subdivides and then cuts back to budget wherever it likes. The barn owl's face (white dish, tan rim, eyes) is lofted ring by ring so each colour has its own vertices, and the owl is built under 2,000 triangles with no `refine` at all.
- **A heron's folded neck in flight, with one neck bone:** scale the neck bone down evenly and the head bone up by the inverse (`fly_pose` in `little-egret.py`). An even scale brings the head onto the shoulders without squashing it; an uneven one shears the head.
- **A bird of prey on the thin-necked head reads as a dove.** The kite stood as a brown pigeon through five drafts. Use the `merged` head that the golden eagle uses (a big head sunk into the shoulders), add its brow ridges, and fade the head's pale colour into the body within one head radius, because the neck is painted by the head's function. A hooked bill drops further than it reaches forward, so tell the yellow cere from the dark tip by height, not by distance along the bill.
- **One flat brown is not a brown bird.** The kite read as a kite only when its head and whole breast were tawny against dark wings: paint the breast by how far forward a point is as well as how low. Streaks narrower than the mesh average to nothing; `ROUGH_FUR` in `adapt.py` lays a coarse grain along the body that reads as streaking close up.
- **The bake's grain darkens a coat by about a quarter.** White birds painted at 0.74 and then at 0.84 came out light grey beside their photographs; 0.97 reads as white under the review sun of 2.7 without burning out.
- **A cat from the wolf donor:** a cat is deeper in the body and shorter in the leg. Bones cannot be shortened, so raise the back and let the belly down in the donor's frame and then scale the whole animal to a cat's height. Thin the legs only a little, enlarge the skull by a third, shorten the muzzle to a third, and set the ears forward on top of the skull.
- **An original quadruped's legs read as flat boards when they taper fast and are paler than the body.** Keep them nearly even in width and darker than the coat above (the raccoon); leave the claws off a foot that is seen from 10 m.
- **A photograph cropped close to the sheet cell's shape is cropped again to fit it.** Keep reference crops nearly square, so they are padded instead and nothing of the animal is cut off.
- **A species that the course tables already name goes onto its courses the moment it has a model.** The city animals have rows on Harbour Lights and the city courses, so their models are listed in `HELD_FROM_COURSES` in `src/wildlife-models.js` until a placement card lets each one go.

### Sheets

- **Sheets show other buildings.** A family file holds every building at its own origin, so a building's review views must hide the others, or a stray block appears (the big wheel, 7 November).
- **Triangles run away in traces and rings.** A traced seat at a fine tolerance cost 4,880 triangles and a ring of 128 by 12 steps 6,144 (the big wheel). Count each piece's triangles before submitting, and coarsen what the mayor's camera cannot see.
- **Check open drift meshes before UV export.** In Blender 4.5.13, the joined two-sided ship sand bank had loops pointing beyond its vertex list. `mesh.validate()` repaired the mesh before export; use a coarser source grid for this broad surface and validate meshes before assigning UVs.

- **A rule that hurts and draws nothing.** The furnace's cinders took Big Bess's health under a caption and a sound, with nothing in the air and nothing on her, and the machine's death drew nothing either (the field battle, 12 November). Every event that costs health, and every death, needs something drawn. Find these by taking pictures from a camera placed beside the machines while the fight runs; the game's own camera sits on the player's car, and a parked car's pictures prove nothing.
- **Points drawn too small to see.** A point's size is given in pixels of the drawn picture, not in metres: lumps sized at 23 pixels at 30 m showed as dots in the game's pictures. Size a drawn point for the far end of the distance it will be seen from, and look at it in a picture from there.

- **Pictures taken by the clock miss their subject.** A hand play on a busy laptop runs slower than the clock, and on a
  free one faster: the same script photographed a dozer with a full blade in one round and an empty one in the next,
  and a strip of fill and then bare ground. Take each picture by what the game says (the load carried, where the fill
  lies), read from the page, not after a count of seconds. (MACHINE-ROADS round 2, 19 November 2026.)
- **`tools/test-blender-output.mjs` starts Blender for every recipe.** It is a heavy job and takes a turn
  (`docs/FACTORY.md` section 8), and it is not a quick look at one file. To check one model file's own claims, read the
  file's node list, positions and bounds with a few lines of Node. (19 November 2026.)
- A scale figure in rust and leather vanishes against a rusty vehicle. Stand it clear, against the grey ground.
- Eleven pictures of one vehicle came back from one `codex exec` job in about twelve minutes, alike from every side,
  because the brief gave the first picture to every later call as its reference and named what must not be on the
  vehicle (plough, mirrors, stack) so that those could be photographed alone.
- Cameras aimed at each piece's own bounds. A blank frame means the camera is wrong.
- A camera can point at its target and still roll a reverse three-quarter view. Set the camera's screen-up vector from a world-up direction, then check both sides in the sheet. (Town Fun coaster, 8 November.)
- The whole subject in every frame, on plain mid-grey ground, in one even light,
  with labels off the pictures and no white gaps.
- Photo beside model at the same camera, three-quarter views, the mayor's view
  and the view from the road. A close-up of wheels and lamps on any vehicle.
- A sheet you can see is empty or cropped is not a round.
- A recipe that holds a whole family builds one piece into a trial file for its sheet (`--only` in `town-works.py`), so that a trial never overwrites the file the game loads, and renders several sheets in one Blender job (`--render sawmill:3,heaps:1`), which takes one heavy-job turn and not five.
- Review views of one part of a building (a shed inside its yard, a tree behind a wall) show only that part: name the parts to show, or the walls stand in the way.

### A wet green place, built with no new photographs (WW-ART-FAR, 26 November 2026)

- **A family can be built when nobody can generate photographs.** Codex's picture tool was out of quota. The Far Side's kit (`tools/blender/far-side.py`) wears photographs the repository already holds (the dam's stone, the town's timber and canvas, the borer's and the handcart's photo sets, the walkers, the goat's coat) and pictures drawn in the recipe (slate, moss, grass, spruce boughs, wool, bark). Look through both `textures` folders before deciding that a card needs new pictures.
- **A cut-out of fine strokes vanishes at distance.** Spruce boughs drawn needle by needle average below the cut-off once the card is small on the screen, and the tree becomes a bare pole. Close the picture up wherever it is dense and keep only its edge ragged (`thicken` in `far-side.py`), and set the cut-off at about 0.4.
- **A cut-out the importer leaves blended is missing from Blender's mist pass,** and takes the sky's mist: the same bare poles, for a different reason. In a review scene with mist, set every cut-out material to `DITHERED` after import.
- **Dye paint, not rust, by brightness and strength of colour.** The borer's yellow and its rust are 7 degrees of hue apart, too close to separate; the paint is brighter and more saturated. PRUDENCE's green came from a test on saturation and value with only a loose test on hue.
- **Dye a person's clothes below the neck row and keep skin by a colour test.** That gave Maud and Wick oilskins from the town walkers' photo sets without the green face of a whole-picture recolour. A hat built in code sits on the brow: 6 cm below the top of the head it covered the eyes.
- **The walker rig has no photo for a person's left.** Faces there took the overhead photo and smeared. Add a fifth view that reads the profile photo turned over (`left` in `build_person`), and keep it out of the carve's tests. The walkers face +Z.
- **A game animal's skin is split along every seam of its picture.** Moved along its normals as it comes from the file, a fleece tears into strips. Join the vertices first (`take_animal`), then reshape; horns and a beard are then separate pieces that can be found and taken off.
- **A wall that leans in 2 cm for each metre is a toy.** It reads as a tent at mill height. Old rubble walls lean well under 1 cm a metre; corner stones standing 4 cm proud do more for the outline.
- **Water and wet slate at low roughness mirror the review sky and come out white.** Judge colour at a roughness of 0.3 or more and leave the wet shine to the game's rain.
- **A part far longer than 15 m cannot be judged whole from 15 m.** Frame the review picture on the stretch a player looks at, and fit the lens to the part's own points, not to its bounding box, or the subject is small in the frame again.

### Keeping the work

- A job that loses its task after its memory is compacted reads
  `.qa-dist/YOUR-TASK.md` and carries on. In practice it often does not:
  twice on 7 November a ships job reread only `AGENTS.md` after compaction
  and stopped to ask. Size each job so it finishes before compaction (one or
  two numbered points, about 55,000 log lines), commit after every point, and
  resume a stopped job with a "where you are" note at the top of its brief.
- Never edit a script a running queue is reading.
- Never stop processes by matching a folder name: name each job's own process.
- **Photos embedded at full size break a family's size limit.** Twenty-one pieces with about fifty photos came to over 9 MB. Shrink each photo to what its surface needs just before export, after every mask is made (`PHOTO_LIMITS` in `town-works.py`): the family is 6 MB.
- **A helper named like an older piece's variable is overwritten.** When a recipe grows from one building to a family, a new helper called `log` was replaced by the kiln's `log = ...` and failed as "object is not callable". Give helpers names no piece would use for a thing.
- `node tools/test-blender-output.mjs` is a heavy job: it starts Blender builds of truck candidates and runs for more than ten minutes on a busy laptop. Take a turn for it. To check one family while working, run that family's check on its own.
- When Codex's configured model is refused, `codex exec -m <another model>` still reaches its image tool; a brief of one object per numbered item, one view per picture, returned 32 usable photos in about ten minutes.

- **Four-view generator sheets** (Kyle, 7 November). A prompt for multiple orthographic views can return a perspective collage or incompatible panel geometry, which cannot serve as measured photo references. Generate one dead-on orthographic view per image call; inspect it and regenerate any grid, extra view or perspective result.

- **Isolated render sets can inherit hidden objects.** When rendering several buildings from one imported family scene, visibility flags left by a previous building can hide every piece of the next one and produce an empty grey view. Before each isolated render, explicitly show the selected root's descendants, hide other buildings, and show the review ground.
- **A separately modeled moving assembly is duplicated in a tower trace.** Remove its measured silhouette from each static photo mask before 	race; otherwise dish faces and drive housings become fixed flat plates beside the real moving part. Check side and end masks against their photos.
- **Low-chroma greenhouse glass can match a pale grey studio background and be carved out as a hole.** Compare the photo and mask at the same grid coordinates. Lower the `grey` chroma threshold enough to keep the pane in the silhouette while keeping the photo edge background outside; then check the roof mask and bleed in the render.
- **Low-chroma silver steel can be flooded as sky in the top mask.** A pale studio and a roof of galvanized panels can make connected silver patches disappear from a top carve. The shopfront roof needed `grey: 5`; check that its top mask stays whole and all four silhouettes still match (7 November).
- **Bevel modifiers can hide real triangle growth.** Count the evaluated meshes or read the exported GLB; raw cube faces undercount rounded parts. The shop sign bevels added 192 triangles per shop after export (7 November).

- **Photo-mapped surfaces need the photo material assigned at export.** A surface can have measured UVs and still render as a flat colour if its shader is replaced after carving. Keep the source image on the exported material, then tune each copy's roughness for the intended state (TOWN-ART-PLANTS, 7 November).
- **Lettering that grows from its origin lands off its sign.** A Blender text object starts at its origin and grows to the right (left-aligned). Turn it half way round to face the other side and it grows the other way, so three of five shop words in the mall stood 6 m from their boards and one hung outside the wall (SCABLANDS-LAND round 3, 12 November). Set `align_x="CENTER"` and put the origin on the sign's middle, then read the exported GLB's lettering and sign boxes against each other.

- **Timed flame needs contact throughout the burst.** The weapon normally reports a world object once per burst. A four-second burn rule then receives only one frame of heat. Slow Ride's timber blocks report each touching frame behind `step.gasLoad`; Hot Delivery keeps its immediate burn. Check a real burst against the block as well as injected contact facts (EVERBURN-REMAKE, 17 November).
