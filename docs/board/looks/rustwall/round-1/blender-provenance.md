# Rustwall Blender round 1

Built with Blender 4.5.13 LTS from `tools/blender/rustwall.py` after the independent red handoff `ca7234c`. The manifest records exact source, reference, GLB and render hashes, camera poses, dimensions and per-mesh counts.

Command: `blender -b --python-exit-code 1 --python tools/blender/rustwall.py -- --root . --round 1`.

The final complete build/export/six-render run took 31.72 seconds. An initial internal build exceeded the triangle budget; buried rear wheels and small rivet cap geometry were reduced. A subsequent structural check found a lowest plate 12 cm below the footing; plate extents were clamped before the frozen round. These internal corrections are not additional fidelity rounds.

## Actual geometry

- Wall core: 420 m wide, 35 m tall. The wall has 57,632 triangles and 13 material draws, including eight 1.8 m guard meshes. Towers and cranes rise above the core.
- Opening: actual empty 9 by 7 m passage. The separate panel lifts 7.25 m in front of the header and clears the passage. Torches are separate from human bounds.
- Wash: one baked identity mesh, 144 triangles, one draw after instancing. At the runtime probe's 179 banks it uses 25,776 triangles. All vertices stay inside the declared collision box.
- Three 1024-square wall material sets and one 1024-square rock set. Color, roughness/metalness and normal maps are authored with deterministic padded material islands. The detail set adds a localized emissive map for flames and lamp faces.

The generated reference is unchanged. Its lower-left architecture, lower-right depth and top atmosphere inform this metric model; generated people were not used to set dimensions. The wash has no matching close-up in that reference, so its isolated view is explicitly labeled a geometry inspection. The browser scenario provides the separate real-course context.

## Checks and limits

`node tools/test-rustwall-assets.mjs`: 8/8 passing on the final assets. No assertion changed. Front, open gate, full span and wash views were inspected. The wash camera moved back to show the full 19 m sample, with the exact revised pose in the manifest.

This is the first measured art round, not visual acceptance. Even shelf spacing, broad rust speckle, simple cloth hems and simplified crushed-car shapes remain visible. Actual game captures, independent scores and frame cost follow this freeze. No live folder, live port or saves were touched.
