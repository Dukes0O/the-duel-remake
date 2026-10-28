# NISSAN-SKYLINE-GTR-R34-V2: shape round 1

## Changed

Original Bayside Blue R34 code builder using the 959-S construction helpers
and F1 contract. Boxy wedge body, long bonnet, short boot, flared arches,
upright cabin, separate adjustable-style rear wing, four round rear lamps,
slim front lights, large lower intake and silver five-spoke wheels. Red
calipers and twin tips follow the packet rather than synthetic reference errors.
The driver stays in the left seat. No maker assets, textures or logos.

Kyle explicitly requested a dev-only registry hook. The nissan-skyline switch
starts in dev, and the asset factory checks it. No config, shop, handling,
save, computer-car pool or sound changes. Later stages own those systems.
The model factory remains directly callable for offline art review, like the
other builders. The registry is the gated game entry.

## Checks

- Own contract: 280 checks passed, 48,484 visible triangles and 52 draws.
  Limit: 60,000 triangles and 56 draws. No browser storage accessed.
- Steering, four wheels, brake and boost hooks; exposed lamps; actual roof
  clearance; finite geometry; grounding and tumble support; directional dents,
  glass fractures, crush, exact reset and private sibling geometry covered.
- Independent code review: clear, no concrete faults found.
- Lane gate, build and review sheet: pending.
- No browser scenario or frame timing in this shape round. The comparison
  uses the actual code geometry exported to Blender; it is labelled accordingly.

## Changed assertions

No existing assertion changed. The new Skyline suite reuses the F1 contract
with R34 dimensions, left-seat position, its stricter 60,000/56 budget and
physical tests of the R34's own exposed lamps and solid roof. It adds dev
registry off/on checks with storage explicitly null. F1 frame recipes do not
belong to this shape stage and were not copied.

## Removed

No existing model or code path replaced. Temporary review GLB and renders
will be recycled after the verdict is recorded; only the comparison sheet
and repeatable recipes remain. No runtime binary added.

## Handoff

Stop after round 1. Claude judges resemblance and decides the next art round.
No merge, push, release or frame measurement performed.
