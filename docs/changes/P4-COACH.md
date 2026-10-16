# P4-COACH

## Built

Read-only braking markers and a faint apex trace use the actual current Team Room dossier and bundled reference positions. Session option defaults off and resets on player change. Level2/ownership and grand-prix flag are required. Cups, Hard Grand Prix, menus, pause, on-foot and special/inspection views stay excluded. No simulation, RNG, input, records or storage writes. Renderer hides missing/stale references and disposes owned guide geometry on replacement.

The menu helper is implemented only in the owned race-settings-ui hook; the single screen-menu synchronization call is still awaiting Claude approval before editing that host. No reachable feature or live claim yet.

## Verification

Initial planner tests RED for missing implementation, then6/6 PASS including actual current Panorama dossier/reference geometry and no mutation. Actual setup helper and race-owner/missing-course guards added:8/8 planner/UI cases PASS. Independent review found two real guard gaps (missing course and foreign/stale race owner); both corrected with explicit pure race-context tests. Confirmation, canonical gate/build and actual presentation verification remain pending. No old assertion changed, no timing or art acceptance claimed.

## Removed

Nothing replaced. No scratch captures, new assets, saved fields or obsolete code path.
