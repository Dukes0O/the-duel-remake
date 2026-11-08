# TOWN-ART-PLANTS — batch plant — round 7

Four separate reference photographs were generated with OpenAI image generation
on 7 November 2026. They show an original fictional plant with no third-party
images, brands or marks. The JPGs in `textures/` are each 1024 pixels wide or
less. The front and rear references leave the separately lathed silo out of
the tower's wall view; the full model places the silo in front as shown in the
side and overhead references.

- `batch-plant-side.jpg`: full long side, including the lathed silo.
- `batch-plant-front.jpg`: clean tower and aggregate-bin end view.
- `batch-plant-rear.jpg`: clean opposite tower and aggregate-bin end view.
- `batch-plant-top.jpg`: straight-down plant plan.

## Look scores

| Likeness | Readability | Grounding | Consistency |
|---:|---:|---:|---:|
| 3/4 | 3/4 | 3/4 | 3/4 |

The side and top comparisons line up after correcting the top-photo station
range and reversing the side review camera. The tower's open bay reads from
the three-quarter views, with the separate chute above it. The front and rear
photos omit the separate silo, so those comparisons differ from the full model.
The chute is narrow at this scale. Claude should judge its visibility, the
end-view match, and whether the opening reads as a truck passage.

The sheet shows each photo beside its model view, then road and rear
three-quarter views and the mayor's view. All renders use the exported GLB on
plain grey ground under even studio light.
