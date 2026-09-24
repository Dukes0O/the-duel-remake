# GFX-01: crew runtime and fidelity evidence

## Runtime scope

- Load the selected crew GLB once per crew ID. Prepare independent skeletons and actions when each asset resolves. A fixed pool supports 12 visible fighters, with shared geometry/materials and one selected LOD per fighter.
- Select poses from simulation time and snapshots. Successful RPG shots record lastFireAt; no rejected input starts recoil. Knockdown duration comes from the fighter or the raider tuning, never an assumed three seconds. Recovery, successful entry and exit record short visual events without changing gameplay timing.
- Pass the existing render camera into the combat scene for distance-based LOD. Primitive fallbacks remain per missing crew; first-person body hiding and late-load cleanup remain active.
- Matched round captures use private memory-only QA. Compositor checks asset/image hashes, exact cameras, pose/time and source crop bounds; completed round manifests and sheets cannot be overwritten.

## Focused checks so far

- Fighter presentation: 10/10.
- Retained GFX-00 asset/runtime controls: 14/14.
- On-foot movement: 9/9; transition: 8/8; weapons: 5/5. Existing assertions unchanged.
- Crew asset/runtime acceptance: 22/22 once first authored assets were available (Blender worker run).

## Reviewed assertion correction

Independent test author corrected the synthetic draw-call helper in cd9faab. A BoxGeometry has six face groups, but Three renders it once when its material is a single material. The helper had counted those unused groups as six draws. Material-array GLBs still count their actual groups, and the two-primitives-per-LOD and 24-draw limits remain unchanged.

## Evidence and remaining work

Round 1 capture/review is in progress. No beta promotion, broad lane gate or release claim yet. GFX-00 browser control now substitutes only crew GLB requests with the retained test fighter, preserving its original single-skin assertions; historical evidence remains untouched.

## Round 1 browser evidence

- Private port 51989, memory-only saves. 70 retained PNGs: 24 matched crew views per quality and 11 representative action poses per quality. No warnings or errors.
- Both qualities: 12 visible near fighters, 12 independent skeletons, 12 color draw calls, 61,044 triangles. Moving raiders 65 m away selected eleven far LODs while the local fighter stayed near. First-person eye hiding and outside visibility passed.
- CPU submission sample, 40 warmed frames: High median 2.7 ms / p95 3.0 ms; Performance median 1.5 ms / p95 2.0 ms. This includes production update plus an extra isolated color render; it is not a GPU frame-time claim.
- Contact sheet: docs/board/looks/crew/round-1.png. Its manifest validates exact Blender/game cameras, idle clip/time/yaw, all eight asset hashes, reference crops and input image hashes. Raw game frames, captures.json and private browser report are retained in the round-1 folder.
- Initial harness probe compared two disposable storage wrappers by identity and failed before capture; corrected it to verify the installed own-property memory store and QA tab namespace. The successful run used no physical player saves.

## Reviewed runtime timing fixes

Independent red tests in 08c747d reproduced six failures across four findings. Jump now derives its authored clip fraction from simulation vertical velocity and the configured flight arc. Bounded get-up, enter and exit events map their elapsed fraction to the full authored clip duration. Recovery timestamps use the fixed fighter substep boundary after accounting for the accumulator remainder. Each prepared figure reuses its selector result, pose and clock; the event clip set and empty inputs are constants.

Focused verification: selector 12/12, crew 26/26, retained rig 14/14 and transition 8/8. Existing gameplay assertions and timing are unchanged; no save fields or progression changes.

The original GFX-00 injected browser control also passed after the timing fixes: private port 27634, 18 captures, zero warnings/errors. Fresh relocated evidence is in docs/board/looks/crew/gfx00-control; original test-fighter evidence remains unchanged.

## Round 2 browser evidence

Frozen authored assets: 53e32ee. Private port 31663, memory-only saves; 76 PNGs and two short WebM motion clips, zero warnings/errors. Wider jump framing keeps the entire body visible; side knockdown/get-up views expose contact with the ground. R1 evidence remains untouched.

Both quality modes use 12 color draws for 12 prepared figures, 65,716 near triangles, independent skeletons, correct first-person hiding, and eleven far raiders with one near local body in the distance check.

Real-course full-render RAF samples at 1280x720 (120 frames per condition):

| Quality | One-fighter baseline p95 | Twelve-fighter p95 | Frames over 33 ms |
| --- | --- | --- | --- |
| High | 18.2 ms | 18.2 ms | 0 |
| Performance | 18.2 ms | 18.1 ms | 0 |

These are one controlled headless-browser sample per quality, including the real scene, compositor and shadows. The crowd uses staged walking snapshots moving at 4.5 m/s along course ground; it does not model raider AI, all combat effects or every device. The result supports the fighter budget for this scene, not a general GPU or worst-case combat guarantee. Neutral CPU p95 was 4.8 ms High and 1.7 ms Performance and is retained separately.

Matched contact sheet and hash/camera manifest: docs/board/looks/crew/round-2.png and round-2.json. Raw frames, side action views, course PNGs, motion clips and browser report are retained in round-2/. Ready for independent art critique; no beta or release claim.

The repository forced LF conversion on new WebM files. The intact working recordings were retained, `*.webm binary` was added with Director approval, and only the two motion files were renormalized. Their final Git blobs were checked byte-for-byte against the original recordings. No images or video content were edited or recaptured.
