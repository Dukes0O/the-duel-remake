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
