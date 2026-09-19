# Local Time Trial ghosts

A completed Time Trial personal best can save a translucent car for the next attempt. It is a visual replay. It never enters the physics state, colliders, traffic, opponent logic, or police targets.

Race setup shows **Best ghost** only when the selected player, route, car, and settings have a recording. The label includes its finishing time and the number of installed upgrades in its recorded build. Hovering over the label shows the individual upgrade levels. Playback starts enabled; its on/off setting is shared across this browser. Turning playback off still records eligible personal bests.

The key uses the named local player ID and the existing personal-best key: course ID, `layoutVersion`, seed, laps, car, Time Trial mode, transmission, and CPU difficulty. Upgrades can improve the same car record, so the saved build is shown explicitly. Increment a course's `layoutVersion` when its route geometry or distance changes. Valid old-layout recordings move into `archivedRecords` in the same save; their keys and samples remain intact. They cannot be selected or played against a newer layout. These records stay on this computer; no account, network service, or online leaderboard is involved.

## Recording and clock behavior

`App` owns the recorder and snapshots the race player, event, car, and upgrades at the start. It samples actual physics poses at 5 Hz and includes both the start and finish. Positions use centimetres, speed uses tenths of a mile per hour, time uses milliseconds, and yaw uses 1/10,000 radians. Long attempts progressively thin ordinary samples while retaining endpoints and both sides of discontinuities. Each recording is limited to 1,800 samples.

Playback follows `stageTimeSec + racePenaltySec`, the same clock used by the race result. Pause freezes this clock. A penalty time jump preserves the last pose and marks the next pose as a discontinuity: playback holds through the missing time and then snaps to the next recorded pose. Course-boundary and crash recovery resets use the same hold-and-snap rule. Ordinary intervals interpolate positions and use the shortest circular yaw path. A ghost disappears after its finish time.

Only a valid completed result can save, including a completed loss that sets the car's best time. The normal progression result must have been settled for this race and must match the active named player. The result must equal or beat that profile's comparable best, and must be faster than the currently stored ghost. Duplicate, abandoned, incomplete, wrong-player, wrong-car, non-finite, and implausible unmarked forward-jump attempts cannot save. Existing faster profile times remain authoritative if a recording was pruned or predates the ghost feature.

The recorder resets between stages and restarts and is discarded on leaving a race. Results and the menu clear the live pose. Switching local players changes which recordings are available. Ghost persistence never writes the wallet or changes a race outcome.

## Storage and renderer API

`the-duel-ghosts-v1` is separate from career saves. Its current-layout `records` list holds at most 12 recordings and 1,250,000 UTF-8 bytes, evicting the least recently used current recording first. Prior-layout `archivedRecords` are retained outside that active playback budget so new runs do not silently erase previous geometry's replays. Archives can therefore increase the total save size. Actual race playback updates usage; viewing setup does not. Input validation discards malformed data and unknown record fields. Faster records win only within the same full key when merging, and both active and archived arrays are preserved in either merge order. If storage is blocked or full, the write reports failure without clearing existing storage; the new recording remains available in the current session and the result labels it as session-only. `duel_ghost_enabled` stores the display preference.

New records retain `raceLength` so later layout revisions can validate them using their own route length. For legacy archives without that field, the retained finish sample supplies the old endpoint; current route length is never substituted. Both `findGhost` and direct `sampleGhost` reject noncurrent layouts. If the exact previous layout and geometry are restored, its validated archived records can become active again. Archiving does not change player credits, garage ownership, paint, milestones or personal-best history.

`app.ghostPose` is null or a reusable object with `s`, `lateral`, `headingError`, `airHeight`, `speedMph`, `car`, `playerId`, `timeSec`, `recordTimeSec`, and `upgrades`. Its `headingError` already includes the recorded slip and crash-spin yaw. The renderer must not add the current player's yaw or feed this object into `Duel`. `app.ghostRecord` holds the current race's comparison recording. `app.ghostStatus` is `none`, `recording`, `playing`, `off`, or `finished`.

## Validation

Run `node tools/test-ghost.mjs`. Its checks include actual physics completion of both laps, separated player and settings keys, quantization, finite values, malformed records, short-path yaw interpolation, penalty and reset discontinuities, long-run thinning, storage limits and failure, faster-only replacement, pause, restart, abandonment, profile switching, and duplicate settlement. The renderer and setup layout also need a browser visual review; the headless tests do not establish visual quality.

Run `node tools/test-layout-archives.mjs` for layout 3→4 migration with changed distance, preserved leaderboard rows and replay samples, repeated saves, both merge orders, active-list eviction without archive loss, rejection of obsolete playback and failed-quota storage preservation.
