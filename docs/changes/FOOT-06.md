---
task: FOOT-06
status: lane-complete
kind: combat-ui
flag: wasteland2
player_facing: yes
---

# On-foot HUD

The Wasteland 2 combat display switches to fighter health, a center reticle,
and a bearing and distance back to the player's car while on foot. Car weapon
buttons leave the display and are disabled until re-entry. Opponent direction
fallbacks use the fighter's facing while the camera is on foot.

The gear area says `NO FOOT WEAPON` and `AMMO —` until a later weapon card
supplies `state.footGear`. It can then display the gear name and remaining
ammo. This avoids presenting an unusable weapon as ready. Display text and
rotation update only when their values change.

`node tools/test-combat-hud.mjs` passes 6/6 focused cases; `npm run build` and
`git diff --check` pass. FOOT-03 owns the walking camera and first combined
private browser review. No real career or live build was touched.
