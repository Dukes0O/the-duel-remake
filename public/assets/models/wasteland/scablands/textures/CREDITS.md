# Dry Dam texture credits

The concrete, salt-crust, rust and galvanized-steel pictures below are original
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

## `dam-salt-crust.jpg`

Use: 2 m repeating colour texture for the filling hall's unmistakably wet,
salt-encrusted back wall and localized water marks.

Prompt (Codex ImageGen, 2026-11-05):

> Use case: photorealistic-natural. Asset type: repeating albedo texture for the back wall of an abandoned dam filling hall. Primary request: a square close photograph of wet, salt-encrusted grey concrete, with unmistakable dark water running down and thick chalky white mineral crust. Subject: aged concrete, deep charcoal wet vertical streaks 5 to 20 cm wide, layered pale white salt deposits and crystals along the streak edges, damp olive-grey shadow at the bottom; no painted stripes. Style/medium: realistic macro surface photography, sharp detail at real scale. Composition: flat-on crop with even physical scale and seamless repeating edges, no perspective. Lighting/mood: bright even overcast daylight. Materials/textures: wet dark concrete and brittle white efflorescence, no blur, no noise-only effect. Constraints: no text, no objects, no landscape, no saturated green, no pink, no orange rust, no illustration, no watermark.

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
