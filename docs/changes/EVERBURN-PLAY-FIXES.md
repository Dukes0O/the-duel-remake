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
