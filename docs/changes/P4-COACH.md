# P4-COACH

## Built

Read-only braking markers and a faint apex trace use the actual current Team Room dossier and bundled reference positions. Session option defaults off and resets on player change. Level2/ownership and grand-prix flag are required. Cups, Hard Grand Prix, menus, pause, on-foot and special/inspection views stay excluded. No simulation, RNG, input, records or storage writes. Renderer hides missing/stale references and disposes owned guide geometry on replacement.

The single screen-menu synchronization call is wired under the AGENTS16 one-hour lead decision recorded on the card. It passes current App/player/event choices to the existing owned helper; no saved settings or App source change. Final gate/build and actual presentation remain pending; no live claim.

## Verification

Initial planner tests RED for missing implementation, then6/6 PASS including actual current Panorama dossier/reference geometry and no mutation. Actual setup helper and race-owner/missing-course guards added:8/8 planner/UI cases PASS. Independent review found two real guard gaps (missing course and foreign/stale race owner); both corrected with explicit pure race-context tests. Independent confirmation CLEAR6c0e9922; the later host delta is only import/call. Canonical gate/build and actual presentation verification remain pending. No old assertion changed, no timing or art acceptance claimed.

## Removed

Nothing replaced. No scratch captures, new assets, saved fields or obsolete code path.


## Actual private presentation found and fixed a height bug

Exactb6150084 first canonical52/52/jobs4/0unrun371114.0033ms passed, but the manual native private view did not prove guide visibility. Actual road geometry raycast at Panorama brake300.925649m proved terrain ground13.94m +.06 placed marker14.00m below drawn asphalt14.03499985m. New actual rendered-road regression RED, then fix uses the higher actual road/ground height +.06;9/9focused planner/UI/native-road cases PASS. No old assertion/geometry/scene rule or saved data changed. Required review confirmation, changed-source canonical/build and corrected-source visibility check still pending. The earlier52pass belongs only tob6150084, no false final pass.

Actual original-source private UI controls passed: notes purchase through real800credit UI, Coach defaultOff/On and HardGP hidden; console error/warning log empty. No real saves touched. The manual test's wall crash is QA driving, not a handling acceptance or recorded regression.
