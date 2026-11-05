# TOWN-ART-BASE — round 3

## Design

Applied the Scablands town direction in `docs/WASTELAND_WORLD.md` and the
card's Tin Town comparison. The shared module now packs photographic tin and
sand tiles into its 1K atlas, maps atlas cells at a two-metre physical repeat,
and provides seeded `building_variation()` and `varied_roof()` helpers. The
sample recipe uses those helpers to vary roof panel count, colour, height,
slope and clutter across six street buildings. The sheet compares this work
with our own round 2 and the accepted Tin Town reference.

## Image source and prompts

The selected original outputs remain outside the repository:

- Tin: `C:/Users/kyleb/.codex/generated_images/01a1ad6e-43d4-7433-8e9f-43e20e0258d9/exec-d503a008-f319-4f8c-8e2b-9e16908bde89.png`
- Sand: `C:/Users/kyleb/.codex/generated_images/01a1ad6e-43d4-7433-8e9f-43e20e0258d9/exec-d7c1cbbb-f80e-4027-a01a-224d0467927c.png`

Tool: OpenAI built-in `image_gen`, 5 November 2026. The packed tiles are the
only image data added to the sample GLB. The small source crops appear on the
round 3 sheet. Credit is in `public/assets/models/CREDITS.md`.

Tin prompt:

> Use case: photorealistic-natural. Asset type: square seamless tileable photographic albedo texture for a realistic wasteland town in a 3D game. Straight-on close orthographic material photo of corrugated galvanized roof tin with sharply visible parallel ridges spaced 10 cm in life. Sun-bleached warm pale silver zinc, orange rust beneath tiny rivets and overlaps, narrow irregular rust drips down the flutes, sharp scratches showing dark bare steel and dusty lower edge. Rich real material detail at two scales; crisp, specific, not bumpy noise or clay. Bright, even neutral daylight without shadows or glare. Seamless square, edges tile naturally. Edge to edge material only, no roof silhouette, scene, perspective, border, text, logo or labels.

Sand prompt:

> Use case: photorealistic-natural. Asset type: square seamless game material albedo and modeling reference. Create a close, straight-down orthographic photographic view of compacted desert sand over a 2 metre by 2 metre patch. Warm pale ochre and sun-bleached beige grains, naturally wind-brushed fine ripples, subtle broad tonal variation, a few small embedded stones and occasional crisp tire scuffs, no regularly repeating dots. Sharp image-based material with clear grain at true scale, not blurry and not speckled noise. Bright even daylight, no shadows or highlights, no perspective. Seamless tile on all four edges. Texture only, no horizon, dunes, plants, objects, large footprints, text, border, frame or presentation sheet.

## Checks and evidence

- Blender sample build and five-view round 3 render: passed on the final run.
- Sheet: `docs/board/looks/town-art-base/round-3.jpg`, 472,669 bytes (500 KB maximum). It includes above and driver-seat views for both sample buildings, the round 2 comparison, Tin Town, material crops, the six-building street, an 8 m grid, a person and the Stuttgart 959 scale car.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`: pending.
- `npm run build`: pending.
- Browser and in-game look checks were not run; Claude owns them. Claude should compare the tin and sand detail to their photo crops, compare the shack beside round 2 and Tin Town, and confirm roof height, slope, colour and clutter differences across all six buildings.
- No simulation or game logic changed; replay fingerprints were not run.
- No existing test assertion or tolerance changed. The Blender output test registers the sample recipe and treats `town_base.py` as a shared helper, not a standalone generator.
- One intermediate Blender run caught a stale scale-person variable after the scale marker changed. The reference was removed, and the final render and export passed.

## Removed

- Removed the superseded round 1 sheet and review. Kept round 2 for the requested comparison.
- The proof asset `public/assets/models/wasteland/town/sample.glb` remains until `TOWN-ART-HOMES` supplies and passes the first real homes family; that card removes the sample GLB.
- Blender scene files, render captures and material source copies are temporary. They will be removed after the final check; the original generated images remain outside the repository.
