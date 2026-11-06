# WW-ART-WHITES round 1

## Codex visual check

The heap now uses its generated side photo as a measured silhouette and a single planar projection on the front. The rear outline tapers in height and width; its back and cut edges use the cracked-salt surface. The source frame is 18 m wide, which gives the heap about 14 m of width. The side render is orthographic at the photo's 3:1 aspect ratio and is rebuilt from the exported GLB in an empty Blender scene.

The matching side view keeps the broad, low shoulders and uneven crest. The quarter view reads as a thick photo-faced relief. Its depth and cut edge need Claude's look judgment before this model can count as a finished piece.

The current export has 16,482 triangles and is 1,156,284 bytes. It stays within the 60,000-triangle and 5 MB card limits. The GLB uses only `TEXCOORD_0`; the output check reads every primitive and confirms both UV axes cover a range. Materials stay at or below 0.3 metallic.

## Claude look check

- Compare the generated profile photo with the exported side view for shoulder shape, crest height and the salt plain at the base.
- Decide whether the quarter view has enough rounded depth or still reads too much like a photo relief.
- Check that the projected front photo and cracked-salt cut edges belong together at game scale.

No in-game or frame check was run. This card does not wire the model into the game.
