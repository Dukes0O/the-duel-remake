# Wasteland art intake

Record every new Wasteland image here before checking it in. Each image gets
its own `## public/assets/...` heading, date, tool, use, and the full prompt
as a Markdown quote. Add its filename and credit to the `CREDITS.md` beside
the runtime image. Keep the original image output outside this repository.

Batch A follows `SPEC.md` section 3.10. Only accepted runtime textures are
checked into `public/assets/textures/`; clearly labeled non-runtime studies
may be kept in `public/assets/reference/`.
The intake check reports planned images that are still absent; it fails when a
present image has invalid dimensions, missing transparency, an excessive file
size, or incomplete provenance.

## public/assets/reference/wasteland-art-direction.png

Date: 2026-09-23
Tool: Codex image generation
Use: Original Wasteland visual direction for vehicle attachments, scrapyard arena, and material palette. Reference only; not a game texture.
Prompt:
> Use case: stylized-concept.
> Asset type: wide landscape art direction reference board for a realistic 3D arcade combat racing game, Wasteland expansion.
> Primary request: create one original, coherent visual direction board showing a fictional post-collapse motorsport world. Three cinematic panels without captions or text: (1) a low wedge-shaped fictional sports coupe in rear three-quarter view, fitted with believable bolt-on irregular scrap-steel armor plates, a compact roof cage and front ram bar, all physically attached to the body; (2) a broad scrapyard arena with a clear drivable dirt loop, stacked salvage and distant industrial cranes kept well away from the driving line, one original rugged rival buggy for scale; (3) close-up material study of scratched oxidized iron plates, dusty compacted earth, dark rubber and amber ember highlights.
> Style/medium: grounded photorealistic game-production concept art, physically plausible materials and scale, crisp readable silhouettes, realistic camera perspective, useful as a modeler and texture artist reference, not a finished game screenshot.
> Lighting/mood: late afternoon desert light with restrained warm dust, legible shadow detail, high enough contrast to read at racing speed.
> Color palette: muted rust red, brown-gray dirt, charcoal steel, faded blue-green accents and small warm orange embers; cohesive with a realistic canyon racing game.
> Composition/framing: wide horizontal triptych, clean panel divisions and clear visual hierarchy, subjects fully in frame, no overlapping panel content.
> Constraints: original vehicles and original setting only; no references to any film or franchise; no real brands or logos; no readable words, labels, interface, watermark, gore or human injury; no giant spikes obscuring cars; road and arena route must stay visibly driveable.

Inspection: 1774×887 opaque RGB PNG. The armored coupe, open arena route, and material studies read clearly at full size. No readable text or real branding was found. The original remains in Codex generated images as `exec-9576197c-3ae1-4f18-af60-f40b9c8d8c90.png`; the runtime copy is byte-identical.

## Unaccepted texture study: scrap plating

Date: 2026-09-23
Tool: Codex image generation
Use: Candidate car armor albedo for `public/assets/textures/scrap-plating.png`; not checked in because it misses exact dimensions and seamless edges.
Prompt:
> Use case: photorealistic-natural.
> Asset type: final 1024 by 1024 square seamless tileable color/albedo texture for modular scrap armor plates on cars in a realistic 3D combat racing game.
> Primary request: one orthographic straight-on close surface of salvaged steel plating, edge to edge, with small irregular hammered and welded sheet-metal patches, shallow overlapping repair plates, short worn seam lines, sparse flush rivet heads, chipped paint and restrained oxidized rust. Every edge must connect naturally to its opposite edge for repeat UV tiling.
> Style/medium: credible physically based game material color artwork, photorealistic fine metal grain; geometry supplies thickness and dents, so keep surface detail fairly flat.
> Color palette: dark charcoal steel, neutral worn silver, muted brown iron oxide and a little faded blue-green old paint, with restrained contrast so car silhouette remains readable.
> Lighting: uniform neutral diffuse illumination, no cast shadows, directional highlights, shiny glare or baked ambient occlusion.
> Composition: flat square material sample at consistent scale, no central subject and no large unique emblem; distribute fine and medium detail evenly to all edges.
> Constraints: exactly 1024x1024 pixels if supported. Opaque image, not transparent. No car, weapons, human, horizon, perspective, text, logos, readable marks, border, grid, normal map, roughness map, checkerboard or presentation sheet. No film-franchise motifs. Seamless left-to-right and top-to-bottom.

Original outside repo: `exec-d911cd7c-92e5-4201-8d60-663d325ee322.png`. It has a useful material palette but measures 1254×1254 pixels. Its left/right edge difference is 11.91 mean RGB levels versus 7.30 between neighboring columns; top/bottom is 11.11 versus 7.55 between neighboring rows.

Targeted image edit prompt:
> Use case: precise-object-edit.
> Asset type: production scrap-plating albedo texture for a 3D game.
> Input image 1: edit target, the generated square scrap-steel texture.
> Primary request: preserve the same dark steel, faded teal paint, sparse rust, rivets, scratches, plate scale and flat lighting, but repair the opposite boundaries into a genuinely seamless repeating texture. The plate seams and metal grain touching the left edge must continue naturally from the right edge; the top edge must continue naturally from the bottom edge. Remove any abrupt visual jumps at the tile boundaries. Keep the center's overall appearance and material density.
> Output: an opaque square PNG at exactly 1024 by 1024 pixels if the tool supports dimensions; create the final game texture itself, not a tile preview.
> Constraints: no car, scene, border, grid, text, logo, watermark, transparency, fake checkerboard, obvious repeated central motif, directional illumination or perspective. The image must remain useful as a flat material color map.

Edited original outside repo: `exec-7b3e8867-6dfb-4e3f-8bf5-aa2731474c9b.png`. It is still 1254×1254. Edge differences are left/right 12.89 versus neighbor 7.66; top/bottom 16.68 versus neighbor 7.39. It is not a seamless 1024×1024 runtime texture.

## Unaccepted texture study: scrapyard dirt

Date: 2026-09-23
Tool: Codex image generation
Use: Candidate arena ground albedo for `public/assets/textures/scrapyard-dirt.png`; not checked in because it misses exact dimensions and seamless edges.
Prompt:
> Use case: photorealistic-natural.
> Asset type: final 1024 by 1024 square seamless tileable opaque ground color/albedo texture for the dirt floor of a 3D combat-racing scrapyard arena.
> Primary request: one straight-down orthographic patch of hard-packed dry arena earth, fine gravel and shallow scuffed dust, with a few tiny embedded dull metal grains and very small pebble clusters. The surface must be even enough to repeat over a wide driveable loop, with natural micro and medium detail everywhere and no single large recognizable object. Opposite edges must match seamlessly both horizontally and vertically.
> Style/medium: restrained realistic photographic game material, not an illustration; ground shape, ruts and tire tracks will be supplied by geometry and decals.
> Color palette: dusty warm brown, tan, grey-brown and faint rusty ochre, darker than open desert sand but light enough to read black tires and car shadows.
> Lighting: uniform diffuse neutral daylight with no directional shadow, glare or baked ambient occlusion.
> Composition: flat square surface fills all pixels edge to edge at a consistent scale; subtle irregular mottling with no large repeated patches.
> Constraints: exactly 1024x1024 pixels if supported. Opaque RGB image. No horizon, perspective, sky, vehicle, tire, scrap heap, tools, vegetation, text, logos, border, grid, checkerboard, normal map or presentation sphere. No large ruts or directional tire streaks. Seamless left-right and top-bottom.

Original outside repo: `exec-302f0e85-ab1f-417e-8c19-722be01d788d.png`. It has credible compacted dirt but measures 1254×1254. Its left/right edge difference is 24.76 versus neighboring columns 15.49; top/bottom is 22.42 versus neighboring rows 14.76.

Targeted image edit prompt:
> Use case: precise-object-edit.
> Asset type: production scrapyard dirt albedo texture for a 3D game.
> Input image 1: edit target, the generated square hard-packed earth and fine gravel texture.
> Primary request: retain its warm grey-brown compacted soil, tiny stone grains, low relief, density and neutral diffuse lighting, but repair its opposite borders into a genuinely seamless repeating texture. The color and pebble pattern at the left boundary must continue naturally from the right boundary; the top boundary must continue from the bottom boundary. Remove any abrupt tone jump or recognizable repeated seam. Keep the interior materially consistent and no large focal pebble clusters.
> Output: one opaque square PNG at exactly 1024 by 1024 pixels if the tool supports dimensions; output the final texture itself, not a tiled demonstration.
> Constraints: no perspective, horizon, directional lighting, tire tracks, large rocks, tools, scrap heap, car, text, logo, border, grid, fake checkerboard or presentation sheet. Flat driveable ground material color map only.

Edited original outside repo: `exec-2473dc95-d136-4282-bf03-793688a8f121.png`. It is still 1254×1254. Edge differences are left/right 22.84 versus neighbor 12.87; top/bottom 22.37 versus neighbor 11.74. It is not a seamless 1024×1024 runtime texture.

## public/assets/reference/wasteland-vfx-progression.png

Date: 2026-09-23
Tool: Codex built-in image generation
Use: Non-runtime visual study for the future fire, explosion, and smoke flipbooks. It sets a restrained amber, dusty brown, and charcoal effect language and shows four stages of each effect. It is not one of the final 8×8 transparent textures.
Prompt:
> Use case: stylized-concept. Asset type: wide landscape visual reference board for future fire, explosion, and smoke flipbook textures in a realistic 3D arcade combat racing game; this is a concept study, not a production sprite sheet. Primary request: a clean three-row effects progression board, each row showing four distinct successive moments of one original effect. Top row: a small ignition along a damaged car edge growing into a compact amber flame, then thinning and fading. Middle row: a dusty orange blast swelling from a bright core into a wide debris cloud, then dissipating. Bottom row: charcoal and brown smoke rising from a small plume into a broad diffuse cloud, then thinning. Twelve effects total, clearly separated into equal visual cells without labels or text; no effect crosses a cell boundary. Grounded photorealistic game VFX, restrained warm highlights, dark neutral backdrop, consistent scale and light, crisp details and natural transparent-looking feathered silhouettes. Composition: very wide horizontal canvas, clear row and column alignment, enough empty space between effects to read every stage. No vehicles, people, weapons, logos, readable marks, borders, drawn grids, checkerboard, gore, film references or watermarks.

Inspection: 1942×809 opaque RGB PNG, 1,781,630 bytes. The four fire, four explosion, and four smoke stages read in order, with no readable text or logos. It has a dark background and only 12 reference frames, so it must not be treated as a transparent 8×8 runtime atlas. The copy in this repository is byte-identical to retained original `exec-cb8df296-fb8f-4e3a-81b6-1220a8ce2aab.png` in Codex generated images (SHA-256 `d021fa36eb0884f873e9b330b2a206c0ce45e05ac32732edbc8772ca264f5657`).

## public/assets/reference/wasteland-muzzle-dust-study.png

Date: 2026-09-23
Tool: Codex built-in image generation and built-in image edit
Use: Non-runtime visual study for the future 2×2 `muzzle-dust.png` sprite sheet. The four cells show a right-facing muzzle flash, muzzle dust, wheel dust, and a metal impact burst.
Prompt:
> Use case: stylized-concept. Asset type: final transparent 2×2 VFX sprite sheet for a realistic 3D arcade combat racing game, 1024×1024 pixels overall, four equal 512×512 cells with exact hard boundaries. Primary request: create four original, isolated effects, one centered fully inside each cell: top left a compact warm amber muzzle flash pointing right; top right a short dusty muzzle cloud with a few sparks; bottom left a low ground-hugging tan wheel dust puff; bottom right a brief rust-colored metal impact spark and dust burst. Style: grounded photorealistic game VFX with restrained bloom, sharp interior detail and soft feathered edges. Every cell must have a genuinely transparent alpha background, at least half its pixels fully clear, with no effect crossing cell boundaries. Even scale and lighting across all cells. No drawn checkerboard, background, border, grid lines, car, gun, person, text, numbers, logos, watermark, gore or film references. Output the sprite sheet itself, not a presentation mockup. Exactly 1024 by 1024 PNG if output sizing supports it.

Targeted built-in edit prompt, using that generated image as the edit target:
> Use case: precise-object-edit. Asset type: final Wasteland 2×2 muzzle and dust VFX sheet. Input image 1 is the edit target. Preserve the four original effects, their cell order, colors, physical texture, clear alpha, and separation. Change only technical canvas layout: output an actual 1024×1024 transparent PNG with four exact 512×512 cells, each effect wholly inside its cell and at least 5% fully clear pixels in every cell. Do not add, remove or redraw content, grids, borders, backgrounds, checkerboards, text or watermarks. This must be the final sprite sheet itself, not a preview.

Inspection: the built-in edit retained a readable four-cell arrangement and genuine alpha. The edited PNG is 1254×1254, 1,228,459 bytes, with 61.86% fully clear pixels and at least 56.57% fully clear pixels in each cell. It still misses the required 1024×1024 size. The original generation was also 1254×1254. This checked-in copy is a reference only, byte-identical to retained edited original `exec-cfb31e09-116a-4c89-999b-d8e9abc4a15a.png` in Codex generated images (SHA-256 `3e4961b10a912c047c511579f26d2e321e8869a6c9f95329c8eb90ce618a72ed`). No local pixel resizing was used.

## Remaining Batch A work

Six planned runtime images are still absent: exact-size tileable plating and dirt, the three transparent 2048×2048 8×8 flipbooks, and the transparent 1024×1024 2×2 muzzle/dust sheet. The two new reference studies guide their look but do not satisfy those runtime contracts. The built-in generator returned 1254×1254 for both the original and edited 2×2 sheet despite explicit 1024×1024 prompts. Earlier plating and dirt attempts also returned 1254×1254 and had visible seam risk. No local pixel alteration was used on these candidates; validation only read their pixels and metadata.
