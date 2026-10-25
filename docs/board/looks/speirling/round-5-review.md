# Speirling final: selected try 04

Claude selected 04-rear-tunnels. Before modelling: retain its dimensions,
canopy, shoulder surfaces and rear details. Close the rear engine bay with
a painted loft tapering into the rear spine. Keep a thin fin above that cover
and preserve the two outboard rear tunnels. Shorten the wheel-arch cutters
so they cannot break through the front channels; keep the wide low W intake
and emissive white corner strips.

Export contract: public/assets/models/unlocks/mcmurtry_speirling.glb,
matching the unlock folder and config-key filename convention. Metres,
glTF +Y up / +Z forward, ground-centred origin. Four separate hub-origin
wheel meshes; static geometry grouped by material. Seven shared materials:
body, black, glass, red lamps, white lamps, rubber and alloy. No game wiring.

## Checks

Five fixed-camera renders and the 93,291-byte sheet were reviewed. The front
scoops are closed; the nose is one low W mouth with emissive outer strips.
The painted rear cover closes the bay, leaving tunnels beside the spine.
The selected canopy, fenders, wing mounts, lamps, grilles and diffuser remain.

GLB: **40,601 triangles; 1,118,608 bytes; seven materials; 18 primitives**.
Three.js GLTFLoader loaded it successfully. Measured runtime bounds:
1.610 m wide, 1.142 m high including wing, 3.204 m long; ground at Y=0.
All four wheel nodes exist with hub-centred origins and front wheels toward
+Z. Glass uses alpha with zero transmission to avoid an extra transmission
render pass. No textures, cameras, lights or studio geometry are exported.
Under the 50,000-triangle requirement and 8 MB runtime-file target.

`npm.cmd run build`: **PASS**, 2.61 s, existing chunk-size and mixed-import
warnings. Used npm.cmd because PowerShell blocks npm.ps1; Vite required
sandbox access to its integration-linked node_modules temporary directory.

Sheet renamed to `round-5.jpg` for the repository round-name rule.
No runtime source, manifest, player saves or live files changed.

## Removed

The four-study recipe is replaced by the selected final recipe. The old
comparison sheet and note are recycled; Git retains their history.
Superseded local study exports/renders, final raw renders, build output and
temporary logs are recycled after their results are recorded here.

Claude: accepted (Codex Blender pass, try 04 with the closed engine cover); Kyle supplied the reference photos.
