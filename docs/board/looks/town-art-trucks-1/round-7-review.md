# TOWN-ART-TRUCKS-1, round 7

## Builder review

This round replaces only `fire-truck` with a model measured from four generated photos using `tools/blender/photo_model.py`. The four source photos are in `.evidence/town-art-trucks-1/`. I used the Photo.sky masks and imported-GLB renders to make and judge the sheet; temporary masks and render captures are removed after review. The model keeps the fire-engine photos in `TEXCOORD_0`, with a dark-glass cab, round photo-derived wheels, axles, hose reels, headlights, roof ladder and a separate `fire-truck:cannon` pivot.

The direct side, front, rear and overhead views read as the intended truck. The side and top slabs still show their cutout construction in three-quarter views, the wheel centers render too pale, and several pieces appear to float. I do not judge this as a pass. I did not start the tanker, supply truck or tow rig; their previous models remain in the family. Claude should judge the direct comparisons, the eight imported-GLB views and whether this method is worth continuing.

The family GLB is 3,999,832 bytes (about 3.81 MiB), within the 8 MB task budget. Truck triangle counts are: fire engine 8,107; water tanker 11,173; supply truck 9,119; tow rig 8,973. Each remains under 12,000. The round 7 sheet is 155,819 bytes, below 500 KB.

Photo prompts and image credits are in `public/assets/models/wasteland/town/textures/CREDITS.md`. Source photos are JPEGs under `.evidence/town-art-trucks-1/`.

## Claude should review

- Compare the side, front, rear and overhead photo/model pairs in `round-7.jpg`.
- Check the wheel centering, shell gaps, roof ladder, hose reels and cannon pivot.
- Judge the two three-quarter views, mayor-height view and driver-height view at 20 m.
- Decide whether this fire truck passes before the other three are rebuilt.
