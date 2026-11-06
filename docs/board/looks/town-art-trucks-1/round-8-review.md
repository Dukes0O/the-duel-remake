# TOWN-ART-TRUCKS-1, round 8

## Builder review

The fire truck uses the round 7 measured photos from the committed texture folder. I rebuilt the side as one full-width extrusion, moved the wheels inward to match the front photo, scaled the wheel-face UVs inside the tyre edge, and retained the roof ladder, hose reels, and the `fire-truck:cannon` pivot. The export recipe renders views only after importing the GLB into an empty scene. The sheet uses one even area light and a mid-grey ground.

This is not a pass. The direct side view still shows the wheel centers and body outline out of place. The front and rear views show wheels separated from the fenders, while the three-quarter views expose overlapping photo projections, disconnected roof surfaces, and visible white patches. The mayor view shows a loose wheel. The side shell now has a continuous closed extrusion, but the other photo surfaces still do not meet cleanly. Do not start the other trucks from this result.

The exported family is 3,878,000 bytes. Fire truck: 6,683 triangles. Water tanker: 11,173; supply truck: 9,119; tow rig: 8,973. Each is under 12,000 triangles and the family is under 8 MB. The review sheet is 209,561 bytes. All four fire-engine source photos are now in `public/assets/models/wasteland/town/textures/` and the recipe loads them from there.

## Claude should review

- Compare the four direct views with their photos in `round-8.jpg`.
- Judge wheel position, the closed shell, roof surfaces, and white patches in both three-quarter views.
- Check the 60 m mayor view and 20 m driver view.
- Verify the cannon pivot turns, and review the imported GLB UV sets and material metallic values.
- Decide the next correction before another round; this sheet records a failed attempt, not a pass.
