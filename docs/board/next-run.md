# The current plan (12 November 2026, after the day's release)

This page replaces every earlier run plan. The rules are in `AGENTS.md`. Kyle's direction of 11 November is in
`docs/board/decisions.md`: draw in code before building model files, and a boss needs a reason.

## Who does what

- **Claude:** design, drawing code, the first example of each new kind of thing, and every verdict, by looking at
  pictures from the game and at scripted play.
- **Sonnet helpers** (started by Claude, each in its own copy of the repository when it writes code): builds from a
  settled card, carving from photos with the kits, redrawing to an accepted example, gathering pictures and play
  facts, routine fixes.
- **Codex:** photos and painted pictures with its image tool, long runs, the nightly full check, and its ready cards
  on the board. No new Blender art card starts until Claude's list of code-drawn work is on the board.

## Now, in this order

| Work | Card | Where it stands |
| --- | --- | --- |
| The Lab: a compelling place to learn | LAB-LOOK | All sixteen lesson boards and their answer cards are redrawn, Brian has painted portraits, the old lesson frame is gone, and Lift has the stage step (numbers in a strip under the board, the scene larger). Braking, Fuel, Wax, Launch and Projectile have the wide board (rounds 10 to 12, merged). Next: round 13, by Claude: with the physics panel open the wide boards are too small, so the panel must take its room from Brian's column; then the challenges in the 3D world; then the walking hangar |
| The Scablands as a place | SCABLANDS-LAND | Models carry their colours, wear and ground are drawn in code, the road is flat, Tin Town has a gate and 45 shacks. Next: the other places looked at the same way (the well, the Dead Mall, the Boneyard), then a frame check |
| When a boss comes out | `docs/FEUDS_AND_RUNS.md` | Step 1 (EVERBURN-RUN-AT-TOWN), step 2 (RUN-GAS) and the first field battle (FIELD-BATTLE-ASH) are built with their switches off. The battle's hunt was redesigned on 12 November (the furnace catches up, fire lands before every door, it burns its coal after her third rest) and a job shows its own road on the map. Next: play all three through by hand; then feuds for a second group and the Scrapdome challenge |
| Finish and release the Everburn | QA-EVERBURN-SCREENS, EVERBURN-FURNACE-LOOK | Raw line names still show at the start of jobs 1, 2, 5 and 6. The story needs one play from end to end and a frame check before its switch goes on |

The Lab's new look was released on 12 November (build 26.11.12 18:42 UTC). Everything else from 11 and 12 November
is behind its switch. No frame check has run since 10 November: the next nightly check needs the laptop alone.

## Rules of thumb learned on 11 and 12 November

- Pictures from the game and a scripted Medium driver come before believing a design. Both of Claude's escort
  designs passed their tests on Easy and could not be won on Medium until a helper played them.
- A model nobody has loaded in the game is not checked. Four Scablands models drew white and one stood on end.
- A helper that finds the card wrong stops and says so. That saved the gas run from being built on raids that did
  not exist.

- A battle's scripted table must count what the player sees, not only wins and health. The first field battle
  met its tests while the furnace's fire never once landed on Big Bess for a driver who fought; seconds of fire
  landing is now a column. A helper that finds the targets cannot be met inside its limits stops and says why.
- A hidden browser pane does not animate. A look in a real window needs the session open on a screen; say so in the
  release note when it was not done.

## Switched off, and staying off until its card says otherwise

`story-everburn`, `scablands-runs`, `titan-bowl`, `wasteland-town` and `menu-front-door`. The front door was pulled
on 30 October at Gratian's request; do not switch it on unasked.

## Start prompt for Codex

```
You are Codex's lead for The Duel. Work in
C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake on
integration/wasteland. Read AGENTS.md, then docs/board/next-run.md, then run
node tools/board.mjs. Take the cards under CODEX CAN START NOW from the top,
audit cards first, and open the next card as soon as a lane merges. Never start
a card owned by Claude. Stop only when no Codex card is ready, then run the
janitor sweep and write one handoff line in docs/board/run-log.md.
```

## Retained facts

- Sound was approved by Kyle on 11 October; recipes and current runtime audio remain.
- Snow's accepted pine clearance is at least 6.44677 m; there is no fourth shared-snow art
  round.
- Claude owns Harbour base and finishing cost.
