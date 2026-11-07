# The art line: what works and what to watch for

Every art job reads this before it starts. Whoever finds a new kind of fault
(Kyle, Claude or a job) adds it here in the same commit as the fix, so that no
job has to learn it twice. The kits' own instructions are in
[ASSET_PIPELINE.md](ASSET_PIPELINE.md).

## The method

Six rounds per card is the limit (Kyle, 6 November 2026), counted per building or
vehicle on a card that holds several. If two rounds in a row show no improvement,
stop adjusting and change the method.

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
4. **Choose the kit by the shape:**

   | Subject | Kit | Worked example |
   | --- | --- | --- |
   | Vehicles, buildings, anything that curves every way | **`carve_object` in `photo_carve.py`: fill in a table, write no carving code** | Dot's Diner in `town-outposts.py`; the table at the top of `photo_carve.py` |
   | People, and anything `carve_object` cannot reach | `hull_model.py` directly | `town-walkers.py`, `rattler-photo.py` |
   | Lattices, booms, masts, anything with open holes | `trace` and `slab` in `photo_model.py` | the tow rig's boom in `town-trucks-1.py` |
   | Plate-work, planks, drums, a steam engine | `photo_model.py` flat parts and lathes | `rail-trains.py` |
   | Wheels, lamps, reels, cannon | `tyre`, `headlamp` and `lathe` | `town-trucks-1.py` |

5. **One piece first, then the family.** A job with a long list adjusts old
   recipes and fails. A job with few pieces and an example passes. Jobs asked to
   copy carving code kept going back to shapes made by eye, so the code is one
   call now: if you find yourself writing boxes, stop and fill in the table.
6. **Moving parts are their own pieces,** with their origin on their true pivot.
7. **Render from the exported model,** imported into an empty scene, beside the
   photo at the same camera, in flat light with the Standard view transform.
8. **Look at it yourself before you submit.** Then commit, including a poor
   result with honest scores. Never delete work because it falls short: Claude
   judges. Commit after every piece.

## What to watch for

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
- **A view label can be ignored.** A separate prompt for a side view may still
  return the front elevation. Check the projected silhouette and depth against
  the named camera before tracing; regenerate until the camera is correct.
- **Pale paint eaten by the background match.** Silver or white paint can match a wide colour test, and it comes out as flat blotches (the tanker's tank). Lower `bleed_tolerance`. White subjects need photos on a darker ground.
- **A photo lying sideways.** Say so in the table with `'along': 'x'`. If only part of the object comes out, a top photo's direction is the first thing to check.
- **Top-view front and rear pixel order follows `forward`.** With `forward: -1`, the top view's front pixel is before its rear pixel; with `forward: 1`, it is after. Reversing them can leave only a thin sliver where the top mask overlaps the elevations. Print the carved bounds and check the mask overlap before trusting the export.
- **Whole-picture recolouring** dyes faces and boots too (a green face, Kyle's
  people). Generate a real photo set for a new colour.

### Vehicles

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

### People

- **Legs shifted out from the hips, wide stance** (Kyle, 6 November). A leg pivot's
  offset was counted twice. Check each foot's world position against the photo.
- **Four legs** (Kyle, 6 November). A coat's sides kept below the hip read as extra
  legs. A coat is one closed skirt.
- **Hats that float, or shards behind a head:** photos that do not show the same
  person, or a part not joined. Use `largest_part` and check all views.

### Placement and export

- **An empty render sheet or a tiny prop:** an exported glTF is Y-up, but a
  Blender render scene is Z-up. Convert camera positions and targets with the
  same game-to-Blender transform as the model before judging framing; inspect
  one whole-object shot before assembling the sheet. (WW-ART-SEA, 7 November.)
- **Roof pieces float** when placed at the table's `height`, which includes the photo's roof kit. Read the carved body's own surface under each piece (the Vane escort's beacons, 7 November).
- **A piece built from raw points stands on end** when glTF points (Y up) go straight into Blender mesh data (Z up). Convert each point (x, y, z) to (x, -z, y) (the crusher's belt).
- **A trace takes in whatever lies in its box.** A leg box drawn where the photo has gravel made a false leg. Check each traced part against the photo before keeping it.

- **Double-counted positions.** Set a child's position from its true world point,
  as `attach` does. Subtracting a parent's position in a chain doubles it.
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
- **Which way is forward.** A town object's front is -Z; a car's is +Z. Check one
  box before modelling. A model that lies on its side, or a side view running
  backwards, is this.
- **Flat colour where a picture should be:** lost picture coordinates. Every
  layer is named `UVMap`, and each primitive has only `TEXCOORD_0`, with a range.
- **Text reads backwards** on a far side, whose coordinates run the other way.
  A sign is its own `slab`.
- `metallicFactor` at most 0.3, since nothing is there to reflect.

### Sheets

- **Sheets show other buildings.** A family file holds every building at its own origin, so a building's review views must hide the others, or a stray block appears (the big wheel, 7 November).
- **Triangles run away in traces and rings.** A traced seat at a fine tolerance cost 4,880 triangles and a ring of 128 by 12 steps 6,144 (the big wheel). Count each piece's triangles before submitting, and coarsen what the mayor's camera cannot see.

- Cameras aimed at each piece's own bounds. A blank frame means the camera is wrong.
- The whole subject in every frame, on plain mid-grey ground, in one even light,
  with labels off the pictures and no white gaps.
- Photo beside model at the same camera, three-quarter views, the mayor's view
  and the view from the road. A close-up of wheels and lamps on any vehicle.
- A sheet you can see is empty or cropped is not a round.

### Keeping the work

- A job that loses its task after its memory is compacted reads
  `.qa-dist/YOUR-TASK.md` and carries on. In practice it often does not:
  twice on 7 November a ships job reread only `AGENTS.md` after compaction
  and stopped to ask. Size each job so it finishes before compaction (one or
  two numbered points, about 55,000 log lines), commit after every point, and
  resume a stopped job with a "where you are" note at the top of its brief.
- Never edit a script a running queue is reading.
- Never stop processes by matching a folder name: name each job's own process.

- **Four-view generator sheets** (Kyle, 7 November). A prompt for multiple orthographic views can return a perspective collage or incompatible panel geometry, which cannot serve as measured photo references. Generate one dead-on orthographic view per image call; inspect it and regenerate any grid, extra view or perspective result.

- **Isolated render sets can inherit hidden objects.** When rendering several buildings from one imported family scene, visibility flags left by a previous building can hide every piece of the next one and produce an empty grey view. Before each isolated render, explicitly show the selected root's descendants, hide other buildings, and show the review ground.
- **A separately modeled moving assembly is duplicated in a tower trace.** Remove its measured silhouette from each static photo mask before 	race; otherwise dish faces and drive housings become fixed flat plates beside the real moving part. Check side and end masks against their photos.
- **Low-chroma greenhouse glass can match a pale grey studio background and be carved out as a hole.** Compare the photo and mask at the same grid coordinates. Lower the `grey` chroma threshold enough to keep the pane in the silhouette while keeping the photo edge background outside; then check the roof mask and bleed in the render.
- **Low-chroma silver steel can be flooded as sky in the top mask.** A pale studio and a roof of galvanized panels can make connected silver patches disappear from a top carve. The shopfront roof needed `grey: 5`; check that its top mask stays whole and all four silhouettes still match (7 November).
- **Bevel modifiers can hide real triangle growth.** Count the evaluated meshes or read the exported GLB; raw cube faces undercount rounded parts. The shop sign bevels added 192 triangles per shop after export (7 November).
