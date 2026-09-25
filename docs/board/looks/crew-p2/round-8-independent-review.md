# Round 8 independent Rook review

I reviewed the immutable `round-8.jpg` comparison and the private `round-8-retry-1` High and Performance idle front/side/back, aim, and get-up views. The retry contains 44 captures and reports no browser issues. This is a development candidate, not a runtime promotion.

| Axis | Score | Evidence |
| --- | ---: | --- |
| Reference likeness | 3/5 | The corrected crown and rear outline are closer to the reference, and the patterned clothes read better than clay. The hair remains a broad cap with short horizontal rear locks; the vest still reads as flat vertical panels, and trousers and boots remain simplified compared with the reference. The new fingertip geometry is too small to separate the hands visibly at this game scale. |
| Readability | 3/5 | Vest, shirt, scarf, trousers and boots separate by color, but scarf layers, finger tips and cloth folds are weak in the game views. |
| Grounding | 3/5 | Idle feet sit on the ground and the get-up action remains coherent. The aim front still shows a dark horizontal opening or narrow dark core between vest hem and trousers; it needs a closer game view to distinguish coverage from shadow. |
| Scene consistency | 3/5 | High and Performance show the same character, cloth palette and action shapes. The side get-up view retains a thin straight upper-back line; prior controlled variants showed the longer line belongs to straps, while the short free part belongs to rear scarf. The new contact test passes, but the visible line is not fully gone. |
| Frame cost | Unmeasured | Forty-four visual captures do not measure the four-character frame budget. |

The structural tests establish meaningful progress: the native hair and visible trouser contours, four-view scalp area, face UV spacing, arm/waist seams, finger skinning and rear-scarf contact pass. The actual images do not reach the required likeness 4 in either quality. Keep this as a reviewed trial and judge any next method against the same reference and action poses.

The Blender far mesh emits a validity warning after decimation. The GLB has 1,834 far triangles while the manifest reports 1,850. The exported far triangles have valid indices, finite positions and UVs, nondegenerate areas, normalized skin weights and no duplicate index faces, but the 16-triangle count loss is a real export mismatch. Validate the far mesh before recording/exporting its count and check the final GLB count against the manifest. The near GLB count matches 7,938.
