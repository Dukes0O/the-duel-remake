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
