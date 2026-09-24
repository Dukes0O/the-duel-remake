---
task: PRG-03
status: lane-complete
kind: progression-ui
flag: wasteland2
player_facing: yes
---

# Armory car weapon slots

The Wasteland2 Armory now has four car weapon slots. Players can choose the
weapon on each key or D-pad direction. Choosing one that is already equipped
swaps the two slots, so every slot stays unique. The selection is saved in
that player's `wasteland.loadout` and carried into a combat race. The four
original weapons are owned by default. Later weapons appear only when they
have a combat implementation and that player's save says they are unlocked.
The Armory accepts changes only after PRG-01 has migrated the profile to
Wasteland version 1 with its verified backup. It refuses older and future
schemas without changing the profile.

The combat HUD shows the saved order, and the corresponding number key or
D-pad direction fires that slot. The older flag-off Mad Max mapping still
fires UFO, bomb, crossbow and star from keys 1–4 in its original order.

## Verification

- `node tools/test-car-loadout.mjs`: three focused checks pass for saved
  ordering, per-player separation, invalid and locked choices, key/D-pad
  mapping, the flag-off mapping, and rejection before verified migration.
- `node tools/browser-harness.mjs scenario car-loadout-armory`: one private
  memory-only browser flow swaps Star Shield into slot 1, verifies the saved
  profile and HUD order, and fires Star Shield from key 1. Zero console errors.
- `npm run build` and `git diff --check` pass in the isolated worktree.
- No prior assertion or race fingerprint changed. No broad suite ran.

## Limit

The combat catalog currently implements the four original car weapons.
Additional weapons will enter this Armory when their own combat cards install
them and progression grants them to a player.
