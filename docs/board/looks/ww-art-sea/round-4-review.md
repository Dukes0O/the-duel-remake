# WW-ART-SEA round 4

The sheet is 1536 × 1400 px and 235,617 bytes. Each row is the reference photo, the exported-GLB render at the same panel size, then a car-height three-quarter render. All renders came from the exported GLB imported into an empty Blender scene with Standard view transform.

Rows: gate shut, gate open, harbour ramp, causeway arch. The open-gate row reuses the single closed-gate reference photo because the source set has no open-gate photograph; it shows the same photographed steel leaves and stone frame beside the open render.

## Look check

- Gate shut: yes. The rusted leaves and heavy stone frame read as a real harbour gate at this distance.
- Gate open: yes, with a caveat. Both leaves are visible at their outer hinges and stand inward against the sides; the simple barrel hinges could use more close-up detail.
- Harbour ramp: mostly. The cobbled slope and flanking masonry read as a real slipway, though the low car-height angle compresses the slope and the walls look cleanly modular.
- Causeway arch: not yet. The daylight opening, dark barrel and aligned rails are present, but the isolated three-quarter view still reads as a photo-textured model piece rather than a convincing built arch joined into the causeway.

## Export readback

- 20,556 triangles across scene nodes; 9,996 triangles across unique meshes.
- 2,181,244 bytes; 44 nodes and 19 meshes.
- `tools/test-blender-output.mjs`: passed, 308 checks, 0 failed.
- `tools/test-repo-hygiene.mjs`: passed placement. Size targets remain advisory.

## Claude should review

- Whether the gate coping now matches the harbour wall coping in height and stone scale.
- Whether the 90-degree open leaves and the 16 m ramp read clearly from the supplied views.
- Whether the raised arch opening and its side joins are acceptable; the arch look is the known weak point in this round.
