# Big Bess at Tin Town's south gate

The six pictures in `round-1.jpg` use the same truck and gate on each side. The small change to the glass shows up beside the cab. From the approach road the lamp and the surface beneath the tyres give the driver more to read. These are offline Blender renders. The earlier in-game control is the November 11 sheet in `docs/board/looks/big-bess/`.

## The three comparisons

- **Approach road.** The camera is 1.6 m high, about 22.4 m from the truck along the ground, at a 55° vertical field of view. The truck occupies roughly 110 × 85 pixels of the 1,024 × 576 road frame and fits inside the opening on both sides. In the trial a warm pool under the centre lamp and two broken impressions through the grit give the road depth up to the gate. A first draft made the tracks continuous and straight enough to look like rails. Breaking up the impressions helped. The windshield and tyre rubber are too small here to judge their finish.
- **Parked by the cab.** At about 13.2 m the original photo already resolves rivets, seams and tread. The trial changes how the windshield and a few painted panels catch the same light. The truck's outline, tyre clearance and wheel pivots are shared by both images.
- **Grazing view.** Lighting and road are identical. At this angle one pane picks up a bright strip from the sky while the paint below stays rough. The baked dust and windscreen wipers still appear on their photo planes. The other pane can read as opaque. Turn the live camera past the truck before committing the masks to the export recipe.

## Cost and origin

| Asset | As built | Trial |
| --- | --- | --- |
| Big Bess GLB | 1,181,188 bytes | 1,187,112 bytes |
| Truck meshes / glTF primitives / triangles / materials | 10 / 21 / 10,764 / 6 | Same buffers, pivots, UVs and counts |
| Body maps | Five embedded JPEG images. Side 1,400 × 700 twice, front and rear 820 × 749, top 443 × 886 | Two added packed PNG maps. Side 350 × 175 and front 205 × 187 |
| Gate | 20 meshes, 3,148 triangles, eight materials in the gate factory | Same geometry and material count |
| Road and lamp | Gravel photo, profile light and three emissive meshes | Offline test adds one 512 × 512 road mask (37,806 bytes) and a warm point light under the centre lamp |

The truck is `public/assets/models/wasteland/scablands/big-bess.glb`, exported by `tools/blender/big-bess-photo.py` and loaded by `src/world/scablands-scene.js`. The photo-backed materials store 0.90 roughness. The trial paints the two material maps into their original UV coordinates, leaves the tyre areas matte and applies the game's 0.84 body tint in both renders. The new bytes include both maps and the glTF metadata. The source's first five images and all its geometry bytes were verified identical. An in-game run must measure the cost of sampling these maps.

The Node stage exports `createTinTownGate` and `createTinTownShacks` from the game. The stage uses the existing central Tin Town GLB, the Scablands Gravel Road textures and the existing Zwartkops Curve Sunset HDR. Credits for the four original vehicle views are in `public/assets/models/wasteland/scablands/textures/CREDITS.md`. The road and HDR credits are in `public/assets/textures/CREDITS.md`. The road impressions, study lighting and physical-material masks are original work for this card.

## Reproduce the comparison

Run these commands from the repository root with its locked Node dependencies, Python with Pillow and NumPy, and Blender with Pillow available.

```sh
out=.evidence/2026-11-18/wasteland-art-direction
node tools/art/wasteland-direction/stage.mjs "$out"
python tools/art/wasteland-direction/paint.py "$out"
blender -b -t 4 --python-exit-code 1 --python tools/art/wasteland-direction/render.py -- "$out"
python tools/art/wasteland-direction/sheets.py "$out" docs/board/looks/wasteland-art-direction
```

This run used Blender 4.3.2, CPU Cycles, an AgX view transform, a fixed seed, up to 140 samples and 1,024 × 576 output per view. Both sides use the same HDR fill, warm low sun and broad cool sky fill. The road camera uses a 19.45 mm lens on the horizontal 36 mm sensor at 16:9. The 41 mm cab view and 45 mm grazing view isolate the close finish. The recipes include the exact camera transforms, exposures, map channels and lamp settings.

The stage approximates the evening light, sign canvas and road. It omits the WebGL-specific wear and atmospheric shaders, live vehicle movement, wheel dust and the in-game 4.4 × 10.5 m shade under Big Bess. Blender supplies contact shadows here. Performance, High and frame time await the laptop trial.

## Production trial

Try the road treatment first on a short stretch beside the gate. The game already draws paired ruts and a berm in `src/world/scablands-ground-look.js`, a track mask in `src/world/scablands-tracks.js` and Big Bess's contact shade in `src/world/scablands-scene.js`. Start with those existing surfaces and one low-cost lamp footprint. Compare a moving approach with and without it on the laptop. Follow with the front-glass mask if players will be close enough to see the reflection travel. The silhouette of the tank crown and the visible wheel arrangement are mesh work for a later pass.

The cloud art reviewer inspected the glass and the matched approach and reproduced the stage GLB, truck GLB, road mask, review sheets and portable HTML byte for byte from the captured inputs. Claude still owns the moving in-game look and the hardware judgement. Check the gate at dusk on Performance and High, the tyres while turning and the legibility of the opening with other vehicles present. Take any frame measurement only when the production trial reaches its performance gate.
