# POLISH-ARENA

Status: review; waiting_on: claude. Round 1 of at most 2.

## Design settled before code
- Add approved wreck-shell and loose-part stacks only inside the solid inner island.
  Rebuild the existing recipe; Course geometry and driving band stay unchanged.
- Vary seeded salt ridge width from 0.65 to 1.65 of its existing width.
  Keep the atlas and outside-ground shader in step; unchanged band tint and relief scale.
- Keep distant tanker warning lamps at readable size and a brighter roof plate.
  Near geometry and lamp timing remain unchanged.
- Pack floating label rectangles vertically with a 6 px gap after measuring text.
  Clamp complete labels within the viewport; race state is read only.
- Director added the combat-hud.js positioning hook, focused test/browser scenario,
  round sheet/review paths and the rebuilt Salt GLB. No new sound event.

## Verification
- Focused label test: 18 center/edge fixtures; native tanker LOD and disposal pass.
- Existing native Salt boundary suite: 29/29; Course envelopes unchanged.
- Actual memory-only browser, both qualities: 8 matched views, zero errors/warnings;
  each rendered pose leaves race state byte-identical; clustered labels have gaps.
- Quiet paired frame capture: 240 real rAF intervals per quality/version at the frozen matched convoy pose.
  High P95 16.8 -> 16.8 ms; Performance 16.8 -> 16.8 ms (10% limit passes).
  Means 16.67 ms. Native draw calls 599 -> 612 High, 332 -> 332 Performance.
- Director independently reviewed source and viewed sheet on 9 October: clear;
  approved exact asset SHA/triangle pins for the shown visual difference.
  Claude retains final art approval. No second round before Claude feedback.
- Salt GLB SHA256: 7520ed6b33959af8bc1c97a76275704bfe72caea06be24c093e27018430ded92.
  Mesh draws stay 172; triangles 184,340 -> 200,420. GLB grows 1,746,780 bytes
  for the two approved donor scrap stacks and regenerated salt atlas.
- Changed assertions: only exact SHA/triangle pins in salt-flats-render/effects,
  approved after visual review; no tolerances or race fingerprints regenerated.
- First lane run found an incomplete DOM double in test-arsenal-wave3:
  getBoundingClientRect was missing. Director approved adding fixed rectangles
  to that double. Existing Tesla/recharge assertions and tolerances stay exact.
- Lane tier rerun: 364 passed, zero failed (824.16 s); npm run build passed.
  Focused repaired DOM-double suite: 99/99. Build and gate logs are in evidence.
- Sheet: docs/board/looks/polish-arena/round-1.jpg (443,390 bytes).
  Retained recipe: tools/art/polish-arena-sheet.py; browser recipe:
  tools/scenarios/polish-arena.mjs (ARENA_POLISH_FRAMES=1 for quiet sampling).
  Raw files live under integration .evidence/2026-10-09/POLISH-ARENA/.

## Removed
Replace the current Salt GLB in place. No duplicate runtime asset or old label path.
