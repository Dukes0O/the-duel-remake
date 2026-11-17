# The current plan (written 16 November 2026, afternoon)

This page replaces every earlier run plan. The rules are in `AGENTS.md`. Kyle's direction is in
`docs/board/decisions.md`: draw in code before building model files, a boss needs a reason, a new world or story stays
off until Claude has driven it by hand and Kyle has tried it, and (16 November) checks are sized to the card.

Kyle, 16 November: the changes to how we check are made; build again, and look back in a few days to see whether more
of each day now goes into play and pictures.

## Who does what

- **Claude:** design, drawing code, story, the first example of each new kind of thing, and every verdict, by looking at
  pictures from the game and by driving by hand.
- **Codex:** the code of a settled card, its checks and its independent reviews, each card in its own lane.
- **Sonnet helpers** (started by Claude, each in its own copy of the repository when it writes code): work that needs a
  real browser, redrawing to an accepted example, gathering pictures and play facts, routine fixes.

## Now, in this order

| Work | Card | Where it stands |
| --- | --- | --- |
| Hot Delivery, the Everburn's first job, remade | EVERBURN-REMAKE | Slice 5 (the cures of Claude's first hand drive) merged 16 November, hidden. Claude drove it again that night: delivered, six findings (the card). **Slice 6** is with Codex in lane `everburn-slice6`: riders posted where they can charge, the flame burning what it touches, a hit costing by its speed, Cinder by the road with a stop ring, a line for a step short, then the scout. After it: Claude's drive of the plates (is the furnace's eight seconds enough), the Pipe and the bed, a frame check, and only then Kyle's try. Nobody has heard the job. Job 2 is designed only after Kyle's try |
| The Dig as a toy in the Scrapdome yard | DIG-YARD-TOY | Slices 1 and 2 merged 16 November, switch `the-dig` off. Claude played it and its seven findings are cured. Owed, Claude's: a pale ring at a heap's foot (cause not found; the card says what was ruled out), one frame check in the Dig yard, then Kyle's try. The roller and the paver are left out until MACHINE-ROADS has their models |
| The nightly check's known failures | QA-STANDING-BROWSER | A Sonnet helper found none of five was in the game: four checks cured on its branch (arena-shove, drive-lesson-run, p4-audio, and arsenal-wave1-audio passes alone). ski-finish still timed out on a busy laptop and is with the helper again, with frame-pacing's wrong file path and deep-frames leaving the nightly browser step. Not merged yet. The frame stage's 34 ms readings are two refreshes of the screen (the screens were not set to one) |
| No credit loss for an Easy defeat | EASY-NO-PENALTY | **Merged 16 November.** Reaches the live game with the next release. Claude still owes the check of whether an earned car has a limit on where it drives |
| The Scablands as a place | SCABLANDS-LAND | The well, the Dead Mall and the Boneyard looked at the way Tin Town was; then one scene tried for the more real look (light and air first), with before-and-after pictures for Kyle |
| The Lab: a compelling place to learn | LAB-LOOK | Next: the three weak pictures listed under round 13 on the card; then the challenges in the 3D world |
| The machines drawn | MACHINE-ROADS, MACHINE-DRILL | The rules are merged; Claude draws the machines and the worked ground |

**Waiting for Kyle's word, do not start:** Everburn job 2; the apprentice's slice 2 (bores and apprentices kept in the
save); RUN-FIRE-LINE (a future idea); everything in "when a boss comes out" (`docs/FEUDS_AND_RUNS.md`), which waits for a
job Kyle calls worth playing.

Nothing on integration is released since 14 November. `story-everburn`, `scablands-runs` and `scablands-realism` are
`dev`; `titan-bowl`, `wasteland-town`, `menu-front-door` and `deep-vasca` stay off.

## Looking back on Thursday 19 November

The same five counts, taken for 17 to 19 November and set beside these for 9 to 16 November (eight days):

| Count | 9 to 16 November |
| --- | --- |
| Cards merged | 22 in eight days, all on four of the days (3, 5, 10 and 4); four days with none |
| Lines changed in checks for every 100 lines changed in the game (`tools/test-*`, `tools/scenarios` and the check runners against `src` and `public`) | 85; on 15 November 137 |
| Lane runs a card had | Hot Delivery had two whole runs and six scripted drives; the rule is now one of each |
| Things put in front of Kyle or Gratian (a job to try, a picture sheet, a thing switched on) | One job to try (Hot Delivery), one story released and taken out again |
| Nights the full check reported by itself | None since 15 October; the task was repaired on 16 November |

Command for the first two: `git log --since <day> --until <day> --numstat` over those paths, and the merges by their
commit messages ("merged"). If the second count has not fallen and the fourth has not risen, the next change is to how
cards are cut, not to the checks.

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

`story-everburn`, `scablands-runs`, `scablands-realism`, `titan-bowl`, `wasteland-town` and `menu-front-door`. The front door was pulled
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
