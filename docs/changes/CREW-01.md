---
task: CREW-01
status: lane-complete
kind: crew-roster
flag: wasteland2
player_facing: yes
---

# Wasteland crew roster and selection

The Armory and Garage show the eight named crew members from SPEC 3.5, their
rank gates, perks and signature gear. Rook is free. Once a player reaches a
member's Notoriety rank, they can select that member at no cost. Selection is
saved in that player's version 1 Wasteland profile and follows them into a
Wasteland race. Older and future profile versions cannot be changed here.
Ordinary races and the flag-off game keep their existing driver and fighter
behavior.

Rook has 110 on-foot health, including after a respawn. Wren sprints 20% faster.
Both perks run in the fixed-step fighter simulation. Each crew member has
different code-built colors and a small silhouette variation in the existing
four pooled figure meshes, so the draw-call budget remains four.

## Verification

- `node tools/test-crew.mjs`: three focused checks pass for roster and rank
  gates, per-player selection, migration safety, fixed-step Rook/Wren perks,
  Armory copy, figure colors and the four-draw-call budget.
- `node tools/browser-harness.mjs scenario crew-selection`: one private,
  memory-only browser flow selected Wren in the Armory, confirmed the Garage,
  then checked Wren's sprint perk in a race. One screenshot; zero browser
  warnings or errors on the rebased integration source. Private port 34812.
- `npm run build` and `git diff --check` pass in the isolated worktree.
- No prior assertion or race fingerprint changed. No broad suite ran.

## Limits and next hooks

Nell's wider blast, Jax's faster boarding, Odessa's repair speed, Cinder's fire
immunity, Dune's longer lock-on range, Wren's crate reach, and Tusk's parked-car
shove are catalog metadata for later combat cards. The Armory marks these as
future hooks. Signature gear is also marked for later cards. Current FOOT-05
integration sites are `aimedCar`, `advanceLock` and `stepWrench` in
`src/onfoot-weapons.js`, plus RPG splash in `src/combat-projectiles.js`.
The secret warlord crew member has no specified identity or rules yet and is
not represented as a fake ninth choice. The two crew reference sheets guided
the colors and outfits but are not runtime textures.
