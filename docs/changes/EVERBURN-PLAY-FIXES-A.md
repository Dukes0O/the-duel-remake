# EVERBURN-PLAY-FIXES, part A

1. Story callouts now have a screen-owned reading queue, with length-based time, a crowded queue, priority warnings and clearing at the end. The job still calls its original 2.2-second clock; `_storyCallout` in `src/arena/modes/world-job.js` only marks the source for the screen. This shared adapter is the smallest change needed to distinguish story captions from race callouts and carry urgency. No starts, cameras or raiders changed.
2. `src/world/jobs/steps/chase.js` requests the losing line only after eight seconds and a gap increase of at least 20 m. The leash restart stays as before.
3. `src/screen-hud.js` shows only queued job callouts in the world-job caption slot; race and Scrapdome callouts retain their existing path.
4. `src/screen-hud.js` removes duplicate job objectives under the clock and map and from the race heading; the job's own top bar remains.
5. `src/world/world-hud.css` moves the map button below the clock.
6. `src/world/world-hud.js` and `src/route-map.js` use the job's own map data for the large map, remove its FINDS list, and thin overlapping small-map labels around the main place.
7. `src/story/ember-ui.js` points both switch states to the Story Wall, with the requested text; `src/screen-arena.js` shows one yard button after the last job.

No new sound event: these changes use existing callouts and cues.

## Follow-up: wreck messages and timed instructions

- World-job crashes show the same crash text, kicker and `crash-callout` styling as other Wasteland events. The screen pauses its story caption until the crash ends; race-only warnings stay hidden.
- The furnace's Easy door arrows and chimney warning carry their requested time into the screen queue, with a 1.5-second minimum. Their deadline starts when issued, including while hidden by a crash; stale instructions are dropped. Spoken captions retain their reading-time rule.
- The job clock, outcomes and sound cues are unchanged. No existing assertion was changed in this follow-up. New focused checks cover the actual HUD, queue timing and the callout timing marker.
- Follow-up `test-everburn-play-fixes-a`: 43 checks passed. `test-world-jobs`, `test-old-smoke` (650 checks), `test-field-battle` (792) and `test-run-gas` (1116) passed. `test-everburn-easy` passed all nine jobs 10/10, both gas roads at all four feud levels 10/10, and the battle 10/10.
- Follow-up replay fingerprints unchanged: `test-replays` passed 297 checks over 33 cases; `test-combat-replays` passed 12 checks over four encounters. `test-board` passed 630 checks; `test-repo-hygiene` passed.
- Follow-up lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): 108 passed, 2 failed, 0 not run. `test-warlord-blackiron` and `test-warlord-tollkeeper` failed because `ffmpeg` cannot launch in protected mode (`EPERM`); Claude runs them. `test-world-jobs` passed in the lane.
- Follow-up `npm.cmd run build -- --outDir .qa-dist/everburn-followup-build`: passed; scratch output was recycled. Browser scenarios and independent review remain for Claude, per the lane instructions.

## Checks (original part A)

- `test-everburn-play-fixes-a`: 24 checks passed (queue, chase, both yard switch states and job map data).
- `test-ember-lines`: 56 captions and note passed; `test-ember-save`: 117 checks passed; `test-ember-screens`: 20 checks passed.
- `test-everburn-line-audit`: 21 behavior checks and line ID audit passed; the existing audit reports two unasked lines.
- `test-scablands-job-map`: 38 checks passed. An initial run failed its existing place-label assertion; the drawing was corrected and the assertion was not changed.
- `test-everburn-easy`: all nine jobs 10/10, both gas roads at all four feud levels 10/10, and the battle 10/10.
- `test-old-smoke`: 650 checks passed; `test-run-gas`: 1116 checks passed; `test-field-battle`: 792 checks passed.
- Replay fingerprints unchanged: `test-replays` 297 checks across 33 cases and `test-combat-replays` 12 checks across four encounters.
- `test-board`: 630 checks passed; `test-repo-hygiene`: passed.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): 107 passed, 3 failed. `test-warlord-blackiron` and `test-warlord-tollkeeper` cannot start ffmpeg (EPERM); Claude must run them. `test-world-jobs` pinned the old chase warning, and passed when rerun with the changed assertion below. The urgency marker and caught-chase guard were finalized during the lane run; the world-job and gas-run suites ran after those edits.
- `npm.cmd run build -- --outDir .qa-dist/everburn-play-a-build`: passed; output recycled after the check.
- Session-end `build-status` and Cockpit sync were not run: they inspect other worktrees or the Command Center, outside this lane, which this assignment forbids.
- Browser scenarios `everburn`, `everburn-play`, `everburn-well`, `run-gas`, `field-battle`, `scrapdome`, and `grand-prix` were not run; Claude will run them in Chrome. Independent code review also remains for Claude.

## Changed assertions

`tools/test-world-jobs.mjs`: the old assertion expected a `say` event on the first tick with an already-broken leash and no line ID. The new assertion expects the named `closer` event after 8 seconds and a 25 m increase from the initial gap; the existing immediate restart assertion remains. This records the card's changed warning moment, and the new focused test also checks that neither threshold alone fires the line. Claude accepted this assertion change and confirmed that the restart check remains (12 November 2026). The new focused test contains new assertions only.

## Removed

The job's generic race callouts in the caption slot, duplicated objective copies, the large map's oval and FINDS display, the duplicate last-job yard button, and the yard's unavailable free-driving prompt were replaced by the behavior above. The old large-map drawing code was removed.

## Third round (12 November 2026, Claude's builder on branch `worktree-agent-a6e8bc73bb6960823`)

Six items, one commit each (the queue also has two small follow-ups after the pictures). Nothing in any job's rules, clock, pay or outcome changed, apart from the order of three opening lines in job 6's chase (item 3). No new sound cue: every line already has its cue. Pictures and the caption table are in `docs/board/looks/everburn-play/round-6.jpg` and `round-6-review.md`.

1 and 2. **The caption queue gives way and drops late lines** (`src/story/caption-queue.js`, presentation only). A line keeps its full reading time (1.2 s plus 0.055 s a character, 2.5 to 7.5 s) while nothing waits; once another line waits it ends when it has had 2.5 s or 60 per cent of its reading time, whichever is longer. The old "crowded" rule is gone (`captionSeconds` has no second argument and the lines carry no `crowded` mark). A waiting line that has waited 6 s is dropped; time while a crash hides the caption does not count. A line with its own time (the Easy door arrows and the chimney warning) keeps that time, never gives way and is still dropped when its time has passed. One decision where the card is silent: a line an urgent line cuts short comes back once, at the front, and only if it had not yet had 60 per cent of its reading time; a short line that was read is not shown again and no line is shown a third time (the first build showed Old Smoke's second line three times on Easy).

3. **Instructions go first** (`src/arena/modes/world-job.js`, `src/world/jobs/everburn.js`). All three door-hit lines, the furnace's bolting and its turning round are urgent (front of the queue, shown once the line on screen has had 1.5 s); the step-marked urgent lines were already (`urgentCaption`). Job 6's chase now opens with Old Smoke's first line, Cinder's "He is heading for Tin Town! When a door glows, hit it!", then Old Smoke's second line. The job's own clock is unchanged: it plays the same three lines at the same 2.2 s spacing, only in a different order, and the first door still stokes after the third line (`test-old-smoke`: "the first door stokes only after the third line has played").

4. **Closing lines on the results screen** (`src/arena/modes/world-job.js` `rememberEndLine` and `sayLine`, `src/screen-arena.js`, `src/screen-results.js`, `src/screen-results.css`). The world job keeps a list `endLines` of `{lineId, text}`: every line it says that belongs to the last step's closing list (its `closing` lines, or the arrival lines a run chooses, including Auntie Solder's war party line), from the moment that step is decided. Nothing in a job reads the list. The results screen shows the lines in order, each as "Who: words" in its own block above the job's result line, without a line the result line already shows (by id, or by its words being in the result sentence) and only for a won job. Job 6 shows both of Cinder's closing lines, a run its arrival line (and the war party line when the run reaches War party), the battle the line for its ending. The save, the pay and the replay fingerprints are untouched.

5. **No COLLISION flashes in a job** (`src/screen-hud.js`, `jobCrashShown`). In a world job the crash message and its kicker show, and the caption pauses, only while the car is wrecked and recovering or the crash is the catastrophic one. A plain collision, an engine blow or a rock impact shows nothing in the caption's place, does not pause the queue and does not cut the line on screen. The red flash over the picture is as it was. A race and a Scrapdome event take exactly the code they took.

6. **The big map always has the land on it** (`src/route-map.js`, `src/world/scablands-land.js` (new), `src/world/world-hud.js`, `src/world/jobs/everburn.js`). `worldJobMapData(course, state, {land})` adds the five named places (YARD GATE, TIN TOWN, THE EVERBURN, DEAD MALL, BONEYARD; positions are the jobs' own, exported from `everburn.js` as `SCABLANDS_PLACES`) and the two gas roads (`GAS_RUN_PATHS`, drawn faintly and named). The big map passes it; the small panel does not, and its data and drawing are as they were. The big map is fitted to the land, the job's own ground and the player, and draws the job's own ground bright on top.

### Tests

- `tools/test-everburn-play-fixes-a.mjs`: 291 checks (every assertion is now counted; the old message said 43, a fixed text). New: a line keeps its full time with nothing waiting and gives way at 2.5 s or 60 per cent when another waits; a line cut after 60 per cent is not repeated and a long one comes back once; a waiting line that waited 6 s is dropped; an urgent line is shown after the current has had 1.5 s, at once if it has had more, in order when several come; the chase's opening order; the three door-hit lines, the bolt and the turn-round are urgent and the opening lines are not (a real Duel); the end lines of job 6 (both of Cinder's closing lines, not the defence's), of a Boneyard run that reaches War party with Bess whole and hurt, and of the battle's two endings, each with the results screen's lines and no repeat of the result line (real Duels, with Big Bess stood near the end of her road to save time); a plain collision shows nothing in a job while a wreck and a catastrophic crash do, and a race and a Scrapdome event are unchanged; the big map's data names the five places and both roads in every Everburn job, both gas runs and the battle, and its drawing names them, draws both roads faintly, keeps every place inside the picture and draws the job's ground bright, while the small panel draws none of it.
- `test-ember-lines` 56 captions and note; `test-ember-screens` 20; `test-ember-save` 117; `test-everburn-line-audit` 21 behaviour checks and the audit; `test-scablands-job-map` 38; `test-everburn-play-start` 228; `test-world-jobs` passed; `test-old-smoke` 650; `test-run-gas` 1,116; `test-field-battle` 796; `test-everburn-easy` all jobs and both gas roads at all four feud words 10 of 10 and the battle 10 of 10 on Easy (10 won); `test-run-gas-medium` the card's targets met (fighting driver, the battle: home 10 of 10, won 8 of 10, as before); `test-replays` 297 checks over 33 cases and `test-combat-replays` 12 checks over four encounters, both unchanged, so the replay fingerprints did not move (no file a race reads was changed: the HUD, the queue, the results screen and the job mode's presentation hooks only).

### Changed assertions (each for Claude's review)

1. `tools/test-ember-lines.mjs`, the chase's lines: was `['story.ember.old-smoke.2', 'story.ember.old-smoke.4', 'story.ember.cinder.23']`, now `['story.ember.old-smoke.2', 'story.ember.cinder.23', 'story.ember.old-smoke.4']`; its message now says "Old Smoke's first line, then Cinder's instruction, then Old Smoke's second line". Reason: item 3, the card's new opening order.
2. `tools/test-old-smoke.mjs`, "the chase opens with three lines in the card's order": the same three lines in the same new order (the second and third swapped). Reason: item 3. The check next to it (the first door stokes only after the third line has played, later than 6.6 s) is as it was and passes.
3. `tools/test-everburn-play-fixes-a.mjs` (part A's own new test), all of it presentation: (a) `captionSeconds('x'.repeat(200), true) === 5.25` is removed, because the crowded argument is gone (the other three `captionSeconds` checks are as they were); (b) the block of four lines in order, the urgent line and the three crowded long lines (old timings 2.5 s, 7.23 s, 11.96 s) is replaced by the new rules' own checks, because it pinned the old rules (full time for every line, a 70 per cent crowded rule); (c) the timed-arrow check expected the 7-character opening line "opening" to come back after the arrow; it is now a line of 60 characters that carries on, because a short line that has been read is not shown again; the other timed-arrow checks are as they were; (d) in a world job a collision (crash flash on, armor combat) used to say COLLISION with the kicker "ARMOR HIT. AUTO RECOVERY."; it now leaves the line on screen and the kicker empty (item 5). The race and Scrapdome checks keep the old values.

No other assertion in any suite changed.

### Checks

- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`) on the final code: 118 passed, 0 failed, 0 not run in 390 s (the two warlord suites ran this time). An earlier run before the last two small queue follow-ups: 115 passed, 0 failed.
- `npm.cmd run build -- --outDir .qa-dist/third-round-build`: passed twice (before and after the follow-ups); scratch output deleted.
- Browser (`node tools/run-browser-scenarios.mjs --scenarios everburn,everburn-play,everburn-well,run-gas,field-battle,scrapdome,grand-prix --jobs 3`): 7 of 7 passed, 0 warnings, 0 errors (`everburn` 4 pictures, `everburn-play` 10, `everburn-well` 3, `run-gas` 4, `field-battle` 7, `scrapdome` 8, `grand-prix` 7).
- `test-review-evidence` 9 passed; `test-board` 630 checks; `test-repo-hygiene` passed (the sheet is `round-6.jpg`, 420 KB, 1908 by 1317 px).
- The pictures were taken by a scratch scenario that is not committed (the tests' drivers ported to run in the page); `round-6-review.md` says how.

### Removed

The "crowded" rule of the caption queue (its second argument and its marks), the old rule that an interrupted line always comes back, and the COLLISION message and crash kicker in a world job's caption slot for a plain collision. Nothing else was replaced.
