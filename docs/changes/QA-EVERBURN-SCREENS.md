# QA-EVERBURN-SCREENS

The yard's Next up button starts the next story job. It replaces the unused gate markup's story entry; free driving is not built and will have its own card. The scenario now clicks Next up and checks the real job. The separate results fact checks the real result panel. Job 6 starts on the approach road 30 m from the derrick, facing it; the headless test checks road, distance, heading and clearance from every well solid. `faceOriginToPlace` on the step selects this behavior; the mode does not name the job. Both feature switches remain off.

## Lines wired

| Old placeholder | Written line or lines, in order |
| --- | --- |
| everburn-job-1-start | story.ember.cinder.1, story.ember.cinder.2 |
| everburn-job-1-spill | story.ember.cinder.4 |
| everburn-job-1-won | story.ember.auntie-solder.2 (existing result description) |
| everburn-job-2-start | story.ember.auntie-solder.3, story.ember.cinder.5 |
| everburn-job-2-won | story.ember.auntie-solder.4 (existing result description) |
| everburn-job-3-start | story.ember.auntie-solder.5 |
| everburn-job-3-falling-behind | story.ember.cinder.9 |
| everburn-job-5-start | story.ember.cinder.11 |
| everburn-job-5-key-taken | story.ember.cinder.13 |
| everburn-job-5-alarm | story.ember.cinder.14 |
| everburn-job-5-won | story.ember.old-smoke.1 (result description) |
| everburn-job-6-start | story.ember.cinder.15 |
| everburn-job-6-waves-over | story.ember.cinder.16 |

The key's `taken` and the searchlight's `alarm` events now request their captions; the heist runner previously dropped its alarm request. The last defence wave uses the existing closing sequence. At the first `lit` event Cinder says `story.ember.cinder.6`; job 6's completion closes with `story.ember.cinder.20` then `story.ember.cinder.21`. Job 3's win line `story.ember.cinder.10` is already on the result. Job 4's `story.ember.auntie-solder.6` remains at the completion and no longer repeats on the result. Job 1 and 2 wins appear on results only. The existing rest event already requests `story.ember.moss.3`. These in-job captions use the existing text-only callout; that path has no sound cue. No new game event or sound cue was added.

At the previous handoff, three unwritten placeholders were silent (the later follow-up below supplies the restart and soup lines): `everburn-job-2-exit` was requested while the player was still in the car before lighting the lamps (the field was removed, along with the unwritten lamp hints, because repeated requests starved the start queue); `everburn-job-6-wave-restart` is requested when the well's health reaches zero and the current wave restarts; `everburn-soup-spilled` is requested when a crash exceeds the hot-soup delivery limit.

## Previous audit: lines then not asked for

- `story.ember.cinder.3` | Cinder | First barricade
- `story.ember.auntie-solder.1` | Auntie Solder | Tin Town in sight
- `story.ember.cinder.7` | Cinder | Raiders
- `story.ember.cinder.8` | Cinder | In the Boneyard
- `story.ember.moss.2` | Moss | Bess hit
- `story.ember.cinder.12` | Cinder | Inside the mall

At that handoff no proximity distances had been specified. The later follow-up below supplies four; two remain in the audit exception list.

## Changed assertions for Claude's written review

- Browser scenario: old gate fact required both `BACK GATE` and `DRIVE THE SCABLANDS` text; new fact clicks the yard Next up button and requires the active world-job definition to be `everburn-hot-delivery`. The old markup was unused and free driving is deferred.
- Removed `scablandsGateMarkup().length === 0` when unavailable, `count(gate, /<button/g) === 2`, and the requirement that the markup include both `BACK GATE` and `DRIVE THE SCABLANDS`: the unused markup is removed, and the scenario checks the real replacement.
- `test-ember-lines`: the job 4 collection of named lines no longer includes `resultLineId`; that field was removed to prevent repeating the existing completion line. The audit test checks that the result does not repeat it and the existing test still checks the completion line.
- `test-everburn-screens-start`: the unknown-caption assertion formerly used job 6's real opening, and now uses a synthetic `missing-opening` id, because job 6 now has written words. Expected empty callout remains unchanged.
- Earlier result scenario change: old `typeof window.__qaApp.storyResultLine === 'function'`; new real result panel contains `Everburn: job 3, Run Him Down, complete.` The nonexistent hook cannot prove the screen.

## Removed

Removed unused gate markup and its three markup-only checks, replaced by a yard-to-job browser fact. Removed unwritten job 2 exit and lamp hints to prevent their repeated empty requests blocking its opening. Replaced placeholder line ids with the written lines above. Removed the duplicate job 4 results line; its completion line remains.

## Checks

- `test-everburn-line-audit`: passed the explicit unasked-line audit and 11 behavior checks. `test-everburn-screens-start`: 9 passed.
- `test-ember-lines`: 54 captions and note passed; `test-ember-save`: 117 passed; `test-ember-screens`: 20 passed.
- `test-everburn-easy`: all nine jobs 10/10, eight gas-run combinations 10/10, and battle home and won 10/10. `test-old-smoke`: 616 passed, unchanged. `test-run-gas`: 1,088 passed, unchanged. `test-field-battle`: 750 passed, unchanged.
- Lane tier `--changed --jobs 4 --keep-going`: 94 passed, 2 failed, none skipped. Failed suites: `tools/test-review-evidence.mjs` and `tools/test-warlord-tollkeeper.mjs`; both failed because protected mode refused `spawnSync ffmpeg` with `EPERM`. Claude runs both. The captured rerun identifies review-evidence as the second audio-dependent failure that was not named in the earlier note.
- Race replay fingerprints unchanged: 297 checks across 33 cases. Combat replay fingerprints unchanged: 12 checks across four encounters.
- `npm.cmd run build`: passed (751 modules); Vite reported chunk-size and dynamic-import warnings. `test-board`: 629 passed. `test-repo-hygiene`: passed.
- Browser scenarios `everburn`, `everburn-play` and `everburn-well`: not run in protected mode; Claude runs them and reviews every changed assertion and the code.
- `build-status.mjs` was not run directly: it inspects the live folder and other worktrees, which the lane instruction forbids touching. No status snapshot is claimed.

## Browser follow-up and Scablands maps

Claude accepted the earlier wiring, ran `everburn-play` and `everburn-well` successfully, and passed both previously blocked audio suites (review evidence 9/9, Tollkeeper 28/28). `everburn` timed out on the forced job 3 result. This round removes that artificial transition and moves the result fact to `everburn-play`, which reaches Hot Delivery's result: it checks the job 1 tick and Auntie Solder's result line there. The two scenarios also capture `everburn-play-map` and `everburn-well-map` immediately after their jobs start. Browser runs remain with Claude.

The four agreed proximity lines use the existing `sayNear` machinery: barricade 1 at (180,100), 60 m; Tin Town at (600,0), 170 m; plane row at (280,380), 70 m; mall valve room at (-12,430), 22 m. The audit confirms on-foot proximity uses the walker, not the parked car. `story.ember.cinder.7` remains unasked: job 2's on-foot step has no raider-appearance event. `story.ember.moss.2` remains unasked: the escort step has no event for raiders damaging Bess. No new combat event or sound cue was added.

Claude's two new captions are registered and wired: `story.ember.cinder.26` when a defence wave restarts, and `story.ember.auntie-solder.12` when soup spills. The unwritten survey hints were removed. The audit now checks that every line id in Everburn's jobs and side jobs resolves to written words, and still fails if the two exceptions grow.

Every world-job map now has its own view: authored path; origin, safe points and destination; return path; or named step places with at least 120 m of margin. A step with none uses the player's location, not the venue oval. The map marks positioned defenders and keeps the existing player, escort, furnace and ambush marks. The HUD names the job and road or THE SCABLANDS, clears ARENA, and hides placing. The renderer does not change game state.

### Assertions changed in this round

- `everburn`: removed the forced Run Him Down completion and the assertion that its result tick appears. `everburn-play` instead checks the job 1 tick and Auntie Solder's actual result line on its real result screen. Claude reviews the change.
- `everburn-play` report: expected screenshot count 9 -> 10 because the requested job 1 map picture was added. `everburn-well` also gains the requested defence map picture.
- `test-scablands-job-map`: old `data() === null` for a pathless job -> a non-null local view with 120 m margin. The old check asserted the oval fallback, which is the behavior being removed. New checks cover each of the four rules, all six jobs, the defence-raider mark, named place drawing, and the actual HUD's labels and hidden placing.
- `test-everburn-line-audit`: the unasked-line exception set shrinks from six IDs to `story.ember.cinder.7` and `story.ember.moss.2`. New checks require all Everburn job line IDs to resolve, test the four places and radii including the on-foot position, and exercise the two new lines.
- `test-ember-lines`: the expected written-line table grows from 54 to 56 with Claude's exact words and moments. Existing caption wording and uniqueness checks remain.

### Removed

Removed the forced job 3 result setup and its fact, replaced by the real Hot Delivery result checks. Removed the unused survey-hint placeholder IDs; no Everburn job line ID is left without words. The old circuit fallback is removed for world jobs, replaced by job-specific road or place views.

### Checks for this round

- `test-everburn-line-audit`: passed, including all job line IDs and 21 behavior checks. `test-scablands-job-map`: 38 passed.
- `test-ember-lines`: 56 captions and note passed; `test-ember-save`: 117 passed; `test-ember-screens`: 20 passed.
- `test-everburn-easy`: all nine jobs 10/10, all eight gas-run combinations 10/10, and battle home and won 10/10. `test-old-smoke`: 616 passed, untouched. `test-run-gas`: 1,088 passed. `test-field-battle`: 750 passed, untouched.
- Final lane tier (`--changed --jobs 4 --keep-going`): 109 passed, two failed, none skipped. `tools/test-review-evidence.mjs` and `tools/test-warlord-tollkeeper.mjs` both failed because protected mode denied `spawnSync ffmpeg` (`EPERM`). Claude reports these suites pass on the laptop (9/9 and 28/28 respectively).
- Race replay fingerprints unchanged: 297 checks across 33 cases. Combat replay fingerprints unchanged: 12 checks across four encounters.
- `npm.cmd run build`: passed (751 modules), with Vite's chunk-size and dynamic-import warnings. `test-board`: 629 passed; `test-repo-hygiene`: passed. All three scenario modules pass `node --check`.
- Browser scenarios were not run in protected mode; Claude runs all three again for the changed result checks and map pictures. Independent code and changed-assertion review remains with Claude. No flags were switched on.
