# The current plan (written 16 November 2026; the Everburn rows brought up to date 17 November, night)

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
| **Show Night round 2, first (Kyle, 20 November)** | BOWL-SHOW-2 | Designed 20 November after a hand drive, and cut into slices: BOWL-WALLS and BOWL-TRICKS start now (Codex), BOWL-CAMERA and BOWL-SOUND-CRUSH start now (Claude); then BOWL-HUD, BOWL-CRUSH, BOWL-OUT-SIM, BOWL-RIVALS-2, BOWL-TRICK-SCHOOL, BOWL-WEAPONS, BOWL-REX-2, BOWL-JUMP-EVENTS and BOWL-NIGHTS (Codex), and BOWL-OUT-LOOK, BOWL-WEAPONS-LOOK, BOWL-REX-LOOK and BOWL-SOUND (Claude). Nights 1 to 5 are the first release (BOWL-FINISH). BOWL-TOUR, nights 6 to 8, waits for Kyle's word on which arena he meant |
| The Everburn's first four jobs, remade | EVERBURN-REMAKE | All on integration, hidden (17 November). **Job 1, Hot Delivery:** someone on every way, the car no longer sinks. Owed, Claude's: a hand drive of each way with sound, then Kyle's second try. **Job 2, Light the Town:** remade and played to its end by hand three times; slice 13 cured the hand plays' faults and slice 14 drew the evening, the windows and the lamps' glow. Owed: Ash Men figures that do not read as toys; then Kyle's try. **Job 3, Run Him Down:** finished by hand once. Owed: the gate shown to the driver, Cinder's line only at the furnace, a hand drive of the pass through the wrecks; then Kyle's try. **Job 4, Slow Ride:** finished by hand once (91 gas). Owed: a look at the arrival, Moss and the hose drawn; then Kyle's try. Nothing is switched on before Kyle has tried it. Codex's allowance was out on the night of 17 November (back about 08:40 on the 18th): Claude built slices 13 and 14 |
| The Dig as a toy in the Scrapdome yard | DIG-YARD-TOY | Slices 1 and 2 merged 16 November, switch `the-dig` off. Claude played it and its seven findings are cured. Owed, Claude's: a pale ring at a heap's foot (cause not found; the card says what was ruled out), one frame check in the Dig yard, then Kyle's try. The roller and the paver are left out until MACHINE-ROADS has their models |
| The nightly check's known failures | QA-STANDING-BROWSER | A Sonnet helper found none of five was in the game: four checks cured on its branch (arena-shove, drive-lesson-run, p4-audio, and arsenal-wave1-audio passes alone). ski-finish still timed out on a busy laptop and is with the helper again, with frame-pacing's wrong file path and deep-frames leaving the nightly browser step. Not merged yet. The frame stage's 34 ms readings are two refreshes of the screen (the screens were not set to one) |
| No credit loss for an Easy defeat | EASY-NO-PENALTY | **Merged 16 November.** Reaches the live game with the next release. Claude still owes the check of whether an earned car has a limit on where it drives |
| The Scablands as a place | SCABLANDS-LAND | The well, the Dead Mall and the Boneyard looked at the way Tin Town was; then one scene tried for the more real look (light and air first), with before-and-after pictures for Kyle |
| The Lab: a compelling place to learn | LAB-LOOK | Next: the three weak pictures listed under round 13 on the card; then the challenges in the 3D world |
| The machines drawn | MACHINE-ROADS, MACHINE-DRILL | The rules are merged; Claude draws the machines and the worked ground |

**Waiting for Kyle's word, do not start:** the apprentice's slice 2 (bores and apprentices kept in the save); RUN-FIRE-LINE
(a future idea); the Cockpit's "Background" view; everything in "when a boss comes out" (`docs/FEUDS_AND_RUNS.md`), which
waits for a job Kyle calls worth playing.

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
