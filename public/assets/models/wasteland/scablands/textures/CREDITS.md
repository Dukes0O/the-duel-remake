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

### `patience-white-painted-steel.jpg`

Date: 2026-11-06  
Tool: Codex ImageGen  
Use: 1024 x 1024 repeating albedo tile for Patience's exposed chart-room
roof, block ends and other white painted steel surfaces. The side-facing
superstructure uses the full ship photo projection instead.

Prompt:

> Use case: photorealistic-natural. Create a seamless 1024 by 1024 square albedo tile from an orthographic close-up of a real ship's worn off-white painted steel superstructure. The paint is old ivory-grey, faded and chalky, with fine brush texture, thin rust drips from fasteners, scattered small chips exposing dark brown-black oxidized metal, and a few shallow panel seams. Chips are mostly 2 to 15 cm at true scale. No windows, doors, lettering, large objects, shadows, perspective or dramatic highlights. Uniform bright overcast daylight with flat diffuse illumination. Sharp photographic detail, specific paint and corrosion at more than one scale, no blurred noise. Make all four edges tile seamlessly. Opaque image, no border or watermark.
