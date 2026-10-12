# DEEP-WATER

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: DEEP-WATER
    title: "The Deep water look for any zone"
    owner: claude
    lane: VIS
    size: L
    needs: [DEEP-LOOK]
    status: ready
    flag: the-deep
    owns: [src/deep/underwater-scene.js, src/deep/underwater-look.js, src/deep/depth-colour.js, src/deep/light-shafts.js, src/deep/water-surface.js, src/deep/water-shader.js, src/deep/sea-floor.js, src/deep/sea-floor-shape.js, src/deep/kelp.js, src/deep/marine-snow.js, src/deep/headlights.js, src/deep/contact-shadow.js, src/deep/look-quality.js, tools/deep-look.js]
    acceptance:
      - "createUnderwaterScene of 10.1 draws any zone (sea floor from the trail, kelp, light, surface, marine snow) plus the waterline and bubbles on the way down, at any depth on Performance and High; nothing reachable yet, so no frame check until FINISH-DEEP."
```
