---
task: BUG-15
status: integrated
kind: combat-fix
flag: wasteland2
player_facing: yes
---

# Rival shields protect the rival, not traffic

In Wasteland 2, the rival's Star shield now covers only that rival. Traffic
inside a bomb blast can be hit, and traffic impact dents are no longer blocked
by the rival's shield. The original one-rival Wasteland behavior remains behind
the flag-off path.

`node tools/test-traffic-shield.mjs` passes two focused cases, one for each flag
state. No save data or live build changed.
