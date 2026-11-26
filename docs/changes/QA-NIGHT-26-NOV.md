# QA-NIGHT-26-NOV

- Changed: `tools/scenarios/open-map.mjs` writes its sheet to the output folder, and into `docs/board/looks/open-map/`
  only with `OPEN_MAP_SHEET=1` (it changed the night's copy); `tools/scenarios/heli-jobs.mjs` flies each leg in
  separate browser calls (one call ran past 60 s); `fire-view` joins `QUIET_SCENARIOS` in `tools/run-browser-scenarios.mjs`.
- Board: card QA-NIGHT-TIMING-ALONE (Codex, Sol) for frame-timing scenarios in the night's browser stage; five items
  join `docs/board/checks/standing-failures.json` (audio-baseline, everburn-job2, ships-decks, machine-borer,
  convoy-frames), each with its card and its failure words.
- Checks: the 16 night failures rerun on e5eeb9231 (9 pass, rule 3); `heli-jobs` and `open-map` pass on this branch;
  `test-browser-scenarios` 17/17; `test-board`; `test-repo-hygiene`; `npm run build`.
- Changed assertions: none.
- Removed: nothing; QA-NIGHT-TIMING-ALONE removes the convoy-frames and deep-frames standing entries when it lands.
