# Generated art provenance

Both images were generated with the built-in image generator during this remake. No CLI fallback or separate image API key was used. They are original development assets. Generated raster art does not contain an editable 3D model; the vehicle mesh was constructed separately from the reference.

## Car, building, and landscape reference sheet

File: `public/assets/reference/redline-horizons-art-direction.png`.

The full reference-sheet prompt is recorded in [ASSET_PIPELINE.md](ASSET_PIPELINE.md). The sheet guides the wedge body, rear louvers, spoiler, tail lamps, weathered service-station palette, and warm canyon art direction.

## Canyon texture

File: `public/assets/textures/red-sandstone.png`. Used directly as the repeating canyon color texture in `src/world.js`.

Full prompt:

> Use case: photorealistic-natural. Asset type: seamless tileable environment texture for a 3D driving game. Create one square production-quality flat albedo texture of weathered Mojave red sandstone cliff rock, covering the whole image edge to edge. Warm subdued terracotta, dusty tan, rust and gray ochre. Fine sedimentary horizontal layers with irregular vertical erosion channels and small pitted fissures. Strong natural micro surface detail, broad strata irregularly spaced. Orthographic front-on surface only, uniform diffuse lighting, no directional highlights, no shadows baked in, no perspective, no horizon, no scene, no lettering, no border. Seamless on all four edges suitable for texture repeat on tall canyon mesa geometry. Natural and photographic, not illustrative.

Visual inspection: suitable warm rock texture with fine cracks and sediment detail. It is used as a color map only. It is not a measured physical material set, normal map, or displacement map; seamless tiling is a generation target rather than a guaranteed measured property.


## Expanded scenes, granite and pine foliage — 19 September 2026

Mode: built-in image generation, three fresh images without input references. Generated originals remain in the Codex generated-images folder. The following copies are in the repository. No external image API, Blender rendering, or image-processing edits were used.

### Environment reference — `public/assets/reference/expanded-scenes.png`

Used as the modeling and lighting reference for the Pacific coast lighthouse and blue fuel canopy, harbor warehouse windows and lamps, alpine granite, helmeted driver, and roadside flocks. It is a reference image, not a prerendered game background.

Full prompt:

> Use case: stylized-concept. Asset type: AAA racing-game environment art direction board, three large cinematic panels. Create a premium realistic production reference for The Duel: a modern red sports coupe racing on a clearly unobstructed two-lane road in three distinct locations. Panel one: alpine pass with naturally weathered grey granite massifs and grounded conifer trees, clear asphalt bends with yellow chevron signs, mountains safely set back from the driving corridor, no road crossings or floating trees. Panel two: a rugged Pacific coastline in late afternoon, blue-green ocean below a stone seawall, coastal grasses, weathered white lighthouse and a small cream roadside fuel stop with blue canopy. Panel three: an industrial waterfront at blue hour, tall warehouses with warm window light, overhead lamps, wet-looking asphalt highlights, amber warning signs, long uncluttered racing sightlines. Include small close-up inset references of a helmeted racing driver through a windscreen and a group of white and brown roadside chickens, non-violent playful scenery. Highly detailed physically plausible materials, atmospheric depth, grounded structures, realistic scale, cinematic lighting. No brand logos, no text labels, no HUD. Landscape wide composition, sharp useful modeler references, not a poster.

### Granite albedo — `public/assets/textures/alpine-granite.png`

Used directly as a repeating color and bump map on alpine/coastal mountains and boulders. Geometry supplies the shape; the image supplies the surface detail.

Full prompt:

> Use case: photorealistic-natural. Asset type: seamless tileable rock surface color texture for a real-time 3D alpine racing-game landscape. Orthographic straight-on macro view of naturally fractured alpine grey granite with cool medium-grey stone, lighter mineral veins, tiny warm flecks, a few dark fissures and weathered grains. Consistent moderate contrast, evenly diffuse neutral illumination with no directional lighting or shadows, no perspective, no surrounding scenery, no giant identifiable features, no text or border. Uniform micro and medium-scale stone detail across the entire square, seamless edges suitable for repeating UVs on irregular 3D mountains. No orange sandstone layers and no moss. The image itself will be used as a material map.

### Pine needle cutout — `public/assets/textures/pine-bough.png`

Used directly on intersecting branch planes arranged around 3D trunks. Alpha-tested leaves cast shadows. The course supplies the shared ground height and solid trunk position.

Full prompt:

> Use case: photorealistic-natural. Asset type: transparent foliage texture for realistic 3D alpine pine trees in a racing game. One dense natural evergreen pine bough viewed from above, stretching horizontally from a short narrow woody stem at the far left to a tapered irregular tip at the right. Many branching sprays of fine dark forest-green and muted olive needles, subtle variation in needle orientation and color, realistic waxy pine needle detail, narrow branching wood visible only near the central stem, dense but finely serrated silhouette. Even diffuse neutral outdoor light, no directional shadow. The full bough isolated on a genuinely transparent alpha background, generous transparent space around all edges, no pot, no scenery, no text, no border, no fake checkerboard. Wide horizontal composition. This cutout will be repeated on branch planes arranged radially around a 3D trunk, so it must read as a natural flat branch spray with all needles contained within frame.


## Meadow landscape follow-up — 19 September 2026

Mode: built-in image generation, fresh images without references. Originals retained; the following copies are used directly in the game. Both material images are unchanged. The grass cutout's alpha channel was inspected to verify transparency; it was not edited with image-processing code.

### Ground — `public/assets/textures/mountain-meadow.png`

Full prompt:

> Use case: photorealistic-natural. Asset type: seamless ground albedo texture for a realistic 3D alpine racing game. Create an orthographic straight-down view of dense natural short mountain meadow turf with fine blades of living olive-green and muted forest-green grass, subtle dry straw patches, tiny dark exposed earth flecks and occasional very small stone grains. Rich fine-scale texture like a scanned PBR ground color map. Irregular natural mottling without any obvious repeated shape. Grass is the dominant coverage, not bare sand. Even diffuse neutral overcast lighting, no cast shadows, no directional highlight, no horizon, no perspective, no objects, no flowers, no text or border. Uniform scale across the full square. Seamless edges suitable for tiling across rolling alpine hills and Pacific coastal grass verges. The image will be used directly as a tiled ground material, not as a background illustration.

### Verge grass — `public/assets/textures/meadow-grass.png`

Full prompt:

> Use case: photorealistic-natural. Asset type: alpha cutout foliage texture for a realistic 3D racing-game verge. One natural low clump of meadow grasses viewed straight on at grass height, all stems rooted together on one flat baseline near the bottom of the image. Many fine curving slender blades in muted fresh green, olive, and a little dry straw, a few delicate seed heads, wind-swept irregular silhouette, dense lower growth with open fine tips. The whole clump is wide and low, about 65 cm wide and 45 cm tall in life. Photographic detail with neutral soft diffuse daylight, no strong highlights or directional shadows. Genuinely transparent alpha background around and between the grass blades. No ground, soil mound, stone, scenery, border, words or fake checkerboard. Wide horizontal composition, entire plant inside the frame. This image will be placed on crossed billboard planes anchored to 3D ground as dense realistic roadside meadow vegetation.
