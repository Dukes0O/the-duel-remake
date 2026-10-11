# P4-KITS round 2: review packet

Verdict pending the art reviewer. These sheets record the frozen candidate;
they do not award a look score or an overall walking pass.

Asset and native candidate: `922d8b881a775c073098176fa7569ad66bfcab39`.
Manifest SHA-256: `11a44756e91c2792b062e23fc433a668fe6522b1b788f38c038a6cf4424529b0`.
The manifest and all 70 GLB hashes remain exact. Five groups use the original
922d8b88 render recipe. Forest uses that recipe plus the approved source-tree
importer opacity repair below; its actual recipe SHA-256 is
`ef33313373c481a5a30179a3c7f41bd66b3e908763a2a4283e1d48b9ebcc3872`.
That recipe hash remained exact through the forest rerender. All source and
adapted Blender frames were rendered with two threads.
Sheets use the matched native-922d8b88 capture, full frames, no crop, sharpening,
repainting or relighting. The character sheet includes actual 2.8 m Yeti night
roar and departure at 30 m in both qualities.

| Sheet | Bytes |
| --- | ---: |
| [Paddock](paddock/round-2.jpg) | 302,772 |
| [Safety](safety/round-2.jpg) | 302,564 |
| [Harbour](harbour/round-2.jpg) | 309,316 |
| [Forest](forest/round-2.jpg) | 309,572 |
| [Snow](snow/round-2.jpg) | 309,797 |
| [Characters](characters/round-2.jpg) | 482,718 |

The unchanged focused 35-pair check passes, including actual skin/clip checks,
cover/debris rays and lamp counts/sizes. Bank probes: 371 hits, zero error.
Native functional capture passes on private port 28607 with memory-only saves:
40 PNGs, zero issues and four expected duplicate-Three warnings. Frame pacing
was not measured. All original 19 passed records/38 GLBs and the complete
catalog/tanker source pin remain exact. The final gantry-only change preserves
the other 34 records/68 GLBs and exact frame/lamp/housing geometry. All four
panel-relative approach rays now hit the matching glyph before the beam.

## Character motion: separate findings

- Direction: measured root travel and away projection are 2.40000035 m; final
  heading points away. Both qualities use the actual 10.0333 s exported clip.
- Fixed stance: authored stance intervals exclude one 30 Hz frame at each
  swing boundary. Terrain heights do not select the intervals. Maximum fixed
  toe planar movement is 0.000941 m High / 0.000936 m Performance. Maximum
  fixed heel movement is 0.014848 m / 0.008347 m, largest during the turn;
  departure heel movement stays below 0.009 m. The earlier half-metre toe
  skating is absent in these measured stance samples.
- Flat-ground solve: source weighted-anchor height error is at most 0.000189 m;
  whole-sole minimum is -0.013261 m. This is distinct from the native terrain.
- Native terrain contact remains unresolved: whole-sole minimum is -0.039495 m
  High / -0.038204 m Performance across ground ranges of 0.041014 m / 0.040094 m.
  No sample has both soles more than 3 cm above the ground. No overall native
  walking pass is claimed, and the actor/terrain was not moved to conceal it.
- The four original animation tracks, weights, joints and topology are exact.
  Strict geometry/bind signatures still FAIL due to measured exporter rounding:
  POSITION at most 2.3841858e-7 m, inverse bind at most 1.1920929e-7, rest-node
  translation at most 1.19209293e-7. The Director accepted these measured deltas
  for native review. No comparison tolerance or assertion was weakened.

Raw evidence is under `.evidence/2026-10-10/P4-KITS/round-2/`, including
`native-922d8b88/{report.json,p4-kits.json,gait-metrics.json,strict-stance.json}`,
`render-922d8b88-provenance.json`, the preserved gantry before/after rays and
protected hashes. It will be removed after its verdict is recorded.

## Removed

This round replaces the held prepared assets and their recipe paths in place.
No duplicate runtime versions or abandoned fallback walking clips were added.
Round 1 sheets remain the one comparison per prior formal round; raw review
captures remain ignored evidence and are not committed.

## Source-panel importer correction (plan before code)

The first forest source render hid all three original tree copies. The probe
confirmed their placement and visibility were correct. The FBX importer set
Principled shader Alpha to 0 while each material's diffuse alpha stayed 1.
The approved render-only correction restores shader Alpha from diffuse alpha
only for these three original-source tree copies, after checking those exact
values and an unlinked alpha input. Original RGB colors, geometry, placement,
camera and lights stay unchanged. This is an explicit FBX importer opacity
repair before rendering, not a pixel repaint. Runtime assets remain frozen.

The corrected forest render now shows all three original donor copies. The
same source RGB colors and meshes remain visible in their original locations.
Only the forest sheet was regenerated (309,572 bytes). The other five sheets,
native capture, manifest and all 70 runtime GLBs remain unchanged. Guarded
correction log: three unique materials for each of the three source copies.
