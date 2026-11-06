# TOWN-ART-WALKERS — round 2 review

## Scores

- Human silhouette against the reference: **2/5**. The donor source gives real human proportions, but the low triangle target leaves angular head and neck transitions. One donor pose also keeps a raised arm.
- Clothing and materials: **3/5**. The coat uses the accepted photo crop and the Vane mark is visible. Some source clothing still reads as flat donor material, and the coat shell is too smooth and broad beside the photograph.
- Identity and town-distance readability: **2/5**. All thirteen IDs export, and the kids are shorter with larger heads. The figures still look like repeated rescue people; outfit differences need more work.
- Render and comparison: **4/5**. The sheet uses the exported GLB reimported into an empty scene, a matched three-quarter view, labeled family row and 40-person crowd. Even overcast light and the mid-tone ground are clear.

## Result

**Fail; continue for round 3.** Reusing the licensed human body removed the rectangular box construction from round 1, but this is not yet a believable settlement crowd. The model needs cleaner joined head and shoulder transitions, a neutral standing pose, more distinct silhouettes, and better fitted clothing. Do not treat this round as final art.

## Source and build

- Donor: Quaternius Universal Base Characters, Standard, CC0 1.0; existing `hiker-standing.glb` and `driver-standing.glb` from the rescue people.
- Thinned with Blender Decimate to a 220-triangle donor target before outfit details; exported figures range 266–435 triangles each.
- Thirteen per-outfit 256 px JPEGs are derived from a crop of the previously accepted photo reference. Prompts and credit are beside the textures.
- Exported file size: 583,956 bytes.
- Photo reference and texture crop are retained as small crops; the original source photo remains external.

## Claude should inspect

- `walker-a` against the photo at the same three-quarter size.
- All thirteen labels and silhouettes in the family row, with special attention to kids, the guard, trader pack and Vane mark.
- Whether the 40-person crowd reads acceptably from mayor height.
- The angular face and neck transition, raised donor arm, and broad coat shell; these are known remaining faults.
