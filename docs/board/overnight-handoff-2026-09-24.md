# Wasteland handoff — 24 September 2026

**Release decision: hold Wasteland2 in development.** The live `master`
checkout, `localhost:5174`, and real careers were not changed by this
development wave. The latest gameplay and board state is `a858f38` on
`integration/wasteland`; the worktree is clean. Roadside destruction from the
earlier live repair remains available in the current game. The new on-foot,
crew and raider work is behind the `wasteland2` development switch.

## What is playable in the development branch

- Car exit, bailout, first-person walking, re-entry and a parked car that
  stays put instead of reversing away.
- A three-shot RPG, car repair wrench, fighter health and knockdowns, and
  traffic and rival responses to a fighter on the road.
- Eight selectable rank-gated crew members with distinct pooled figures.
  Rook, Nell, Odessa, Dune, Wren sprint and Wren crate reach have working
  perks. Jax boarding, Cinder fire immunity and Tusk's parked-car shove wait
  for their supporting mechanics. Signature gear also remains future work.
- Three seeded raider camps on each of the 11 combat courses, warning posts,
  bounded raider fire, RPG knockdowns and one raised salvage crate per camp.
  Raider knockdowns pay Notoriety once per raider per race.
- Short, distinct on-foot weapon, repair and raider sounds. The full-race mix
  and future weapon sounds remain open.

## Proportionate checks used

Each slice received focused checks and a production build. Browser scenes
were used for new visuals and joined controls with memory-only saves on
private ports. The last join received the focused weapon-audio check, build
and the bounded on-foot stop balance check. All passed. No broad suite was
rerun for every card.

FOOT-08 used one seed and three paired route/difficulty cases. Routine RPG
or repair stops lost ground; a constructed clear RPG shot on a wounded rival
and a repair before a controlled wreck could repay the stop. These samples
do not establish full-race win rates or aiming feel. The exact full release
gate, all-course walking camera check, fixed-step replay check, frame pacing,
and whole-race audio mix still need to pass before Wasteland2 can move to
beta or reach the live game.

## Next work

Build the remaining Wave 6 weapons, boarding and CPU on-foot behavior, then
finish the crew hooks those mechanics enable. Review the raider and salvage
effects in real play, including whether a fast rival uses camp shots before
the player arrives. Keep work in isolated branches, merge one reviewed card
at a time, and reserve the broad exact gate for a release candidate.
