---
task: FND-09
status: review
kind: tooling
flag: none
player_facing: yes
---

## What changed

Added a central switch catalog with `dev`, `beta` and `on` states. A menu
Experimental panel stores a per-computer choice for beta features. Named
`?flags=` switches work in QA builds only; test code can pass explicit switch
overrides. Unknown names never turn on a feature. The catalog starts empty
because no Wasteland feature has passed its release gates yet.

## Evidence

- `node tools/test-feature-flags.mjs`: 21 state, QA, persistence, blocked
  storage and panel checks passed.
- Production and QA builds passed. The QA Vite config defines the QA marker;
  production builds omit it.
- Browser panel and persistence check are pending the merged FND-08 harness.

## Behavior and test changes

No race rules changed. The menu gains an Experimental panel, which currently
says no early features are available. If browser storage is blocked, a choice
lasts only for the open session and the panel explains that limit.
