# Generated art provenance

The images were generated with the built-in image generator during this remake. No CLI fallback or separate image API key was used. They are original development assets. Generated raster art does not contain an editable 3D model; the vehicle mesh was constructed separately from the reference.

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


## Earned vehicle reference — 19 September 2026

Mode: built-in image generation, fresh image. Original retained. Copy: `public/assets/reference/unlock-vehicles.png`. Used as modeling reference for four original runtime vehicles and exported GLBs; the bitmap is not presented as a finished 3D asset.

Full prompt:

> Use case: stylized-concept. Asset type: realistic 3D racing-game vehicle production reference sheet. Four large clearly separated panels on a neutral charcoal studio background, showing four entirely fictional vehicles in front three-quarter view with subtle side-view inset silhouettes. Panel 1: Dusthawk Rally, compact white and forest-green AWD rally hatchback, short wheelbase, flared fenders, raised gravel suspension, four round hood-mounted rally lamps, chunky tires, visible roll cage. Panel 2: Banshee Muscle, burnt-orange and black American-inspired muscle coupe with a long square hood, wide rear shoulders, prominent polished supercharger, deep-dish dark wheels, muscular squared stance. Panel 3: Viper Prototype, pearl-white and electric-blue low endurance-racing prototype with a central canopy cockpit, separate sculpted wheel pods, huge diffuser, tall rear aero wing, extremely low splitter. Panel 4: Titan Monster, a much taller purple and lime monster truck with a compact pickup body, enormous black knobby tires, highly visible long-travel suspension links and coil springs, sturdy exposed safety cage, driver in helmet. All four visibly different silhouettes, plausible mechanical construction, realistic metal, rubber, glass and painted surfaces, sharp asset-modeling detail. No real brands, no trademarks, no text or labels, no speed effects, no HUD. Balanced wide sheet with entire vehicles visible and no cropping. Used as reference for original game-ready 3D models.
## Road and city material update — 19 September 2026

Mode: built-in image generation, fresh images. Originals retained. Both copies are used directly as color and subtle bump maps; no baked normal map is claimed.

### `public/assets/textures/race-asphalt.png`

Full prompt:

> Use case: photorealistic-natural. Asset type: seamless tileable PBR asphalt color texture for a realistic 3D racing game. Exact orthographic straight-down macro photograph of a four-meter square of well-used dark charcoal asphalt. Fine varied crushed aggregate, subtle natural gray stone grains, faint rubber wear, a few hairline repaired cracks and slightly smoother wheel-worn patches. Very low contrast irregular surface variation, physically believable road scale, realistic dry road microdetail. Even neutral diffuse light, no shadows or shiny reflections baked into the image. No painted road markings, no curbs, no vehicles, no scenery, no perspective, no horizon, no text. Uniform scale and subtle value across the whole square, seamlessly tileable on all four edges. Used directly as a repeating roadway material.

### `public/assets/textures/city-brick.png`

Full prompt:

> Use case: photorealistic-natural. Asset type: seamless tileable PBR wall material for a realistic 3D urban racing game. Orthographic straight-on photograph of aged dark red-brown industrial brickwork in staggered running bond, about 16 bricks across the square. Subtle variation between bricks, chipped corners, fine porous fired-clay detail, slightly recessed pale gray mortar, restrained soot and weathering. Bricks are rectangular and physically plausible, mostly evenly aligned. Flat neutral diffuse light with no directional shadows, no perspective, no surrounding building, no doors or windows, no graffiti, no lettering, no border. Uniform texture scale and even values across the square, seamlessly repeating at all four edges. This bitmap is used directly as the wall color and bump map on original city buildings.
# Rally gravel surface — September 19, 2026

Built-in image generation. Saved to `public/assets/textures/rally-gravel.png`; used as the rally, arena and gravel shortcut color map with a small visual bump. It is an authored albedo, not a measured PBR scan or normal map. Original generation remains in the Codex image folder.

Prompt:

> Create a single seamless square photorealistic material texture for a rally racing game's dirt road. Strict top-down orthographic view of 4 metres by 4 metres of compacted mountain-road gravel: mostly fine weathered grey-brown granite grit mixed with dusty pale taupe earth, scattered irregular small stones 5 to 35 mm, tiny compacted fractures and subtle shallow compressed tire scuffs in several directions. Flat soft overcast lighting, no baked directional shadows, no horizon, no perspective, no scene, no borders, no text, no large rocks, no plants. Neutral low contrast and natural color variation, mid-light grey-brown rather than orange. Seamless edges in both axes. This is only a color/albedo texture; do not create a PBR atlas or labels. Real scanned-surface appearance, crisp fine mineral detail. Fill the entire square image.
# Stadium crowd atlas — 19 September 2026

Built-in image generator. Saved as `public/assets/textures/stadium-crowd.png`; used as eight alpha-tested spectator variants in the stadium stands. The original PNG remains unchanged. Original output: `exec-f44841fe-1f3d-4427-be9e-21f411080a20.png`.

Prompt:

> Create a production game texture atlas for realistic motorsport stadium spectators. Transparent RGBA background, no scenery, no floor, no contact shadow outside each person, no text, no logos. Very wide horizontal image split into EXACTLY EIGHT EQUAL WIDTH CELLS in ONE ROW. Within every cell one different photorealistic adult spectator, front-facing, seated, visible from head through knees, whole silhouette fully inside its own cell with generous transparent margins on every side. Each cell has identical camera scale and feet/knees baseline, no outlines or dividing lines. Diverse men and women ages 20-60 with everyday muted casual jackets, T-shirts and baseball caps in maroon, denim blue, olive, charcoal, ochre, cream. Natural seated cheering gestures, two have one hand raised, others clap or rest hands on thighs. Arms never leave their own cell. Full detailed face and clothing but realistic proportions, relaxed sports audience. Flat soft overcast neutral illumination suitable as a game cutout, no hard cast shadows or dramatic highlights. Technical composition: exactly 8 isolated people, cell centers at 1/16,3/16,5/16,7/16,9/16,11/16,13/16,15/16 of image width, equal heights, transparent padding. A reusable crowd sprite atlas, not a rendered stadium scene.
# Tunnel concrete — 19 September 2026

Built-in image generator. Saved as `public/assets/textures/tunnel-concrete.png`; intended for tiled mountain-tunnel lining and portal concrete. Original output `exec-6129ee1a-9138-4d79-b854-e3a056bb5664.png` is retained.

Prompt:

> A seamless square PBR base-color/albedo texture of realistic weathered poured concrete for the interior lining of a modern mountain road tunnel. Orthographic flat-on material scan, covering about 4 by 4 meters. Neutral medium cool gray aggregate concrete, very fine sand and small pores, subtle horizontal formwork marks, faint vertical water streaks and restrained darker grime toward some pores. Matte construction surface, small natural variations, visually detailed up close yet calm at driving distance. Even diffuse neutral illumination, absolutely no directional lighting, highlights, baked shadows, objects, text, signs, perspective, cracks that form holes, bricks or tiles. Seamlessly tileable all four sides. Entire image is material. No borders. High-resolution realistic game texture, no stylization.
# Cloud density texture — 19 September 2026

Generated with the built-in image generator. Original: `exec-f04b9c4a-67e0-4cb3-b73c-358e898e29af.png`. Runtime copy: `public/assets/textures/cloud-density.png`. The sky projects this grayscale density map onto a distant cloud layer, tints it for each environment and animates it slowly. It is authored artwork, not measured weather data.

Prompt:

> Use case: photorealistic-natural. Asset type: seamless grayscale cloud-density texture for a realtime 3D racing game's sky, not a finished landscape. Create a square 1536x1536 tileable cloud coverage map viewed straight down from high above a horizontal cloud layer. Only clouds and clear gaps. Deep black is clear sky (zero opacity); soft white and light gray are voluminous sunlit cumulus and thin wisps. About 35 percent cloudy coverage. Several irregular medium-size billowing cumulus groups with natural nested fine detail, varied shapes, soft feathered fringes, large irregular black clear gaps. Clouds should have internally shaded grayscale volume detail but no baked directional cast shadows. All four edges must tile seamlessly, no visible border, no framing. No blue, no scenery, no ground, no horizon, no sun disc, no text, no stars. Image must be an opaque grayscale bitmap, black background, ready to use as a cloud opacity/density mask. Restrained realistic photographic weather detail, not painted swirls, smoke, storm clouds or a regular grid.
# Granite cliff texture — 19 September 2026

Generated with the built-in image generator. Original: `exec-39e9162e-74d8-421d-8af0-a119e8a31329.png`. Runtime copy: `public/assets/textures/granite-cliff.png`. Alpine and coastal mountain materials project it in world space, with a second broader texture scale for weathering. The previous granite asset is preserved for other rocks. This is authored color artwork with a small luminance bump effect, not measured PBR scan data.

Prompt:

> Use case: photorealistic-natural. Asset type: seamless rock-cliff material color texture for close and distant 3D mountain landscapes in a realistic racing game. Square image, orthographic straight-on crop of a weathered gray granite cliff face covering roughly 8 by 8 meters. Broad irregular fractured rock plates, branching dark crevices, vertical water stains, subtle tan feldspar and cool gray mineral variation, tiny pale lichen traces. Layered erosion and angular natural blocks must remain clear at distance; sparse fine grain, not evenly-speckled countertop granite. Natural Pacific coastal cliff character. Uniform overcast illumination, color/albedo material only, no directional cast shadows, no specular highlights. Seamless in both horizontal and vertical directions. Edge-to-edge rock only; no terrain silhouette, sky, trees, grass, objects, letters, border or grid. Neutral restrained colors, realistic weathered outdoor stone, not stylized.
## Tire smoke sprite — 19 September 2026

Built-in image generator. Original: `C:\Users\kyleb\.codex\generated_images\01a0b6fc-d2ab-7493-8798-1e7a3afc9aa2\exec-3572c09e-bfdf-416a-b85b-ae014e8cc311.png`.

Runtime copy: `public/assets/textures/tire-smoke.png` (1254 × 1254 RGBA, true alpha 0–254). Used by a bounded particle pool for gray tire smoke. It is an authored VFX sprite, not a fluid simulation. Original output is preserved.

Prompt:

> Create a game VFX texture: one isolated photorealistic soft tire smoke puff, square image, TRUE transparent alpha background. A single roughly round, irregular white/light neutral gray wispy cloud viewed straight on, strongest semi-opaque density around center but not a solid disc, fine rolling billows and wispy curls with natural internal variation, very soft fading transparent outer edges with at least 12 percent completely transparent margin around every edge. Neutral flat lighting suitable to tint in a real-time particle shader. No environment, no tire, no car, no shadow on a surface, no text, no border, no other objects, no black or white background. Whole puff contained in frame. Asset texture only, not a scene.
# Weathered city sidewalk — 19 September 2026

Built-in image generator. Runtime asset: `public/assets/textures/sidewalk-concrete.png`. Original retained at `C:\Users\kyleb\.codex\generated_images\01a0b6fc-d2ab-7493-8798-1e7a3afc9aa2\exec-45c5e4c2-e0c5-4349-9c6d-e8a62963c5cc.png`.

Exact prompt:

> Create one seamless tileable photorealistic game material texture: weathered urban sidewalk concrete, a square top-down orthographic albedo scan of a 2 meter by 2 meter patch. Warm neutral medium gray cement with small fine aggregate grains, subtle mottled aging, tiny dark pinholes, faint rubbed pedestrian wear, a few thin hairline cracks and restrained dirt variation. Uniform diffuse overcast lighting, no cast shadows, no directional highlights, no perspective. No slabs, no expansion joints, no curb, no painted markings, no objects, no grass, no text, no border. Edge-to-edge texture with seamless matching edges, balanced midtones and restrained contrast, realistic fine surface detail suitable for a physically based material in a nighttime city racing game. A single flat texture, not a preview sphere or presentation sheet.

The game uses this as color and subtle bump detail at a two-metre physical repeat. Sidewalk geometry supplies expansion joints and raised curb faces. This is a generated visual material, not a scanned PBR set.

## Pine bark — 19 September 2026

Built-in image generator. Runtime: `public/assets/textures/pine-bark.png`. Original retained at `C:\Users\kyleb\.codex\generated_images\01a0b6fc-d2ab-7493-8798-1e7a3afc9aa2\exec-d5cc6bef-cff1-4147-ac43-7ead44891e0a.png`.

Exact prompt:

> Use case: photorealistic-natural. Create a seamless square production game albedo texture of mature pine tree bark, flat orthographic close-up covering about one meter across and two meters vertically. Detailed irregular long vertical fissures and layered small flaky bark plates, weathered neutral dark brown and gray brown with subtle muted rust hints, realistic fine fibrous grain, restrained contrast, no bright orange or pale yellow wood. Even neutral diffuse illumination, no directional cast shadows, no specular highlights. Bark texture only edge-to-edge, no branches, trunk silhouette, leaves, moss, lichen patches, knots forming large focal objects, background, text, borders or presentation sheet. Seamlessly tileable left-right and top-bottom. Natural photographic material, suitable to wrap around a 3D pine trunk; depth will be supplied by runtime bump shading.

The trunk material uses this generated albedo and restrained luminance bump. It is authored texture artwork, not a measured PBR scan. The tree model and physical placement are unchanged.

## Grass cutout experiment — not used

An edit of the original meadow grass was generated with the built-in tool and reviewed. It retained denser opaque areas and did not improve the card silhouette. The runtime keeps the original `meadow-grass.png`; its lighting was corrected in the material instead. The discarded output remains at `C:\Users\kyleb\.codex\generated_images\01a0b6fc-d2ab-7493-8798-1e7a3afc9aa2\exec-1f417488-701e-4ea6-89cc-8e5822004bfc.png` and is not a runtime dependency.

Exact edit prompt:

> Edit this grass cutout into a clean production game foliage card. Keep the natural photorealistic grass subject, but REMOVE ALL of the blurry background, colored fog, shadow cloud and halo. The background must be truly transparent RGBA, including all open spaces between the individual blades and stems. Preserve thin, crisp botanical silhouettes with clean antialiased alpha edges. Create a compact low clump of deep natural meadow-green grass with only a few muted tan seed stems, dense fine narrow blades at the base and sparser individual arching blades at the top. No bright yellow paper-like wedges, no large opaque triangles, no soil slab, no base shadow, no surroundings, no border, no text. Flat neutral diffuse lighting without baked highlights or shadows; realistic fine blade detail readable when reduced to a one-meter-wide grass clump in a 3D racing game. Grass occupies the lower 85 percent of the image, with its roots near the bottom edge; retain generous clear transparency around the top and sides. A single clump, not an atlas or multiple views.
