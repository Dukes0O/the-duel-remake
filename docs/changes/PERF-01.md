# PERF-01: first armored wreck frame

status: integrated

## Change

- Prepare each body's five damage influences when its vehicle is built. A hit now combines cached displacements and wear values, while retaining the same four hit zones, roof crush, vertex normals, fractures, paint and wheel response.
- Include hidden glazing fractures in the Wasteland race setup shader compile. Restore their hidden state before presenting the race.
- Cache uses 15 floats per damage vertex. The F42 player body has about 105,000 such vertices, so this adds about 6 MiB per instance while avoiding the expensive curves during a hit. This is a desktop memory tradeoff; watch vehicle-heavy scenes.

## Checks

- `node tools/test-vehicle-crush-graphics.mjs`: 3,018 checks pass across nine car models plus traffic and police. Added checks require a prepared basis for every body and a visible front hit-zone dent. Existing checks still cover roof collapse, fractures, paint/wear, resource isolation and exact intact reset. No assertions were loosened.
- One final private memory-only High/Performance frame scenario, `node tools/browser-harness.mjs scenario combat-armor-frame-pacing`: pass, zero browser warnings or errors. The scenario built the QA bundle. No live port or player save was used.

| Quality | Ordinary p95 | First wreck p95 | First wreck max | Frames above 33 ms |
| --- | ---: | ---: | ---: | ---: |
| High | 18.2 ms | 18.2 ms | 53.0 ms | 2 |
| Performance | 18.2 ms | 18.2 ms | 72.2 ms | 2 |

The prior isolated diagnostic at `24cb4d0` measured first-wreck maxima of 71.2 ms on High and 88.5 ms on Performance. Commits between that diagnostic and this task's base `052f97c` changed Notoriety and documentation, not rendering. The final report is `.qa-dist/browser-output/combat-armor-frame-pacing-2026-09-24T01-29-11-778Z/` in this worktree.

The first wreck still has two frames above 33 ms. The remaining cost includes vertex normal recomputation and first visible geometry/texture submission. This change does not alter race simulation or replay fingerprints.
