# Sea wreck — round 1, 25 October 2026

One art round, for Claude's look verdict. `round-1.jpg` is 344,088 bytes.
Five paired studio views show Sea wreck beside the current restored body:
front three-quarter, left side, rear three-quarter, above and nose detail.
The bottom row shows the unchanged SIRENA-ART raised wreck as a reference.
The sheet is rendered from the exported GLBs, including the runtime variant.

The existing drivable Sirena supplies every car panel and all four articulated
wheels. Faded red, a worn cream stripe and the door 7 survive under warm rust
and grey-green sediment. Hollow barnacles gather in uneven clusters; small
fluted shells and narrow dried weed break up the sills and bumper edges.
The shell palette follows the raised wreck. No downloaded art or new licence.

37,692 source triangles + 9,222 crust = **46,914 triangles**. Crust adds 24.47%,
below both the source-relative 30% limit (11,307) and the card's full cap
(95,680). The driver is omitted from both studio variants and the runtime
asset; the later loader supplies the game's driver. The GLB is 5,574,032 bytes,
with five embedded JPEG textures and four separate steer/spin pairs.

No race frame: this card does not install finish selection. LAB-RESTORE-2
owns that hook. No frame timing applies to this uninstalled art round.
The raised wreck's missing panels and sand remain exclusive to its scenery
model; this card adapts the complete drivable car as specified on the card.

Rebuild from the repository root:

```powershell
node tools/blender/sirena-wreck-source.mjs
& 'C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe' -b -t 4 --factory-startup --python tools/blender/sirena-wreck.py -- --render
python tools/blender/sirena-wreck.py --sheet-only
```

Camera framing and an imported material's alpha link were corrected before
assembling this sheet. There is one submitted art round. Independent recipe
review found the alpha fault; the fix was confirmed and the final export's
alpha, texture, hierarchy and triangle assertions passed. This code review
does not replace Claude's art verdict, which remains pending.

## Removed

No existing model replaced. Rebuildable source GLBs, loose texture images,
individual renders and build output are scratch, not committed assets.
