# EASY-YOUNG-DRIVER

The short board entry controls current state, ownership, dependencies and locks.

From WATER-EASY (`docs/changes/WATER-EASY.md`, 1 November 2026). On Easy, a player who is never better than an Easy
computer car wins 0 to 6 in 10 across the Water Road's 15 jobs and fights; a player using the game's own aiming help
wins both races 10 in 10 but still loses most arena games and fights, and nobody won Fuel Run, Ambush Alley or the Convoy
Raid.

## Design, settled by Claude before code (28 November 2026)

Kyle's ruling of 20 November 2026 (decisions page): the player is a pre-teen; Easy should be winnable often, not almost
always, and losing is allowed. So the target replaces this card's old "8 in 10".

- **The target:** on Easy, with the game's own aiming help, every Water Road job and fight is won about 5 to 7 times in
  10 (`node tools/test-water-easy.mjs --rates`), and none is below 4 in 10. A player never better than an Easy computer
  car wins at least 2 in 10 of each, so no job is shut to a weaker driver. Medium and Hard do not move.
- **Where:** a story-only Easy, in the files that own each job and fight (their own Easy numbers), not a change to Easy
  for every race. Released courses, arena events outside the Water Road and the Grand Prix are untouched.
- **Start with** Ambush Alley, the Convoy Raid and the Fuel Run (all at 0), then any other below 4 in 10. Change the
  fewest numbers that reach the target: the raiders' health or aim, the time allowed, the convoy's pace. Never remove
  a danger.
- Keep the fun: Summit hillside driving and monster truck big air stay exactly as they are (decisions page, "Keep
  these").

## Checks

`node tools/test-water-easy.mjs --rates` before and after, recorded in the change note per job; the suites that name
each changed job; the replay and combat replay guards, with any moved Easy pin re-recorded with its reason;
`node tools/combat-balance.mjs --check`; the lane tier and `npm run build`. One independent review of the design
numbers (rule 17).

## Claude answers
