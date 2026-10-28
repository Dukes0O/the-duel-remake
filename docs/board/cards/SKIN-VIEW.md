# SKIN-VIEW

Draw skins: palettes, camouflage, the logo, gear models, grime, the heat camera inset and the nose camera view.

Owner: Claude (UI). Design: `docs/HELI_WILDLIFE.md` (the H3 Wildlife and skins packet). The
board entry holds state, needs and locks.

Packet sections 5, 6, 7 and 12. Files: `src/heli/heli-skin-view.js` (new),
`src/heli/heli-scene.js`, `src/heli/heli-ui.js`, `src/heli/heli-ui.css`.
Drawing only. Frame check (rule 8) over a count square.

## Claude note (15 October): side gear turns half a turn

Kestrel One's mounts (SKIN-ART-GEAR part 2) sit on the hull with no
rotation. The side-right gear (the RESCUE-PROPS winch) is built with its arm
along +X, so at `mount_side_right` it must be turned half a turn about the
vertical axis (arm reaching outward). The nose and belly gear fit as built.


## From SKIN-HOOKS (Claude, 16 October)

`src/render3d.js` and `src/heli/heli-scene.js` (about line 161) must pass the worn skin's `gear` to `heliCameraPose` so the TV skin's nose camera view draws (the session already offers `cameraCount`). Needs busy-game-files.
