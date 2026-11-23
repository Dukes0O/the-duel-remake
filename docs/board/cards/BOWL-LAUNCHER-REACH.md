# BOWL-LAUNCHER-REACH

The short board entry controls current state, ownership, dependencies and locks.

## Kyle's word (22 November 2026)

> the launcher could also use a bigger range for when it hits the opponent.

## What Claude measured (22 November 2026)

- The player's launcher takes a truck whose body is within 4 m of the player's nose and within 40 degrees of straight
  ahead (`SHOW_WEAPONS.launcher` in `src/bowl/bowl-weapons.js`; 3 m on Hard). A truck 5 m ahead or 3 m ahead and 4 m to
  the side is missed.
- A player-only reach was tried with `node tools/test-bowl-rivals.mjs --chaser-only` (Easy, ten seeds). Unchanged:
  Night 5 launcher chaser 7/10, careful 6/10. Reach 6.5 m, 60 degrees: the chaser rose above seven. Reach 5 m, 50
  degrees: careful 4/10. Reach 5 m or 4.5 m, 40 degrees: careful 5/10. Each failed "careful wins at least six of ten".
- Why a longer reach makes the careful driver lose more is not known. The first thing to look at is the throw: the victim
  is thrown 12 m along the attacker's heading (`launch`), so a throw from further away may land the rival out of reach and
  lengthen the fight.

## The task

Give the player's launcher a longer reach (about 5 m or more, Kyle's word) and keep Easy at six wins in ten (Kyle,
20 November 2026). Rivals keep their present reach. Find out why the careful driver loses at a longer reach and change
the game, not the test drivers or the bands. Rule 23 does not apply: Show Night is released.

## Checks

- `tools/test-bowl-weapons.mjs` with a new check that the player's launcher takes a truck 5 m ahead and a rival's does not.
- `tools/test-bowl-rivals.mjs` passing unchanged (its Easy bands).
- Sound cue: none new; the throw keeps `bowl.launcher.fire`.
