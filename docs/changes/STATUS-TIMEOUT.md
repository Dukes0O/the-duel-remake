---
task: STATUS-TIMEOUT
status: ready-to-merge
kind: fix
flag: none
player_facing: no
---

# Build-status test allows the CLI 60 seconds (27 September 2026)

`tools/test-build-status.mjs` failed twice in full-tier runs today and passed
alone both times: its status CLI child process was cut off at 15 s under the
full-tier load, leaving an empty error. The child-process time allowance is
now 60 s. No assertion changed.

## Removed

The 15 s allowance.
