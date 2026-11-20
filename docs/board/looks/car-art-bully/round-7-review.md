# CAR-ART-BULLY, round 7 (Claude, 19 November 2026)

Rounds 1 to 6 were Codex's of 5 November, built from boxes and tiled swatches. They were never merged (branch
`codex/car-art-bully`) and read as a toy. Round 7 starts again by the art line's method: eleven generated pictures of
one fictional bus, the body carved from the four dead-on views with `carve_object`, and the wheels, plough, push arms,
headlamps and stop paddle built as their own pieces from their own pictures. [round-7.jpg](round-7.jpg) shows the
exported `bully.glb`, imported into an empty scene, beside the pictures.

The reference pictures are generated, not photographs of a real bus. No outside photograph was used.

## Verdict: passes the look on paper. Not yet seen in the game.

| Point | Score | Why |
| --- | --- | --- |
| Proportions against the references | 4.5 of 5 | Body 5.40 m by 2.18 m by 2.85 m, tyres 1.05 m; side, front and rear outlines lie on their pictures. The bonnet and wings are plainer in plan than the reference. |
| Surfaces | 4.5 of 5 | Every face wears a picture: chalky yellow under rust, welded plate, mesh, rub rails, lamps. No flat-coloured part. |
| Gritty, never toy-like | passes | It reads as a welded working vehicle from every view on the sheet, the close view included. |
| "A child should laugh and then want it" | passes | The painted grin on the plough and the stop paddle carry it; from the chase camera it is plainly a school bus. |

## What is still different from the reference

- The reference's plough hangs on a tall A-frame from the bumper. The model's blade sits 0.12 m ahead of the bumper on
  two low push arms traced from the plough's own side picture, so little of the hitch shows.
- The front wings are shells with flat tops, and the nose is squarer from above than the reference's.
- The model is a little browner than the outdoor reference in the three-quarter views. Part of that is the review light.
- The mesh over the windows is painted on flat faces, not raised. It holds at the distances on the sheet.
- Both sides wear the same picture, so the entry door is on both sides. The paddle is on the left only.

## Not done

- **Not loaded in the game.** The card forbids Chrome. The art line says a piece nobody has loaded in the game is not
  checked: CAR-DRIVE-WASTE loads it, and its look in the game's own light is judged then.
- No handling, no game code, no damage shapes: the card is the model only.

## For the card that makes it drivable

Root `bully`, +Z forward, +Y up, metres, origin on the ground at the middle of the whole length. Its extras give
`size_m` 2.56 by 5.821 by 2.863 (plough included; the body alone is `body_m`), `wheel_radius_m` 0.526, `wheelbase_m`
3.397, `track_m` 1.915 and the four socket adjustments (`frontY` 0.58, `roofLift` 0.10, `roofZ` -0.55, `shieldLift`
0.20) that give the eight `vehicle-socket-*` nodes by the layout in `src/vehicle-sockets.js`. Wheels are
`bully wheel front-left`, `front-right`, `rear-left`, `rear-right`, each with its origin on its hub. `bully stop-paddle`
turns about its hinge; `bully headlamp left` and `right` are their own nodes for a later glow. 21,036 triangles,
3.74 MB.
