---
task: FIX-01
status: ready-to-merge
kind: fix
flag: none
player_facing: no
---

## What changed

Regenerated shortcut presets after the drag-strip rule changed the route
source fingerprint. All 15 saved payloads are otherwise identical.

## Evidence

- Before: the preset test failed on fingerprint `7acea825...` versus
  `ca2e1c54...`.
- Old and new payloads are deeply equal after replacing `sourceFingerprint`.
- `node tools/test-shortcut-presets.mjs --verify-solvers`: 241 checks passed,
  including 15 fresh solver comparisons.
- `node tools/generate-shortcut-presets.mjs --check`: passed.

## Behavior and test changes

No route choices, solver results or assertions changed.
