# EVERBURN-PLAY-FIXES

The earlier rounds of this card are recorded in `EVERBURN-PLAY-FIXES-A.md` (part A and the third round) and
`EVERBURN-PLAY-FIXES-B.md` (part B). This page holds the fourth round.

## Fourth round (13 November 2026, a Sonnet helper for Claude, branch `worktree-agent-a81491e2b3b9a2900`)

Five small faults the second play found, and a frame-timing tool for Claude. Nothing in any job's rules, clock, pay or
outcome changed. Switches `story-everburn` and `scablands-runs` stay off. Pictures: `docs/board/looks/everburn-play/round-7.jpg`
with `round-7-review.md`. No new sound cue: nothing here adds a game event.

### What changed, item by item

1. **A job with only places names each place on the big map** (`src/route-map.js`, drawing only). On the big map a step that has two or
   more places and no road draws each place as a numbered gold ring with its own name. Places that lie nearer than 34 pixels to each
   other (job 2's three forge lamps are 7 m apart, 4 pixels at this size) are drawn as a group: each keeps a small true dot where it stands,
   joined by a thin line to a numbered badge, and the badges stand in a column with a name each, on whichever side of the group has room
   (left, right, or below or above), clear of the land's names, its place dots and the player's marks. Those names are then kept out of
   the way of the five places' own names, which are printed after them. The small panel is unchanged.
2. **"Road is clear" and the raiders' toll stand under the caption** (`src/screen-hud.js`, `src/combat-hud.css`). The screen puts the class
   `is-world-job` on the stage while a world job runs, and in that class the spoken-line subtitle stands 150 px under the story caption's top
   (it stood at 128 px, over the rear-view mirror, which ends at 90 px plus 30vw over 3.2). Races and the Scrapdome keep their place for it.
3. **The caption is readable while the big map is open** (`src/world/world-hud.js`, `src/world/world-hud.css`). Opening the big map puts the
   class `world-map-open` on the stage; in it the story caption is drawn above the map (z-index 9, the map is 8) on a dark plate, in 24 px
   type. This was the simpler of the two choices on the card (above the map, or a clear strip).
4. **Big Bess starts clear of every solid** (`src/world/jobs/steps/escort.js`, `src/world/jobs/gas-run.js`, `src/arena/modes/world-job.js`).
   Job 4 never stood inside a solid (she starts at the Boneyard, 16.9 m from the nearest wreck's box). Both gas roads and the battle begin at
   the well and she stood inside its 18 m derrick box. An escort actor may now carry `start`: a place on her first piece of road.
   `escortTruckStart(path, 36)` gives it, the gas runs and the battle use it, and the car's `carStart` is worked out from it (13 m behind
   her and 6 m to her right, as before). The job starts her on her way to her second place, never back to the well, and a rest and restart
   on her first stretch puts her back at this start, not in the derrick. Her outline is then 22 m clear of the box (the old start: inside
   it), the car 14.5 m clear (long road) or 12.4 m (Boneyard road and battle) and the camera behind the car 5.8 m (long road) or 3.8 m (Boneyard road and battle). Her roads, the raids' places,
   the pay and her speed are as they were; each run is 36 m, about 4 seconds, shorter.
   The start check (`tools/test-everburn-play-start.mjs`) now tests Big Bess herself: her outline (the box read from her model) at least 3 m
   clear of every solid and of Tin Town's drawn model and fence, her start on the road's first piece, and in a real job that she stands there
   and drives on toward her second place at 9 m a second. Job 4 and every gas run and the battle pass it.
5. **The solid `tin-town-shell` stands where the town is drawn** (`src/world/scablands-scene.js`). It stood at x 538 to 570, 46 m west of the
   drawn town, from the first Scablands build; the town is what the player sees, so the solid moved. It is now 19 by 27 m, 8 m high, centred on
   (600, 0): the extent of the buildings in `tintown.glb` (x minus 9.3 to 8.8, z minus 13.5 to 13.4, up to 7.6 m high). Its old size, 31 by 23 by
   15, was neither the buildings (it matched the model's drifted-sand footprint, 33 by 31) nor anything a car meets. The shacks' layout keeps
   its list of kept-off rectangles, including the old solid's, so that the six clusters and their solids stay where they were
   (`src/world/tin-town-shacks.js`, comment only).
   **What falls inside it.** Nothing starts inside it: no car start, origin, safe point or place of any job, gas run or the battle. Three
   roads end at the town's own centre (600, 0), which is inside the solid: job 4's road, both gas roads and the battle's. Big Bess, the
   truck, is no obstacle for the solid (only the player's car is). The player's goals inside it are job 1's delivery spot (600, 0, 18 m wide)
   and Hot Soup's notice board (600, minus 10, 8 m wide): both can be reached from the edge of the solid with the car's half length (2.4 m)
   allowed, and a new check says so. Hot Soup's spot is reached from the south side only. Hot Soup's safe corner (610, minus 2) is half a
   metre outside the solid's east edge (6 m wide place).
6. **`everburn-frames`, a browser scenario for Claude** (`tools/scenarios/everburn-frames.mjs`, and its name in `QUIET_SCENARIOS` in
   `tools/run-browser-scenarios.mjs`, so that it runs alone). Modelled on `convoy-frames.mjs` and `deep-frames.mjs`. It starts job 4 from the
   Story Wall on Performance, memory-only, puts Big Bess 197 m down her road (just past 30 per cent, where the furnace begins to pace her, and
   11 m past the first ambush, whose raiders then stand behind her), puts the car behind her at the first distance (14 to 44 m) from which she, the
   raiders and the furnace are all in the picture (it checks each against the camera and stops if they cannot be), lets the picture settle,
   and takes 120 delivered frames with no player input. Pass line: delivered p95 of 18.5 ms or less. The world build time and the first load
   are written to the report, and the first load over 5 s is printed as a warning. Report: `everburn-frames.json` in the scenario's output
   folder; the picture it measured is `everburn-frames-view.png` beside it. **It was not judged here**: it was run once, headless with other work on
   the laptop, only to confirm it starts, reaches the view and writes its report (that run: p95 16.9 ms, first load 22.6 s, world build
   295 ms, all three in the picture, and the raiders' toll line on screen under the caption). Claude runs it alone, headed, for the real figure.

### Checks

Each run once, from PowerShell, on the branch with `integration/wasteland` merged (a fast-forward).

- `tools/test-everburn-play-start.mjs`: 319 checks (it was 228 on part B's branch; the new ones are Big Bess's own start, the escort starts from
  her start, and the solid's place and what falls inside it).
- `tools/test-everburn-play-fixes-round4.mjs` (new): 73 checks: job 2's three lamps are named once each, numbered, drawn as three badges
  and three true dots, with no two names printing over each other or over the land's five names; five far-apart places each have a numbered
  ring and a name; the small panel draws no numbers; the subtitle, the caption and the mirror keep apart at five screen widths (read from the
  style sheets); the two class names are set and read.
- `tools/test-run-gas.mjs` 1,116 (as before), `tools/test-field-battle.mjs` 796 (as before), `tools/test-old-smoke.mjs` 650,
  `tools/test-scablands-job-map.mjs` 38, `tools/test-route-map.mjs` 841, `tools/test-scablands-scene.mjs` and
  `tools/test-everburn-play-fixes-a.mjs` 291 (all pass).
- `tools/test-ember-lines.mjs` 56 captions and note (passes); `tools/test-everburn-easy.mjs` (passes: all nine jobs, both roads at every feud
  word, and the battle on Easy won 10 of 10 with Big Bess's lowest health 51).
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): 80 passed, 0 failed, 0 not run, in 591 s. It includes
  `test-run-gas-medium` ("the card's targets are met": every fighting driver brought Big Bess home 10 of 10 on both roads and at every feud;
  the battle, fighting driver: home 10 of 10, won 9 of 10 (part B's table had 8), most rests in a try 2, lowest health on arrival 28; the driver
  who never fights: home 10 of 10, won 0 of 10, as before), `test-replays` (297 checks), `test-arena-shove`, `test-old-smoke` 650 and the
  suites listed above.
- `npm run build`: passed (built in 1.7 s).
- Browser (`node tools/run-browser-scenarios.mjs --scenarios everburn,everburn-play,everburn-well,run-gas,field-battle --jobs 2`): 5 of 5 passed,
  0 warnings, 0 errors (`everburn` 4 pictures, `everburn-play` 11, `everburn-well` 3, `run-gas` 4, `field-battle` 7). The first run had
  `everburn-play` fail on this round's own new check ("no story caption was on screen while the big map was open"): the job's opening line
  had gone by the time the scenario pressed M, because the game runs in real time while the scenario waits. The check now hands the screen a
  line through the game's own caption hook first; the other four passed in that run, and all five passed on the run recorded here.

### Replay fingerprints

`test-replays` passed with 297 checks across 33 cases, 31 events, 9 categories, three FPS values and three runs, the same count and cases as the third round's; no fingerprint was re-recorded. The battle's and runs' own tables in `test-run-gas-medium` and `test-everburn-easy` (all nine jobs, both roads at all four feud words and the battle on Easy) pass their targets.

### Changed assertions (each for Claude's review; nothing is loosened)

1. `tools/test-run-gas.mjs` and `tools/test-field-battle.mjs`, the road-clearance checks ("every road clears every solid by 8 m"). The
   solid called `tin-town-shell` moved onto the town (item 5), and each road ends at the town's centre, inside it. The last piece of a road that
   ends at (600, 0) is now allowed 0 m from that one solid; every other piece and every other solid keeps 8 m (3.4 m for the gate's posts),
   as the first piece is allowed to touch the well's box and no other. The number of checks is as it was (1,116 and 796), because the exempt
   piece is still checked, against 0 m instead of 8 m. Reason: the roads end in the town and the solid must be where the town is.
2. `tools/test-everburn-play-start.mjs`, the escort start: "the car starts 13 (10) m behind Big Bess and 6 m to her right" now measures from
   Big Bess's own start (the actor's `start` where it has one, otherwise her road's first place) and not from her road's first place. The
   numbers, 13 m (gas runs and battle), 10 m (job 4) and 6 m, are the same; the gas roads' first place is the well's middle, which she no
   longer starts on. The new checks are additions.
3. `tools/scenarios/everburn-play.mjs` and `tools/scenarios/run-gas.mjs`: checks added only (the big map in job 2 with its caption over it;
   a spoken-line subtitle clear of the mirror and the caption). `everburn-play` now takes 11 pictures (10 before).

No other assertion changed.

### Removed

Big Bess starting inside the well's box on the gas roads and the battle (replaced by her named start on the road); the solid `tin-town-shell` at x 538
to 570 (replaced by the one on the town); the spoken-line subtitle over the mirror in a world job; the caption under the open big map; job 2's three
lamps as one blob on the big map. Nothing else was replaced.

### Left open

The small panel still shows job 2's lamps as one blob (the card asked for the big map). Old Smoke's furnace in job 6 starts at the well's middle
(a chaser, not an escorted machine; nothing in the card names it). The Hand Flamer's drawing, new story lines and the Lab are out of scope.

## Go-live, 13 November 2026 (a Sonnet helper for Claude, branch `worktree-agent-a7125fe6064531951`)

`story-everburn` and `scablands-runs` are on (rule 18, no Preview step), dated 13 November 2026 in `src/feature-flags.js`. `titan-bowl`, `wasteland-town`,
`menu-front-door`, `deep-vasca` and every other switch are as they were. Before the switch, the story was played once more on Medium in the real
game, which found three faults; each was fixed in this round (A, B and C below). Pictures: `docs/board/looks/everburn-play/round-8.jpg` with
`round-8-review.md`. No new sound cue: nothing here adds a game event.

### Part 1: the play before the switch (Medium, memory-only saves, scripted drivers through the QA harness)

The drivers were the child-pace driver of `tools/test-everburn-easy.mjs` (jobs 1, 2, 3, 5 and 6) and the fighting driver of
`tools/test-run-gas-medium.mjs` (job 4, the gas runs and the battle), fed through the game's own input hook and simulation step, with the screen's own
caption code running every 0.2 s of game time. The script lived under `.qa-dist/` and is not committed. The waits were measured in headless
Chrome with software drawing, so a real graphics card should be faster.

| Job | Started in the open | Finished | Time | Notes |
| --- | --- | --- | --- | --- |
| 1 Hot Delivery | yes | yes | 25.7 s | Delivery spot at the town's edge reached; no wall. |
| 2 Get Out and Walk | yes | yes | 10.3 s | "Hold F to get out" straddled the mirror's top edge (fixed, C). |
| 3 Run Him Down | yes | yes | 22.6 s | |
| 4 Slow Ride | yes | yes | 74.1 s | Big Bess reached the town's centre (600, 0) smoothly at 72 s; no stall against the solid. |
| 5 The Key Under the Mall | partly | yes | 40.5 s | The car stopped for about 11 s against a junk car 9 m ahead (fixed, B). |
| 6 The Everburn | yes | yes | 192.1 s | Old Smoke's furnace drove out of the derrick box cleanly (14 m/s, 26 m clear in 2 s). The wave and well bars lay over the mirror (fixed, C). |
| Gas run, long road | yes | yes | 180.4 s | Big Bess arrived at (600, 0). |
| Gas run, Boneyard road | yes | yes | 138.1 s | Big Bess arrived at (600, 0). |
| Battle (War party) | yes | yes, won | 175.1 s | Big Bess arrived at (600, 0) with 26 health after one rest. |

The waits from choosing a job on the Story Wall to the first drawn frame, in seconds: job 1 on the first Scablands load of the session 8.3; job 4 chosen
from the wall in a fresh page 8.2; job 4 reached from job 3's result in a continuing session 3.6; jobs 2, 3, 5 and 6 in the chain 4.6, 4.3, 3.9 and 3.9; the
two gas runs and the battle in fresh pages 8.3, 8.5 and 8.3. The Scablands art was ready in the same second as the first frame every time.

### A. The notice board's three jobs now start (it found the Story Wall's "Take job" buttons did nothing)

`data-ember-side-job` had no handler, and `startArenaEvent` refused any world job that was not one of the six. Now:

- `src/screen-router.js`: the button calls `app.everburnSideJob(key)`, beside `emberStep` and `emberRun`; TRY AGAIN on a notice-board job's result starts it again by its board name.
- `src/app.js`: `everburnSideJob(key)` and `_sideJobOpen(job)`. `startArenaEvent` accepts exactly the three definitions the board hands over (checked by identity), and only once the note is read and the second story job is won. Anything that is neither one of the six, a gas run nor one of these three is still refused.
- `src/world/jobs/everburn.js`: each side job's step names its car's start (`carStart`), so that it starts in the open like the six: Lost Prospector and Survey Flags at (543, 192) facing the first goal; Hot Soup at (603, -100), 90 m south of Tin Town facing the notice board, which stands inside the town's own box and is reached from the south side (the straight way goes through the gap between the two southern shack groups and stops 4.5 m short of the box). `sideJobKey` and `sideJobOf` map the board's names to the definitions.
- `src/screen-arena.js`: a notice-board job's result has no NEXT JOB; it ends at BACK TO THE YARD, with the scrap line, and TRY AGAIN if it was lost.
- `src/route-map.js`: a rescue's people and home and an exploration's finds are drawn as the job's own places on the small and big maps (they were not drawn at all; the panel said "CURRENT POSITION" twice, over itself).
- The save is unchanged in shape. A finished side job pays the one world-job amount every finished world job pays (80 scrap, 96 on Medium) and adds its run id to `wasteland.settledResults`, exactly as the six do. It writes nothing under `story`. The board never shows a side job as done: it offers the job again every time (the board already listed all three whenever it was open, and no save field was added). The same job pays again each time it is taken.

Played in the real game by script on Medium, from the board's button through the result screen and back to the yard:

| Side job | Started from the board | Finished | Time | Pay on the results screen |
| --- | --- | --- | --- | --- |
| Lost Prospector | yes | yes | 51.9 s | SCRAP EARNED +96 |
| Survey Flags | yes | yes | 69.6 s | SCRAP EARNED +96 |
| Hot Soup | yes | yes | 4.2 s | SCRAP EARNED +96 |

Hot Soup's end spot was driven to by the finished job (the car came up on the south side, 14 m short of the board at 4.0 s, and the job ended at 4.2 s). Its safe corner (610, -2) was driven to on purpose in a second run: the car arrived 0.02 m off and stopped on it. The story save was identical before and after each job, and the board offered all three again afterwards. The 90-minute limit that would have hidden the board behind a switch `ember-side-jobs` was not reached, and that switch was not made.

### B. Job 5's start moved past the junk cars

The Scablands road carries pairs of crushable junk cars (`src/course.js`, left as it is). Job 5's car started on the road at (150, 416), 9 m behind the first
of a pair, and a car driven straight at the Dead Mall stopped against it for about 11 s (reproduced headless). `src/world/jobs/everburn.js` now starts it at
(123.72, 421), on the same road, 124 m short of the mall (it was 150 m), facing it; the pair is 12 and 18 m behind it. It is still on the road (0.24 m from it) and clear of every
solid (104.7 m), the camera behind it is 113.4 m clear, and the mall's own line is still not heard for the first 100 m (the car is 102 m from the cue's edge). Replayed in the real game
on Medium: no stop, 26.5 s in all (the key taken on the way), and "Leave the car outside" is heard in the first second. `tools/test-everburn-play-start.mjs` now checks every start (the six jobs, the two gas runs, the battle
and the three notice-board jobs; before, the six, the runs and the battle) for **no junk car within 40 m ahead of the car's nose in the direction it
faces**: a new check, not a loosened one.

### C. Nothing is drawn over the rear-view mirror in a world job

`src/world/world-hud.css`, drawing only. The key prompt ("HOLD F TO GET OUT") stands to the right of the mirror, level with its top. Job 6's wave and well bars stand to its left, under the job's
heading and above the small map, wide enough that "WELL 120 / 120" does not wrap. Both are clear of the story caption and of the spoken-line strip, which stand under the mirror. In
play on Medium nothing lay over the mirror in job 2 or job 6 (the play measured the HUD's objective bar, prompt, bars, map button, compass, truck bar and the
spoken-line strip against the mirror's box every 0.2 s of game time). `tools/test-everburn-play-fixes-round4.mjs` reads the style sheet at five screen widths; two browser
scenarios check the real boxes (`everburn-play` for the prompt in job 2, `everburn-well` for the bars in job 6).

### Changed assertions (each for Claude's review; nothing is loosened)

1. `tools/test-feature-flags.mjs`: it said `story-everburn` and `scablands-runs` are `'dev'` (with `titan-bowl`, `snow-world`, `rival-voices`, `engine-curve`, `tyre-slip`, `wasteland-town`
   and `deep-vasca`); it now says both are `'on'` (with the Water Road, the Nine and the other released switches), and its message names the release of 13 November 2026. Why: the switches were switched
   on. Nothing is loosened: each name is still pinned, to its new state, and the number of switches is unchanged.
2. `tools/test-run-gas.mjs` and `tools/test-field-battle.mjs`, the App fixture `yard()`: a switch not listed in `on` was left out of the overrides, which meant off while the catalog said `'dev'`. Both Everburn
   switches are now set to `false` unless listed, so "with its switch off" and "without the Everburn switch" still mean off. In `test-run-gas.mjs`'s "an arrival with the switch off moves nothing" the override
   list adds `'scablands-runs': false` for the same reason. Every assertion is as it was and the counts stay 1,116 and 796.
3. `tools/test-everburn-play-start.mjs`: "job 5: the car starts 150 m short of the Dead Mall" (150, within 2 m) now says 124 (within 2 m), because the start moved past the junk cars (B). The checks that it is on the
   road (under 1 m), faces the mall, and that the mall's own line is not heard for the first 100 m are as they were and pass. The additions are the three notice-board jobs in the start check and "no junk car within 40 m ahead" for every start. 319 checks became 349.
4. `tools/scenarios/everburn-play.mjs`: the check that the story caption is on screen while the big map is open now waits for the job to be racing before it hands the line over. The caption is hidden during the
   start countdown, and the new checks before it, though quick, showed the countdown on a slow run. The check itself is as it was. Added: the get-out prompt is clear of the mirror and the caption.
5. `tools/scenarios/everburn-well.mjs`: added only (the wave and well bars are clear of the mirror and the caption).
6. `tools/test-scablands-job-map.mjs`: added only (38 checks became 42): the notice-board jobs' small-map data.
7. `tools/test-everburn-play-fixes-round4.mjs`: added only (73 became 86 checks): the prompt's and the bars' places in the style sheet at five widths.

No other assertion changed. The search for tests, scenarios and documents that say the two switches are off found `tools/test-feature-flags.mjs` (item 1), the two App fixtures (item 2), and
`docs/WASTELAND_WORLD.md` ("dev until finished", corrected). `start-preview.bat` still lists both names in its Preview flags, which does no harm now that they are on (as with `kogane-invitation` and `lab-classroom`).
The board, the cards, the inbox, `README.md`, `docs/VERIFICATION.md` and `docs/board/next-run.md` still say "off" in places and were not touched.

### What a player sees, and the save

A player who has not found the Wasteland gate sees nothing new: the Everburn needs the gate (`wastelandUnlocked`). A player who has found it sees the Everburn card in the main menu's STORY choice (with a red dot until Hollis's note is read), the yard's
"Next up" line with its button into the jobs, and the Story Wall's Everburn section with the six jobs, the Tin Town notice board once the second job is done, and, once the sixth is won, the gas run with its two roads and, at War party, the battle. The old menu's Next up line does
not read the Everburn and the front door stays off. Nothing is added to or moved in the save: a career with story progress keeps it exactly, and the switches only decide what is shown and what can start. The one field a job writes is the run id in `wasteland.settledResults`, as every finished arena or world job does.

### Checks

- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`: 122 of 122 suites passed. The first run, before the two App fixtures and the new test were given an explicit "off", had 3 failures (`test-ember-side-jobs`, `test-run-gas`, `test-field-battle`), all for that reason; the run recorded here is the second, on the final code. It includes `test-replays` (297 checks) and `test-combat-replays` (12): **replay fingerprints did not move**. `test-run-gas` 1,116, `test-field-battle` 796, `test-old-smoke` 650, `test-ember-lines` 56, `test-everburn-easy` (all nine jobs 10 of 10 with the new starts, both roads at every feud word, and the battle 10 of 10) and `test-run-gas-medium` ("the card's targets are met") pass.
- New and extended suites: `tools/test-ember-side-jobs.mjs` (new) 136 checks; `tools/test-everburn-play-start.mjs` 349; `tools/test-everburn-play-fixes-round4.mjs` 86; `tools/test-scablands-job-map.mjs` 42.
- `npm run build`: passed (built in 1.4 s).
- Browser, once: `node tools/run-browser-scenarios.mjs --scenarios everburn,everburn-play,everburn-well,run-gas,field-battle,scrapdome,grand-prix,arena-fuel-run,menu-front-door,map-view,combat-hud,release-controls,everburn-side-jobs --jobs 2`: 13 of 13 passed, 0 warnings, 0 errors (every name existed). `everburn-side-jobs` is new: it takes each notice-board job from the board's button, checks it starts as a world job at its start place with its name on the HUD and no arena labels, takes one picture each, goes back to the yard and checks the board offers all three again. Earlier runs of `everburn-play` and `everburn-side-jobs` failed on faults in the new checks themselves (a timing precondition, and a negative number written into a script string), which were fixed.
- Whole tier, once: `node tools/run-tests.mjs --tier full --jobs 4 --keep-going`: 651 suites, **650 passed, 1 failed, 0 not run**, in 4,656 s. The one failure was `tools/test-town-people.mjs` ("a 10,000-person, 5,000-building day stays under 30 ms (observed 37.49 ms)"), a timing check in town code this round did not touch, run while the laptop was busy with other work. Rerun alone on the same code, it passed with 29.38 ms (36 checks), only just under its own 30 ms line. An earlier rerun, started while other work was still running, failed again; I did not see its figure. It is an unreliable suite under load (rule 3), not a fault of this change, and it should get a card for its margin.
- Replay fingerprints did not move (`test-replays` 297 checks across 33 cases, `test-combat-replays` 12), in the lane run and in the whole tier.
- Not run, as the brief said: the frame-timing scenarios (`everburn-frames`, `frame-pacing`, `deep-frames`, `convoy-frames`). The frame check in the Scablands with the laptop alone, and a play by hand on Easy and Medium, are still to do (card EVERBURN-PLAY-FIXES).

### Removed

The Story Wall's three "Take job" buttons that did nothing (replaced by working ones); job 5's start at (150, 416) behind the junk cars (replaced by (123.72, 421)); the wave and well bars and the "HOLD F TO GET OUT" prompt drawn over the rear-view mirror (replaced by their new places); the small map's "CURRENT POSITION" fallback for a rescue and an exploration (replaced by their own places); the two App fixtures' "off by leaving the switch out" (replaced by an explicit false). Nothing else was replaced.

### Left open

- The notice-board jobs repeat for ever and pay the one world-job amount (96 scrap on Medium) each time, with no tick: that follows the board as it was (it listed all three whenever it was open) and the save has no field for them. If the board should show a job done or pay once, that is a design call and a new save field.
- Hot Soup is short (4 s at the child-pace script's speed) and its first picture is a plank fence; Lost Prospector and Survey Flags say nothing aloud (their definitions carry no lines). All three have the plain result line.
- The junk cars stay on the road as they were; job 5's way on to the mall and the well passed them in the play, and nothing else starts within 40 m ahead of one.
- The Hand Flamer's drawing, new story lines and the Lab are out of scope, as before.
