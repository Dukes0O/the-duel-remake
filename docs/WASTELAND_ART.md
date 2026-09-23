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

## public/assets/textures/scrap-plating.png

Date: 2026-09-23
Tool: Codex built-in image generation; deterministic finishing with Pillow and NumPy
Use: Opaque 1024×1024 repeating albedo for modular car armor plates.
Prompt:
> Use case: photorealistic-natural.
> Asset type: final 1024 by 1024 square seamless tileable color/albedo texture for modular scrap armor plates on cars in a realistic 3D combat racing game.
> Primary request: one orthographic straight-on close surface of salvaged steel plating, edge to edge, with small irregular hammered and welded sheet-metal patches, shallow overlapping repair plates, short worn seam lines, sparse flush rivet heads, chipped paint and restrained oxidized rust. Every edge must connect naturally to its opposite edge for repeat UV tiling.
> Style/medium: credible physically based game material color artwork, photorealistic fine metal grain; geometry supplies thickness and dents, so keep surface detail fairly flat.
> Color palette: dark charcoal steel, neutral worn silver, muted brown iron oxide and a little faded blue-green old paint, with restrained contrast so car silhouette remains readable.
> Lighting: uniform neutral diffuse illumination, no cast shadows, directional highlights, shiny glare or baked ambient occlusion.
> Composition: flat square material sample at consistent scale, no central subject and no large unique emblem; distribute fine and medium detail evenly to all edges.
> Constraints: exactly 1024x1024 pixels if supported. Opaque image, not transparent. No car, weapons, human, horizon, perspective, text, logos, readable marks, border, grid, normal map, roughness map, checkerboard or presentation sheet. No film-franchise motifs. Seamless left-to-right and top-to-bottom.

Source: the retained, unmodified 1254×1254 RGB original `exec-d911cd7c-92e5-4201-8d60-663d325ee322.png` (SHA-256 `de2f542e8c0756e5e985555fa6ef1f4c61091c23a72873d67edcc46f0eaf3895`). Local finishing used `tools/process-wasteland-art.py tile`: Lanczos resize to 1024² and a 96-pixel cosine-tapered blend of each pair of opposite edges, horizontally and vertically. No content was added. After resizing, mean RGB edge differences were 11.866 left/right and 11.383 top/bottom; after repair both are 0.0. A 2×2 tiled preview was inspected: boundaries meet, while the large plate pattern still repeats at the tile scale. Output: 2,164,363 bytes. The original is preserved outside the repository.

## public/assets/textures/scrapyard-dirt.png

Date: 2026-09-23
Tool: Codex built-in image generation; deterministic finishing with Pillow and NumPy
Use: Opaque 1024×1024 repeating albedo for the scrapyard arena ground.
Prompt:
> Use case: photorealistic-natural.
> Asset type: final 1024 by 1024 square seamless tileable opaque ground color/albedo texture for the dirt floor of a 3D combat-racing scrapyard arena.
> Primary request: one straight-down orthographic patch of hard-packed dry arena earth, fine gravel and shallow scuffed dust, with a few tiny embedded dull metal grains and very small pebble clusters. The surface must be even enough to repeat over a wide driveable loop, with natural micro and medium detail everywhere and no single large recognizable object. Opposite edges must match seamlessly both horizontally and vertically.
> Style/medium: restrained realistic photographic game material, not an illustration; ground shape, ruts and tire tracks will be supplied by geometry and decals.
> Color palette: dusty warm brown, tan, grey-brown and faint rusty ochre, darker than open desert sand but light enough to read black tires and car shadows.
> Lighting: uniform diffuse neutral daylight with no directional shadow, glare or baked ambient occlusion.
> Composition: flat square surface fills all pixels edge to edge at a consistent scale; subtle irregular mottling with no large repeated patches.
> Constraints: exactly 1024x1024 pixels if supported. Opaque RGB image. No horizon, perspective, sky, vehicle, tire, scrap heap, tools, vegetation, text, logos, border, grid, checkerboard, normal map or presentation sphere. No large ruts or directional tire streaks. Seamless left-right and top-bottom.

Source: the retained, unmodified 1254×1254 RGB original `exec-302f0e85-ab1f-417e-8c19-722be01d788d.png` (SHA-256 `6bca6776f4fd124909b9dd8e91317e1489b421acbfdc6ea8836e59c1123fc5b8`). Local finishing used `tools/process-wasteland-art.py tile`: Lanczos resize to 1024² and the same 96-pixel opposing-edge blend. Mean RGB edge differences after resizing were 25.759 left/right and 23.798 top/bottom; both are 0.0 in the saved tile. The 2×2 preview reads as continuous dirt and fine gravel. Output: 2,524,004 bytes. The original is preserved outside the repository.

## public/assets/textures/muzzle-dust.png

Date: 2026-09-23
Tool: Codex built-in image generation and image edit; deterministic finishing with Pillow and NumPy
Use: Transparent 1024×1024 2×2 atlas: muzzle flash, muzzle dust, wheel dust, and metal impact.
Prompt:
> Use case: stylized-concept. Asset type: final transparent 2×2 VFX sprite sheet for a realistic 3D arcade combat racing game, 1024×1024 pixels overall, four equal 512×512 cells with exact hard boundaries. Primary request: create four original, isolated effects, one centered fully inside each cell: top left a compact warm amber muzzle flash pointing right; top right a short dusty muzzle cloud with a few sparks; bottom left a low ground-hugging tan wheel dust puff; bottom right a brief rust-colored metal impact spark and dust burst. Style: grounded photorealistic game VFX with restrained bloom, sharp interior detail and soft feathered edges. Every cell must have a genuinely transparent alpha background, at least half its pixels fully clear, with no effect crossing cell boundaries. Even scale and lighting across all cells. No drawn checkerboard, background, border, grid lines, car, gun, person, text, numbers, logos, watermark, gore or film references. Output the sprite sheet itself, not a presentation mockup. Exactly 1024 by 1024 PNG if output sizing supports it.

Targeted built-in edit prompt, which produced the retained source:
> Use case: precise-object-edit. Asset type: final Wasteland 2×2 muzzle and dust VFX sheet. Input image 1 is the edit target. Preserve the four original effects, their cell order, colors, physical texture, clear alpha, and separation. Change only technical canvas layout: output an actual 1024×1024 transparent PNG with four exact 512×512 cells, each effect wholly inside its cell and at least 5% fully clear pixels in every cell. Do not add, remove or redraw content, grids, borders, backgrounds, checkerboards, text or watermarks. This must be the final sprite sheet itself, not a preview.

Source: the retained 1254×1254 RGBA edit `exec-cfb31e09-116a-4c89-999b-d8e9abc4a15a.png` (SHA-256 `3e4961b10a912c047c511579f26d2e321e8869a6c9f95329c8eb90ce618a72ed`), also retained unchanged as `public/assets/reference/wasteland-muzzle-dust-study.png`. Local finishing used `tools/process-wasteland-art.py muzzle`: split at the source cell boundaries, taper alpha over the outer 36 source pixels of each cell, Lanczos resize each to 480², and center it with a 16-pixel transparent gutter inside each 512² output cell. There are no nontransparent pixels on the output sheet's outer edge. The four effects remain isolated and readable in the inspected dark-background preview; each cell has at least 56.79% fully clear pixels. Output: 745,228 bytes. The source remains unchanged.

## public/assets/textures/fire-flipbook.png

Date: 2026-09-23
Tool: Codex built-in image generation; deterministic finishing with Pillow and NumPy
Use: Transparent 2048×2048 8×8 sequence for small burning-car flames.
Prompt:
> Use case: game VFX sprite sheet. Create ONE original transparent PNG production sheet of a single small fire effect evolving over 64 successive frames in an exact 8 columns by 8 rows grid, read left-to-right then top-to-bottom. Every cell is identical size and contains one centered effect wholly within its own cell, with generous fully transparent gutters. The first 8 frames show tiny ignition, frames 9–24 grow into a compact flame, frames 25–40 sustain and waver, frames 41–56 shrink with smoke, frames 57–64 fade completely to transparent. Each cell must be a distinct successive moment, not repeated identical icons. Grounded realistic video-game VFX for a gritty but readable 3D combat-racing game: restrained amber/orange fire, dark smoke undertone, realistic irregular flicker, soft alpha edges, no exaggerated bloom. Flat camera view and fixed scale across frames, no movement of the effect center. The file itself is the sprite sheet, not a preview. Actual transparent alpha background, not black, checkerboard, or colored background. No panel borders, grids, text, labels, logos, cars, weapons, people, gore, watermarks, film references, or extra objects. Output square with exact 8x8 cell alignment and no effects crossing any cell boundary; exactly 2048x2048 pixels if output sizing supports it.

Source: retained 1254×1254 RGBA original `exec-65827175-589c-4c34-ab5d-ea5f5e9a3bbb.png` (SHA-256 `19b158c755b7e0d59e19b07c2d23193f477f6d8e0cf6c9211d53acbcb076d1b8`). Local finishing used `tools/process-wasteland-art.py flipbook --effect fire`: divide the square into 64 rounded source rectangles, taper alpha over each cell's outer 10 source pixels, Lanczos resize each cell to 240², and center it in a transparent 256² output cell with an 8-pixel gutter. This produces exact 2048² dimensions without adding or duplicating frames. The lowest fully clear fraction is 47.19% of any cell; the output's outer border is fully clear. The inspected dark-background preview shows ignition, growth, sustained flicker, and fade. Output: 1,636,014 bytes. The original is preserved outside the repository.

## public/assets/textures/explosion-flipbook.png

Date: 2026-09-23
Tool: Codex built-in image generation; deterministic finishing with Pillow and NumPy
Use: Transparent 2048×2048 8×8 sequence for dusty blasts and wrecks.
Prompt:
> Use case: production game VFX sprite sheet. Create ONE original transparent PNG sheet showing ONE dust-and-ember explosion evolving across EXACTLY 64 distinct successive frames in an exact 8 columns by 8 rows grid, read left-to-right then top-to-bottom. Each equal-sized cell contains one centered isolated moment, entirely inside its own cell with generous fully transparent gutters. Frames 1–8: pinpoint warm impact core expands; frames 9–16: sharp compact amber burst and few sparks; frames 17–32: blast expands into a wider brown dust and small dull debris cloud; frames 33–48: dust billows and spreads while bright core disappears; frames 49–64: cloud thins and fades completely. Keep physical scale and position coherent through the timeline, with neighboring frames changing gradually. Grounded realistic visual effects for a gritty 3D combat-racing game: warm amber light only near ignition, muted sandy brown and charcoal particulate smoke, no huge white fireball. Fixed camera, no scene background. Actual transparent alpha background, not black, checkerboard, or colored background. The file is a sprite sheet, not a presentation page. No panel borders, drawn grids, text, labels, logos, cars, guns, people, gore, watermarks, film references, or extra objects. Ensure no effects cross cell boundaries, and every cell has mostly clear alpha. Output square with exact 8x8 alignment, exactly 2048x2048 pixels if sizing supports it.

Source: retained 1254×1254 RGBA original `exec-e00291aa-51ad-427f-8ca0-4fc20bb9232c.png` (SHA-256 `fa3d7be44b9d2397093ca18c5305aa938a0fd0ed8e8dc13af623662dd31835d9`). The same 64-cell split, 10-source-pixel alpha taper, 240² Lanczos resize, and 8-pixel transparent gutter were applied with `tools/process-wasteland-art.py flipbook --effect explosion`. A further alpha taper from cell y=192–220 in later frames removes the original's lower dust/reflection band. In source rows five onward, alpha is cleared through y=64 and tapered through y=80 to remove the preceding row's carryover; no RGB content was redrawn. The lowest fully clear fraction is 28.29% of any cell; the outer border is fully clear. The inspected dark-background preview shows a small bright core, expanding gritty blast, rolling dust, and fade without the detached lower band. Output: 3,023,540 bytes. The original is preserved outside the repository.

## public/assets/textures/smoke-flipbook.png

Date: 2026-09-23
Tool: Codex built-in image generation; deterministic finishing with Pillow and NumPy
Use: Transparent 2048×2048 8×8 sequence for Wasteland combat smoke.
Prompt:
> Use case: production game VFX sprite sheet. Create ONE original transparent PNG sheet with EXACTLY 64 distinct successive frames of ONE dark smoke plume, arranged in an exact 8-column by 8-row grid, read left-to-right then top-to-bottom. Each cell is equal size, contains only one centered isolated smoke moment, with wide clear transparent space on every side. Frames 1–8: a small charcoal puff appears; 9–24: the plume rises and widens; 25–40: it billows into a broad natural brown-charcoal cloud; 41–56: the cloud thins and breaks into wisps; 57–64: it fades fully to transparent. Keep the base in the same position and scale progression coherent between neighboring frames. Grounded realistic visual effects for gritty but readable 3D combat racing; soft natural alpha, fine particulate edges, charcoal gray and dusty brown, no flames, no sparks, no bright highlights. Fixed camera, no scene background. The actual background must be TRANSPARENT ALPHA, not black, checkerboard, or colored. The file is an atlas itself, not a presentation board. No borders, drawn grids, captions, labels, logos, cars, weapons, people, gore, watermarks, film references, or additional objects. No effects touching or crossing any cell boundary. Output square with exact 8x8 alignment, exactly 2048x2048 pixels if supported.

Source: retained 1254×1254 RGBA original `exec-8315a75b-8248-47a4-9318-ab4869c8c598.png` (SHA-256 `d3015041587014905106bf6484e8f91beed0a5a3cee61f6842d098c4fd3fc29e`). The same 64-cell split, 10-source-pixel alpha taper, 240² Lanczos resize, and 8-pixel transparent gutter were applied with `tools/process-wasteland-art.py flipbook --effect smoke`. A further alpha taper from cell y=214–230 removes the original's detached ground-shadow band while retaining the plume and its fade. The lowest fully clear fraction is 31.83% of any cell; the outer border is fully clear. The inspected dark-background preview shows plume growth, billowing, fragmentation, and fade. Output: 2,581,093 bytes. The original is preserved outside the repository.

## Batch A review

All six planned Batch A runtime images are present. The earlier 12-stage opaque progression board remains a palette and timing reference only; none of its pixels were used to make these flipbooks. The built-in generator returned 1254×1254 despite explicit final-size prompts, so the approved local finishing produced exact runtime dimensions without modifying originals. The art-intake checker validates dimensions, alpha, provenance, and byte budgets. Independent in-game playback review remains useful for the effect pacing and the plating repeat scale.
