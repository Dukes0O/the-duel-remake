---
task: CRASH-PRESENTATION-ON
status: merged
kind: test
flag: crash-effects
player_facing: no
---

# Crash presentation scenario follows the release (27 September 2026)

The release made `crash-effects` on, so the scenario's last pass, which
required no crash meshes without the URL flag, failed by design. It now
checks that the released game has the crash pool with no URL flag.

## Changed assertions

`tools/scenarios/crash-presentation.mjs`: "no crash-vfx meshes without the
switch" became "the crash spark pool exists without a URL flag".

## Removed

The switch-off pass.
