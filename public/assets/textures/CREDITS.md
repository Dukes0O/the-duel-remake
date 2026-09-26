# Environment lighting credit

`sunset-lighting.hdr`: **Zwartkops Curve Sunset**, photography by **Dimitrios Savva**, processing by **Jarod Guest**, from [Poly Haven](https://polyhaven.com/a/zwartkops_curve_sunset). [CC0 1.0 / public domain](https://polyhaven.com/license).

The 1K HDR file is unchanged apart from its local filename. Source: https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/zwartkops_curve_sunset_1k.hdr

Downloaded 19 September 2026. MD5 verified against the provider metadata: `706f60a837c17a665ae946bc7ea6e049`.

It supplies natural lighting and car reflections. The visible sky and 3D landscape are rendered separately. `red-sandstone.png` is original generated art documented in `docs/IMAGE_PROMPTS.md`.

## Scanned ground material

`ground-color.jpg`, `ground-normal.jpg` and `ground-roughness.jpg` are the 1K diffuse, OpenGL normal and roughness maps from **Gravelly Sand**, by **Dario Barresi**, [Poly Haven](https://polyhaven.com/a/gravelly_sand). Released under [CC0 1.0](https://polyhaven.com/license). Downloaded unchanged apart from filenames on 19 September 2026 using the provider's [file manifest](https://api.polyhaven.com/files/gravelly_sand). The game tiles and tints them by biome.

## Generated material maps

`alpine-granite.png` and `pine-bough.png` were generated for this game on 19 September 2026. They are used as a repeating granite map and transparent needle spray. Full prompts and use are recorded in `docs/IMAGE_PROMPTS.md`. `public/assets/reference/expanded-scenes.png` guides the new scene models and lighting.

`mountain-meadow.png` and `meadow-grass.png` were also generated on 19 September 2026. They supply the alpine/coastal turf and alpha-tested verge grass. Full prompts are in `docs/IMAGE_PROMPTS.md`.

`race-asphalt.png`, `city-brick.png` and `rally-gravel.png` were generated on 19 September 2026 with the built-in image generator. They supply road, building and dirt-route surface color. Small bump effects reuse the image luminance; these are authored images, not measured PBR scans or physical normal maps. Prompts and runtime use are in `docs/IMAGE_PROMPTS.md`.

## Stadium crowd atlas

`stadium-crowd.png` is an original image generated with the built-in image generator on 19 September 2026. Its eight transparent spectator cutouts are used on the arena grandstands. The unmodified generated PNG is retained in the workspace; the original output is also preserved in the Codex generated-images folder. No real person or brand is represented.
# Tunnel concrete

`tunnel-concrete.png` is original generated poured-concrete albedo, made with the built-in image generator on 19 September 2026 for tunnel lining and portals. Its prompt is recorded in `docs/IMAGE_PROMPTS.md` and the original output is retained.

## Cloud density

`cloud-density.png` is an original grayscale cloud texture made with the built-in image generator on 19 September 2026. The game projects and tints it for the visible sky. The full prompt is in `docs/IMAGE_PROMPTS.md`; the unmodified original output is retained.

## Granite cliffs

`granite-cliff.png` is original generated artwork made with the built-in image generator on 19 September 2026. It supplies broad fractures and weathering on alpine and coastal mountains. It is a color texture with a small luminance bump effect, not measured scan data. The full prompt and original filename are recorded in `docs/IMAGE_PROMPTS.md`.

## Wasteland Batch A

`scrap-plating.png`: Original Codex built-in image generation, 23 September 2026. Resized and seam-finished locally for car armor albedo. Original, prompt, and operations are documented in `docs/WASTELAND_ART.md`.

`scrapyard-dirt.png`: Original Codex built-in image generation, 23 September 2026. Resized and seam-finished locally for arena ground albedo. Original, prompt, and operations are documented in `docs/WASTELAND_ART.md`.

`muzzle-dust.png`: Original Codex built-in image generation and image edit, 23 September 2026. Cell-isolated and resized locally for the transparent 2×2 effects atlas. Original, prompts, and operations are documented in `docs/WASTELAND_ART.md`.

`fire-flipbook.png`: Original Codex built-in image generation, 23 September 2026. Cell-isolated and resized locally for an 8×8 transparent flame sequence. Original, prompt, and operations are documented in `docs/WASTELAND_ART.md`.

`explosion-flipbook.png`: Original Codex built-in image generation, 23 September 2026. Cell-isolated and resized locally for an 8×8 transparent dusty blast sequence. Original, prompt, and operations are documented in `docs/WASTELAND_ART.md`.

`smoke-flipbook.png`: Original Codex built-in image generation, 23 September 2026. Cell-isolated and resized locally for an 8×8 transparent smoke sequence. Original, prompt, and operations are documented in `docs/WASTELAND_ART.md`.
# Tire smoke

`tire-smoke.png` was created with the built-in OpenAI image generator on 19 September 2026. It is an original RGBA particle sprite. The exact prompt and original output path are in `docs/IMAGE_PROMPTS.md`.
`sidewalk-concrete.png` was made for this project with the built-in OpenAI image generator on 19 September 2026. It provides weathered concrete color and bump detail for city sidewalks. The exact prompt and retained original path are in `docs/IMAGE_PROMPTS.md`.

`pine-bark.png` is original bark material artwork generated with the built-in OpenAI image generator on 19 September 2026. The trunk material uses color and a restrained luminance bump. Exact prompt and retained original output are in `docs/IMAGE_PROMPTS.md`.

## Muddy Hollow mud

`muddy-hollow-mud.jpg` is the 1K diffuse map of **Brown Mud 02** by **Rob
Tuytel**, [Poly Haven](https://polyhaven.com/a/brown_mud_02), released under
[CC0 1.0](https://polyhaven.com/license). Downloaded 26 September 2026 from the
provider's file manifest and re-encoded (JPEG quality 84) by
`tools/art/muddy-hollow-mud.py`; checksums of the source maps are in
`tools/art/catalog.json`. The game tints it and blends it into the Muddy
Hollow pits.
