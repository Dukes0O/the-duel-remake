# Dry Dam texture credits

The concrete, rust and galvanized-steel pictures below are original
Codex ImageGen outputs created on 2026-11-05. They are 512 x 512 compressed
JPEGs used as repeating material pictures. `dam-face-projection.jpg` is a
2048 x 750 baked crop from
the original photographic dam reference, kept outside the repository at
`~/.codex/generated_images/wasteland-dam-reference.png`. The Blender recipe
embeds the JPEGs in `dam.glb`; these source pictures stay beside the model so
it can be rebuilt. No licensed source art is used.

## `dam-concrete.jpg`

Use: 2 m repeating colour texture for the dam's cracked aggregate concrete.

Prompt (Codex ImageGen, 2026-11-05):

> Use case: photorealistic-natural. Asset type: seamless repeating albedo texture for a 3D dam model. Primary request: a square, tileable close photograph of weathered grey poured concrete from an old hydroelectric dam. Subject: cool neutral-grey concrete with fine aggregate, subtle horizontal lift-joint traces, sparse hairline cracks and dark mineral damp stains; photographic detail, realistic scale for a 2 metre repeat. Style/medium: sharp macro surface photography. Composition: flat orthographic surface filling the square, seamless on all four edges, no perspective. Lighting/mood: bright even overcast daylight, no cast shadows or glare. Materials/textures: specific concrete grain and worn cement, controlled contrast, no blur or noise-only pattern. Constraints: no writing, no border, no objects, no landscape, no recognizable large crack, no orange rust, no sandy color, no illustration, no watermark.

## `dam-face-projection.jpg`

Use: a baked photo projection for the dam's broad front face. The source is
the original Codex ImageGen photographic reference supplied with WW-ART-DAM's
round 3 review. The recipe crops pixels (112, 104) to (1605, 651), maps them to
the front-face UVs and saves a 2048 x 750 JPEG. The source photo itself is not
stored in the repository.

## `dam-rust.jpg`

Use: 2 m repeating colour texture for rusted plates, pipes and old machinery.

Prompt:

> Photographic square close-up albedo of an old dam gate made from heavy steel plate, a physically real surface texture for a 3D model. Deep charcoal and iron-grey steel with dark brown-black layered oxidation, patches of dull original blue-grey paint chipped to metal, visible pitted rust blooms and fine long abrasion scratches, old weld bead edge glimpsed at one side but no large object silhouette. Muted brown oxide, no saturated orange. Sharp fine and medium detail, even flat overcast light with no cast shadows or glare, orthographic close macro photograph, uniform scale, suitable for tiling over broad plates. No noise-only image, no text, no logos, no border, no illustration.

## `dam-steel.jpg`

Use: 2 m repeating colour texture for galvanized gate ribs, rails and plated fittings.

Prompt:

> Photographic square close-up color texture of old galvanized steel plates from a huge hydro dam mechanism. Cool charcoal grey plate with a little faded blue-grey paint, dull zinc bloom, fine pebbled metal crystals, rubbed bright edges, long abrasion, small dark rivet heads flush to the surface and subtle brown rust beginning around a few seams. Photographed flat-on under even neutral overcast daylight, no shadows or shiny glare. Sharp specific galvanized and painted metal grain, medium and fine surface detail at approximately 2 metre tile scale, uniform surface useful for tiling on broad steel rails. No text, no logos, no tools, no illustration, no orange wash.

## Round 6 photographs

`dam-gatehouse-stone.jpg`, `dam-salt-wall-photo.jpg`, and `dam-wet-silt.jpg`:
original Codex ImageGen material pictures created 2026-11-05, then downsampled
and JPEG-compressed for the dam recipe. No external source art or licensed
material is used. The generated full-size source images remain in Codex's
generated-images folder; the checked-in files are the recipe's compressed
copies.

### `dam-gatehouse-stone.jpg`

Use: repeating true-scale stone surface on the isolated gatehouse.

Prompt: Square close surface photograph of weathered grey-brown coursed stone
blocks, irregular hand-cut blocks about 25 to 40 cm tall, deeply recessed dark
mortar joints, chipped corners, salt whitening and subtle damp stains. Sharp
photographic detail, flat-on orthographic, even diffuse daylight, seamless
tile edges. No concrete, bricks, scene, tools, writing, illustration, or watermark.

### `dam-salt-wall-photo.jpg`

Use: one non-repeating 2:1 photograph mapped across the filling shed's back wall.

Prompt: Straight-on close photograph of wet grey concrete, thick plainly white
chalky salt crust and efflorescence, sharply defined charcoal water streaks,
damp minerals and crystal growth. Four large corroded iron pipes pass through
the wall in a horizontal row, with circular mouths and dark wet collars. Bright
diffuse overcast light; the white salt is the brightest surface. Single unique
wall, no repeat, no labels or watermark.

### `dam-wet-silt.jpg`

Use: repeating true-scale albedo on the irregular mound burying the old gear.

Prompt: Square macro photograph of dark charcoal-brown wet reservoir clay, soft
irregular clods 2 to 15 cm across, small grit, and a slight moist sheen in the
hollows. Crisp photographic detail, diffuse neutral overcast light, seamless
edges. No objects, gear, pool, scene, text, or watermark.

## Ships in the Sand photo projections

The following three crops are original Codex ImageGen photographs made on
2026-11-05. They are cropped and JPEG-compressed from the generated reference
photographs. The model embeds them from this folder so its Blender recipe can
rebuild the projection materials. No third-party source art is used.

### `ships-hull-photo.jpg`

Use: 2048 x 384 front-side photo projection on the hulls of the three
maintained stranded freighters.

Prompt: Photorealistic daylight modeling reference: a huge 70-metre rusted
coastal freighter aground on a dry salt sea bed, low car-height three-quarter
side view. Whole vessel fills frame: long narrow hull with true curved bow and
stern, deep keel, visible propeller, three deck levels with ladders, aft chart
room, large faded dark blue-grey paint patches over dark brown-black rust,
distinct repair plates, trailing anchor chain. Old but maintained. Tiny
ordinary car for scale, dusty mid-tone ground, bright overcast light, natural
photographic proportions, no water, no broken hull, no illustration, no text,
no watermark.

### `lighthouse-stone-photo.jpg`

Use: 512 x 1024 front-side photo projection on the stone lighthouse tower.

Prompt: Photorealistic daylight modeling reference for a full-scale weathered
coastal lighthouse standing alone on a dry inland salt flat. Old pale
grey-brown stone tower about 28 metres tall with tapered round masonry, three
distinct narrow landings and exterior windows, a working lantern room with a
warm lit lamp, small swept stone step and maintained dark wooden door. Broad
realistic proportions, salt stains, repaired mortar, crisp detail, low
car-height three-quarter view from 35 metres, the complete lighthouse fills
most of the frame. Bright even overcast daylight, mid-tone ground, no sea, no
people, no text, no illustration, no toy look.

### `pilot-boat-photo.jpg`

Use: 1536 x 512 front-side photo projection on the pilot boat's hull.

Prompt: Photorealistic daylight modeling reference: an absurdly oversized but
genuine 40-foot coastal pilot boat secured on a heavy road trailer, parked on
a dry desert salt flat. Three-quarter front-side view at car height, entire
boat and trailer fill frame. Real afloatable deep V hull, broad stern, raised
pilot cabin, windows, hand rails, bow cleat, faded off-white paint with a dark
blue-green band, patched and maintained. Trailer has a long steel frame, four
pairs of large dusty road wheels, leaf springs, hitch and safety chains.
Bright even overcast light, realistic human scale, plain mid-tone dusty
ground, no water, no people, no text or labels, no illustration, no toy
appearance.

### `patience-hull-projection.jpg`

Use: hull-only side projection for Patience in WW-ART-SHIPS. The crop uses
rows 160 to 336 of the 2048 x 384 source photo, below the deck line. The
bridge, gear and rails are modeled above it. Derived from the original Codex
ImageGen photo `ships-hull-photo.jpg` above, 2026-11-05. No third-party source
art is used.


## WW-ART-CREW photographs (2026-11-06)

- `ww-gerald-box.jpg`: Codex ImageGen original product photograph of a
  weathered 40 cm wooden animal carrier with photographed ventilation holes.
  Prompt: “A single dead-on, level product photograph of the front of a small
  old wooden animal carrier, 40 centimetres long. Three orderly rows of small
  dark round ventilation holes through weathered faded brown boards. Flat
  overcast daylight, pale background, no perspective, people, text or objects.”
- `ww-ash-hat-side.jpg` and `ww-ash-hat-top.jpg`: Codex ImageGen photograph
  sheet of one worn small felt hat, cropped to the side and overhead views.
  Prompt: “Two dead-on views of the same small battered felt hat: side and
  directly above. Slightly too small, old, dusty, faded charcoal-brown felt,
  narrow drooping brim and shallow dented crown. Plain pale background, flat
  overcast daylight, no people, labels or props.”
- `ww-wren-flag.jpg`: Codex ImageGen original product photograph of a rag flag
  on a thin weathered pole with a small yellow cloth knot. Prompt: “One
  dead-on photograph of a small old rag flag on a thin straight wooden pole,
  faded dusty cloth with a torn edge and a muted yellow knot. Plain pale
  background, flat overcast light, whole object, no perspective, people, text,
  other objects or watermark.”
- `ww-regret-door.jpg`: Codex ImageGen photograph of a detached faded red old
  car door. Prompt: “A side-on weathered sun-faded red compact-car door on a
  plain pale ground, with its window opening empty; chipped red paint, dusty
  dark rust, no logos or other objects.”
- `ww-regret-wheel-photo.jpg`: Codex ImageGen photograph of an old steel car
  wheel, straight-on, with a cracked tyre, rusty rim and dented hubcap, reduced
  to 1024 × 1024. Prompt: “One old steel car wheel, centered and complete,
  face-on: perished dusty black tyre, rusty stamped steel rim, dented faded
  hubcap. Plain pale grey background, bright flat overcast daylight, crisp
  realistic wear. No people, text, logos or extra objects.”
- `ww-dynamite-front.jpg`: Codex ImageGen photograph of a damp dark wooden
  crate with its handwritten `SMALL` label, dead-on, reduced to 1024 px.
  Prompt: “One small old wooden crate, straight-on front view, plain
  rectangular dark damp planks, hand-written pale label with exactly the word
  SMALL. Worn, heavy wood. Full object on pale grey ground in flat overcast
  light, no perspective, people, other items, logos or watermark.”
- `ww-dynamite-top.jpg`: Codex ImageGen photograph of the same crate from
  directly above, lid removed, with paper-wrapped inert bundles in rows.
  Prompt: “One old rectangular wooden storage crate seen directly down, lid
  removed. A real recessed dark wooden floor holds rows of short paper-wrapped
  cylindrical bundles. Full rim, old damp weathered planks, pale grey ground,
  flat bright overcast light, no people or tools.”
- `ww-regret-bonnet.jpg`: Codex ImageGen overhead photograph matched to the
  faded red and wear of `ww-regret-door.jpg`. Prompt: “One detached bonnet
  panel from directly above, camera perpendicular, broad gently curved outline,
  sun-faded dusty muted red paint with chips exposing dark rust and bare steel.
  Full part, plain pale grey ground, bright even overcast light, no car body,
  people, logos or text.”
- `ww-regret-bonnet-rust.jpg`: a 512 × 316 crop from the heavily rusted lower
  edge of `ww-regret-door.jpg`, enlarged for the bonnet underside. It shows
  dark rust across the whole rectangle and is not the bonnet top photo.
- `ww-open-engine-side.jpg`, `ww-open-engine-end.jpg` and
  `ww-open-engine-top.jpg`: Codex ImageGen dead-on photos of one worn inline
  six engine, with its head removed and bores exposed. Prompt set: “One large
  old inline six-cylinder automotive engine, rusty red-brown cast iron, dark
  grease and chipped paint, plain pale grey ground, flat bright overcast light,
  no people or text; side view, pulley end view, and overhead view respectively.
  Same engine and proportions in all three views.”
- `ww-regret-engine-tree.jpg`: Codex ImageGen photograph of one small drought-
  stunted scrub tree, dead-on, with crooked bark and sparse grey-green leaves.
  Prompt: “A single drought-stunted desert tree about 1.2 m tall, narrow crooked
  woody trunk, sparse branches with dusty grey-green leaves, plain pale grey
  background, flat bright overcast daylight, no people or text.”


All three are embedded in `crew-favours.glb` as direct colour pictures; none repeats.

- `ww-gerald-cutout.jpg`: Codex ImageGen, an original desert lizard seen from the side and from directly above, edited onto a flat colour so that its outline can be read by script. Prompt: realistic desert lizard, side and overhead views, the same animal in both. The recipe replaces the flat colour before export, so it never reaches the model.
- `ww-harpoon-photo.jpg`: Codex ImageGen photograph of a complete historic
  whaling harpoon, dead side-on and level on a flat pale background, reduced to
  1700 x 567. Prompt:
  Photographic reference image of one complete historic whaling harpoon, seen
  precisely dead side-on at eye-level with no perspective tilt, arranged
  horizontally across a plain pale grey studio ground. The entire object is in
  frame from the rounded butt of its long straight dark oak pole to the sharp
  point of its forged iron head. Real proportions: overall 2.5 metres long;
  slim wooden shaft, rope binding around the iron socket, heavy pitted dark iron
  socket and shank, one large flat barbed harpoon head with distinct
  backward-pointing barbs. Very old, weathered, dusty, muted dark brown oak,
  deep brown-black pitted iron with subdued rust; realistic fine grain,
  scratches and corrosion. Soft flat overcast daylight, crisp silhouette,
  uniform pure pale neutral background, no cast shadow crossing the object, no
  table, no hands, no text, no labels, no other objects. Wide landscape
  composition, highest available resolution.
- `ww-piano-photo.jpg`: original old upright piano photograph, perspective
  warped to a 1500 x 1300 front view and reduced to 1200 x 1040. Prompt:
  battered upright piano with its
  action exposed, photographed in even neutral daylight.
- `ww-dune-ladder.jpg`, `ww-dune-bedroll.jpg`, `ww-dune-stove.jpg`, `ww-dune-watercan.jpg`: Codex ImageGen, 6 November 2026. Prompts: one old, worn, real object each, dead-on in flat overcast light on a plain background: a hand-made wooden ladder, a rolled canvas bedroll with two straps, a small iron camp stove, a dented water can. Used for `dune-ladder` and `dune-camp`.

## WW-ART-SEA photographs

`sea-magnet-big-timber.jpg` and `sea-magnet-big-prop.jpg` are original
Codex ImageGen product photographs created on 2026-11-07. The first shows a
side-on crib of weathered railway sleepers; the second shows a side-on raking
steel prop with its screw jack. Both were converted from the generated PNGs to
JPEGs for measured `photo_model.py` tracing in `sea-magnet-big.py`. The original
generated PNGs remain in the Codex generated-images folder. No existing source
photo was replaced.

`sea-old-gear.jpg` is an original Codex ImageGen
photographs made 2026-11-06. They are the isolated face and rim panels of one
paired reference image: a seven metre silted, rotten dam gear with open spokes,
flat overcast light and a pale studio ground. The face photo is traced for the
thick slab; the rim photo supplies the hub and rim material reference.

`sea-gear-section.jpg` is an original Codex ImageGen product photograph made
2026-11-06: a clean machined curved iron casting with bolt holes on a pale
studio ground under flat light. The source was scaled in memory and its 15-degree
casting slice is traced into the repeated gear.

`sea-harbour-wall.jpg` is an original Codex ImageGen reference photograph made
2026-11-06: one 40 metre weathered stone sea wall with a pale raised coping
course, iron mooring rings and dried weed, in flat overcast light. Its recipe
blends the first and last two metres in memory for a repeatable face. The top
uses `dam-gatehouse-stone.jpg` at a half-metre tile scale.

`sea-causeway.jpg` and `sea-rails.jpg` are original Codex ImageGen photo
references made 2026-11-06: a straight stone railway bank with rails and wooden
sleepers, plus a close strip of its track. The source is flat-lit on a pale
studio ground. The 40 metre stone face uses the lower photo crop; the rail kit
uses separate measured rail and sleeper crops. The recipe blends the face's
first and last two metres in memory for repeatable joins.
`sea-gear-hub.png` is an original Codex ImageGen product photograph made 2026-11-06: a clean machined iron hub with six open spokes and a capped central boss, dead-on against a pale studio ground. The recipe traces the spokes and scales the packed GLB copy in memory.

`sea-harbour-gate.jpg` is an original Codex ImageGen reference photograph made
2026-11-06: a closed pair of large riveted steel harbour gates in a weathered
stone frame. The recipe uses separate left and right leaf pivots and reuses the
existing seawall stone and coping material.

`sea-harbour-ramp.jpg` is an original Codex ImageGen reference photograph made
2026-11-06: an 8 metre stone slipway descends through an old harbour wall. The
model has a real opening, a sloped deck, stone reveals and the raised seawall
course.

`sea-causeway-arch.jpg` is an original Codex ImageGen reference photograph
made 2026-11-06: a low stone railway arch with daylight beyond it. The recipe
traces the true opening and rebuilds the dark inside, sleepers and rails at
0.87 metre centers.

## WW-ART-DAM-2 hoist wheel photos (2026-11-07)

dam-hoist-wheel-side.png and dam-hoist-wheel-end-on.png are original Codex ImageGen studio reference photographs generated on 2026-11-07. They show one rusted riveted dam-gate hoist wheel in its braced steel frame: a dead-on side view and a dead-on axle-end view. They are measured source images for the gantry wheel and frame recipe; the exported GLB embeds compressed copies.

## WW-ART-DAM-2 silt photo (2026-11-07)

- `dam-wet-silt-round2.png` is an original Codex ImageGen studio reference
  photograph generated 2026-11-07: a straight-down patch of rippled, cracked
  wet river silt fading into pale dry ground. It textures the old gear's silt
  heap; the source file stays full size and is reduced only in the recipe's
  memory. The old gear itself reuses `sea-old-gear.jpg`, credited above.
`sea-mule-wagon-side.jpg`, `sea-mule-wagon-end.jpg` and
`sea-mule-wagon-overhead.jpg` are original Codex ImageGen reference photos
made 2026-11-06: one empty, weathered flat wagon, from matched side, end and
dead-overhead views. The side photo anchors the end and overhead views.

`sea-camp-hut-side.jpg`, `sea-camp-hut-end.jpg` and `sea-camp-hut-top.jpg`,
`sea-camp-kitchen-side.jpg`, `sea-camp-kitchen-end.jpg` and
`sea-camp-kitchen-top.jpg`, plus `sea-camp-stilt-frame.jpg`,
`sea-camp-ladder.jpg` and `sea-camp-washing-line.jpg` are original Codex
ImageGen modeling-reference photos created on 2026-11-07. The hut and kitchen
views show the unraised buildings on a pale studio floor; the frame, ladder and
laundry references are also isolated on pale backgrounds. These JPEGs are
converted project copies of the tool's PNG outputs; the generated originals
remain in the Codex generated-images folder. No existing source photo was
replaced.

## Mrs Vane reference photographs

`sea-mrs-vane-coat-front.jpg`, `sea-mrs-vane-coat-side.jpg`,
`sea-mrs-vane-coat-back.jpg` and `sea-mrs-vane-coat-top.jpg` are crops from one
original Codex ImageGen studio turnaround generated on 2026-11-07 and edited once
so that her coat is one continuous closed coat-dress. They show the same older
woman in matched front, right profile, back and overhead views, in a white coat
and gloves, holding one pale envelope, on a uniform mid-grey ground. No existing
photograph was replaced.

## Sea water front photographs

`sea-water-front-face.jpg` and `sea-water-front-spray.jpg` are original
Codex ImageGen pictures created 2026-11-07 for the flood-surge model. The face
is a straight-on, edge-to-edge photograph of dirty brown-grey turbulent water,
foam and small floating debris with no sky or ground. Its opposite edge bands
were blended in memory in both directions before JPEG export so the texture
repeats across X and V. The spray is an isolated dirty foam burst composited on
charcoal for JPEG storage; the recipe derives a soft alpha mask from its dark
background for the embedded GLB texture. Neither picture uses outside source
art.
## Patience upperworks reference photos (2026-11-07)

`patience-upperworks-side.jpg`, `-front.jpg`, `-rear.jpg` and `-top.jpg` are 768 x 512 crops from one Codex ImageGen turnaround of a maintained cargo-ship accommodation block. The plan crop is flipped to put the bow at the carve's front. They are measured references for `ship-patience:upperworks`; the generated source remains in Codex's generated image output folder. No existing source photo was replaced.

`patience-funnel-side.png` and `patience-bridge-mast-side.png` are measured
crops of `patience-upperworks-side.jpg`, created by the Blender recipe for
round 8. They preserve the funnel and lattice mast from the same original
Codex ImageGen photograph; no outside source art is used.

## Patience bare-hull reference photos (WW-ART-SHIPS round 11, 2026-11-07)

`patience-hull-side.jpg`, `-bow.jpg`, `-stern.jpg` and `-top.jpg` are cropped Codex ImageGen outputs showing a maintained, weathered coaster hull in a dry dock from the side, bow, stern and overhead. The side and end views were rescaled to the specified 72 x 12 x 8 m proportions. They are original modeling references; their generated PNGs remain in Codex's generated-image folder. No outside source art is used.
