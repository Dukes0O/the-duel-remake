---
task: CREW-01
status: integrated
kind: crew-roster
flag: wasteland2
player_facing: yes
---

# Wasteland crew roster and selection

Integrated at `68bbb8a` after review of the profile guard, live perks,
future perk labels, and pooled figure update.

The Armory and Garage show the eight named crew members from SPEC 3.5, their
rank gates, perks and signature gear. Rook is free. Once a player reaches a
member's Notoriety rank, they can select that member at no cost. Selection is
saved in that player's version 1 Wasteland profile and follows them into a
Wasteland race. Older and future profile versions cannot be changed here.
Ordinary races and the flag-off game keep their existing driver and fighter
behavior.

Rook has 110 on-foot health, including after a respawn. Wren sprints 20% faster.
Nell's RPG splash reaches 20% farther (9.6 m), Odessa repairs the same 40
armor in two seconds instead of four, and Dune locks onto cars 25% farther
away (275 m). These five perks run in the fixed-step combat simulation. Each
crew member has
different code-built colors and a small silhouette variation in the existing
four pooled figure meshes, so the draw-call budget remains four.

Crew selection buttons are disabled with a clear career message until the
player's verified version 1 Wasteland profile is available. The save guard
still refuses unmigrated and future profiles.

## Verification

- `node tools/test-crew.mjs`: four focused checks pass for roster and rank
  gates, per-player selection, migration safety, fixed-step Rook/Wren perks,
  Nell's splash, Odessa's repair time, Dune's lock range, Armory copy,
  figure colors and the four-draw-call budget.
- `node tools/browser-harness.mjs scenario crew-selection`: one private,
  memory-only browser flow selected Wren in the Armory, confirmed the Garage,
  then checked Wren's sprint perk in a race. One screenshot; zero browser
  warnings or errors on the rebased integration source. Private port 34812.
- `npm run build` and `git diff --check` pass in the isolated worktree.
- No prior assertion or race fingerprint changed. No broad suite ran.

## Limits and next hooks

Jax's faster boarding, Cinder's fire immunity, Wren's crate reach, and Tusk's
parked-car shove are catalog metadata for later combat cards. The Armory marks
these as future hooks. Signature gear is also marked for later cards. Dune's
25% range increase is an initial tuning choice because SPEC 3.5 only says
"longer lock-on range"; it can be balanced later without changing the rank or
save format.
The secret warlord crew member has no specified identity or rules yet and is
not represented as a fake ninth choice. The two crew reference sheets guided
the colors and outfits but are not runtime textures.
