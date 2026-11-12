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

The three unwritten placeholders remain silent: `everburn-job-2-exit` was requested while the player was still in the car before lighting the lamps (the field was removed, along with the unwritten lamp hints, because repeated requests starved the start queue); `everburn-job-6-wave-restart` is requested when the well's health reaches zero and the current wave restarts; `everburn-soup-spilled` is requested when a crash exceeds the hot-soup delivery limit.

## Written lines not yet asked for

- `story.ember.cinder.3` | Cinder | First barricade
- `story.ember.auntie-solder.1` | Auntie Solder | Tin Town in sight
- `story.ember.cinder.7` | Cinder | Raiders
- `story.ember.cinder.8` | Cinder | In the Boneyard
- `story.ember.moss.2` | Moss | Bess hit
- `story.ember.cinder.12` | Cinder | Inside the mall

No existing event marks those exact moments; no new distance, encounter, or damage rule was invented. The audit test allows this explicit list to shrink but fails on any new unasked written line.

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
