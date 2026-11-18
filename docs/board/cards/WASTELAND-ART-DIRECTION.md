# WASTELAND-ART-DIRECTION

Kyle wants to see how much stronger the Wasteland could look, and is open to changing how its art is made. Use Big Bess and Tin Town's gate at dusk for a small, playable-scale comparison. Big Bess already has a photo-carved Blender recipe, original reference views and an art review. At the gate a player should be able to read the opening, the lamp and an approaching vehicle.

## The comparison

1. Reproduce the current look. Record the exact model, material, lighting, camera, resolution and quality preset. Capture the truck near enough to read the cab and at normal driving distance. Keep the same views for each variant. Trace what the game loads back to the recipe that made it. Start with the Big Bess look sheets, `tools/blender/big-bess-photo.py`, `docs/ASSET_PIPELINE.md` and `docs/ART_LINE.md`.
2. Try one focused change to the asset and its lighting. Possible subjects include the shape of the cab against the sky, the way painted metal and worn rubber catch the same light, or shadows where a wheel meets the ground. Test a surface made from an original generated or painted image for one purpose where it can hold up close. Show where it is applied and how it behaves as the camera moves.
3. Try one treatment using HTML/CSS and an image on the Story Wall, gate interaction or vehicle presentation. Keep text legible and keyboard controls usable. Compare where this adds detail with where the player needs a real 3D silhouette, parallax, movement or a surface that responds to light.

## Evidence and decision

- Supply a labelled comparison sheet of the current and trial views with identical framing. Identify concept images, offline renders and in-engine captures. Include a reproducible recipe, export settings, asset credits and a short note on what the player can see differently at each distance.
- Compare exported bytes, texture dimensions, triangle and material counts. Record any measured frame-time cost with device and conditions. Put in-game and hardware checks still owed in the handover for Claude.
- Recommend which recipe changes should get a production trial and which still need visual review. Keep the variants in the study, off the live asset paths. Claude reviews the look; Kyle can choose a direction before it is applied across the game.

This study has no story dependencies. STORY-PEOPLE owns the character rigs and STORY-TALK owns in-world conversation bubbles.
