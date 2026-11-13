# EVERBURN-PLAY-FIXES, part A

1. Story callouts now have a screen-owned reading queue, with length-based time, a crowded queue, priority warnings and clearing at the end. The job still calls its original 2.2-second clock; `_storyCallout` in `src/arena/modes/world-job.js` only marks the source for the screen. This shared adapter is the smallest change needed to distinguish story captions from race callouts and carry urgency. No starts, cameras or raiders changed.
2. `src/world/jobs/steps/chase.js` requests the losing line only after eight seconds and a gap increase of at least 20 m. The leash restart stays as before.
3. `src/screen-hud.js` shows only queued job callouts in the world-job caption slot; race and Scrapdome callouts retain their existing path.
4. `src/screen-hud.js` removes duplicate job objectives under the clock and map and from the race heading; the job's own top bar remains.
5. `src/world/world-hud.css` moves the map button below the clock.
6. `src/world/world-hud.js` and `src/route-map.js` use the job's own map data for the large map, remove its FINDS list, and thin overlapping small-map labels around the main place.
7. `src/story/ember-ui.js` points both switch states to the Story Wall, with the requested text; `src/screen-arena.js` shows one yard button after the last job.

No new sound event: these changes use existing callouts and cues.

## Checks

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

`tools/test-world-jobs.mjs`: the old assertion expected a `say` event on the first tick with an already-broken leash and no line ID. The new assertion expects the named `closer` event after 8 seconds and a 25 m increase from the initial gap; the existing immediate restart assertion remains. This records the card's changed warning moment, and the new focused test also checks that neither threshold alone fires the line. Claude's written review on the card is required before merge. The new focused test contains new assertions only.

## Removed

The job's generic race callouts in the caption slot, duplicated objective copies, the large map's oval and FINDS display, the duplicate last-job yard button, and the yard's unavailable free-driving prompt were replaced by the behavior above. The old large-map drawing code was removed.
