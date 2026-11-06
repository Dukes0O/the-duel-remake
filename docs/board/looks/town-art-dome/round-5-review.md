# TOWN-ART-DOME, round 5 review

## Self review

The exported GLB now uses one `UVMap` layer for each joined building mesh. All 41 exported primitives have only `TEXCOORD_0`; their UV values span a range. The wall photo repeats 12.5 times around the roughly 560 m oval perimeter, about 45 m per strip. The source shows about ten cars across each row, so a pictured car is about 4.5 m long.

The upper wall stacks stay in the crushed-car photograph. One grounded row of real hulks adds relief at the base; unsupported floating hulks are gone. The Heap and dirt picture remain. The three floodlight masts are thicker, and the rim rails use fewer, thicker segments.

Both buses are 2.5 m wide, 4.4 m high and 11 m long. Their fronts and two-deck sides use separate photo crops. From the road the full SCRAPDOME word is readable. Scaffold, torn tarps and bunting sit above the buses. A plain mid-grey-brown ground plane reaches the review camera and is added after GLB import, so it is not part of the model.

The sheet compares the generated gate photo with the same exported road view, then shows the mayor view and outside wall at 40 m. The new reference was generated with Codex ImageGen on 6 November 2026; the original remains outside the repository and only its crop appears on the sheet. Prompt summary: realistic daylight Scrapdome entrance with horizontal double-decker bus gate piers, a readable hand-painted sign, scaffold, torn tarps, bunting, dirt road and Heap visible through the opening.

## Export

Rendered from `dome.glb` re-imported into an empty Blender scene. The GLB is 1,550,172 bytes, under 3 MB. Its 14 embedded pictures are separate JPEG materials, not an atlas. Metallic factors remain at or below 0.3. The JPG sheet is 313,955 bytes, under 500 KB.

## Claude look review

Please check the road view against the photo for bus scale and proportions, sign placement, and whether the Heap reads through the opening. Check that the photographed wall stack and single grounded relief row read as a continuous supported wall from 40 m, and that the Heap and dirt ring look right from above. Browser and in-game checks remain with Claude.
