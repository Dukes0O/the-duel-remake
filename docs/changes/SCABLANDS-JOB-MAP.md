# SCABLANDS-JOB-MAP

The map reads the current world-job step's road, fits it north up and marks the player, Big Bess, the furnace and each spawned ambush rider when present. It names the destination and shows the job and road headings. Placing and the KEEP YOUR LINE kicker are hidden in world jobs; the clock remains. A step without a road keeps the existing map, as do races and Scrapdome events. No simulation state or switches changed. No new sound event was added. Existing job state supplied all fields; gas-run.js and old-smoke.js were not edited.

## Checks

- `node tools/test-scablands-job-map.mjs`: 17 checks passed, including read-only state, actor presence, destination and fallbacks.
- `run-gas` and `field-battle` browser scenarios: one map-panel picture added to each; not run because Chrome is unavailable in the protected mode. Claude must run and review both.
- Lane tier (`--changed --jobs 4 --keep-going`): 44 of 45 suites passed; `tools/test-review-evidence.mjs` had 8 of 9 subtests pass, with audio analysis blocked by sandbox `spawnSync ffmpeg EPERM`. The initial run also found HUD test doubles lacked DOM methods; that was fixed, and those suites passed in the final run.
- Build: passed with `npm.cmd run build` (751 modules). PowerShell refused `npm.ps1` under its execution policy; the Windows command wrapper worked.
- Board: 632 checks passed; repository hygiene: passed, both in the lane run.
- Replay fingerprints: 297 checks across 33 cases passed unchanged in the initial lane run; combat replay fingerprints: 12 checks passed across four encounters.
- Existing assertions changed: none.

## Removed

The oval and race map headings are replaced by the active road and job headings when a world-job step has a path. Placing and KEEP YOUR LINE no longer appear in world jobs. The original map remains for jobs without a path and for other modes.

## Claude review follow-up

HUD elements are found once, and the new heading and visibility values change only when needed. A weak map caches each step's road points outside job state. On foot, the player mark follows the fighter. The road has a 30-pixel margin; marks are radius 8 for the player and 7 for others, with the player drawn last. A 12-pixel legend includes YOU, the named start is smaller and dimmer, and the end label is placed clear of the road and its marker.

Claude reported that `field-battle` and `run-gas` passed in the browser on the first commit, and that the road, Big Bess and furnace appeared. This follow-up has not been run in Chrome; Claude will rerun both scenarios and the audio-evidence suite.

Follow-up checks:
- `node tools/test-scablands-job-map.mjs`: 20 checks passed, including fighter position and path reuse.
- Lane tier (`--changed --jobs 4 --keep-going`): 44 of 45 suites passed. `test-review-evidence.mjs` again could not launch `ffmpeg` in the sandbox (`EPERM`); Claude will rerun it. Race fingerprints: 297 checks passed unchanged; combat replay fingerprints: 12 passed.
- `npm.cmd run build`: passed, 751 modules.
- `tools/test-board.mjs`: 632 checks passed; `tools/test-repo-hygiene.mjs`: passed, both in the lane tier.
- Browser scenarios: not run for this follow-up; Claude will rerun `field-battle` and `run-gas` and review the map.

No existing assertions changed; no sound event added.
