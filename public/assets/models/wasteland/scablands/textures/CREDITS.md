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
