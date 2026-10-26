# GP-CAREER-LIVE

Claude decided to enable `grand-prix-career` on 26 October 2026. This lane changes the switch only; the existing position pay, records, ghosts, variant access and cups become available in production. No pay rules or save format change.

Checks: existing Grand Prix career, menu and cups suites; historical save fixtures; lane tier (jobs 4), production build, combat balance, and the existing memory-only Grand Prix pay browser scenario. No frame timing. The existing GP browser scenario also waits for successful asynchronous ghost storage before taking its result picture.

## Changed assertions

- `test-feature-flags`: the catalog assertion requires career on instead of dev; its message follows the decision. The released-switch list now includes career, retaining explicit dev-pinned denial tests.
- `test-grand-prix-career`: catalog state dev -> on; production URL-enabled false -> true. QA-enabled true stays exact. Add a plain production-enabled check.
- `test-grand-prix-cups`: the production-off admission check now explicitly overrides career false. This keeps the same refusal assertion and covers the retained off path after release.

- `scenarios/grand-prix-pay`: added a wait requiring `grandPrixGhostSaveStatus === 'saved'` and `ghostSaved === true`; the report includes both. Every existing assertion stays exact. This proves records actually save after the asynchronous storage move.

## Pay comparison

Summit Run, default one-run distance, Arcade, with the released lap-choice switch on. These are recurring position credits, without clean/best/streak/milestone/snowman extras. Duel wins use the same course, distance and CPU difficulty.

| Position | Easy | Medium | Hard |
| --- | ---: | ---: | ---: |
| 1 | 600 | 1000 | 1500 |
| 2 | 450 | 750 | 1125 |
| 3 | 330 | 550 | 825 |
| 4 | 240 | 400 | 600 |
| 5 | 180 | 300 | 450 |
| 6 | 120 | 200 | 300 |
| 7 | 90 | 150 | 225 |
| 8 | 60 | 100 | 150 |
| Duel win | 600 | 1000 | 1500 |

Pro doubles position pay: Summit wins 1200/2000/3000. All 24 completed-position settlements have zero charge. Position ratios are 100/75/55/40/30/20/15/10 percent. Equal-distance wins pay equally; there is no GP win premium. GP pays smaller amounts for lower places; Duel has a loss charge. Longer closed races use the existing distance factor, so default lap counts must not be compared as if distances were equal.

## Validation

- Lane tier: 35/35 suites, jobs 4, zero failures/unrun, 224.88 s. Includes career native finish, cups 13/13 with actual three-race Mountain Cup, once-only payouts, replay and world guards. Menu suite separately 6/6.
- Native memory-only production App races, no flag overrides: Pacific Easy 2nd +675, Medium 6th +300, Hard 8th +225. Pro Medium 6th +600. All complete with zero charge and exact wallet deltas.
- Native flag-off/on race fingerprint unchanged: `d051abb03c0979635e332caf490579bb980731c37018585ea9b1cf7006870f0b`.
- Production build passed (2.04 s). Existing large-chunk and ineffective dynamic-import warnings remain.
- Existing memory-only browser pay scenario passed on private port 62187. Diagnostic rerun, now waiting for confirmed async ghost save, passed on 35852: zero warnings/errors. Real three-lap finish, positive credits, duplicate refusal and saved ghost confirmed. No frame timing.
- Independent `save_review`: CLEAR, including final scenario delta. 23 historical + 1 forged fixture, 1029 preservation checks; backup/migration/rollback 14/14 plus 88 arsenal checks; storage 3.61/4.00 MB; fines 225 checks; combat rewards 6/6; 336 damaged/partial normalization probes. No real saves accessed.
- Combat balance `node tools/combat-balance.mjs --check`: passed, exit 0; 51 policy runs, 90 baseline races, and three completed pursuit runs.
- Board 190 checks and repository hygiene passed; `git diff --check` clean. Consumed screenshots, browser reports and generated dist recycled after their verdicts were recorded.

Updating this lane from current integration was rejected by automatic approval review because Kyle said not to merge; no merge was performed.

## Observed issue

The browser result says the best-lap ghost save failed even after `grandPrixGhostSaveStatus` is saved and `ghostSaved` is true. Reviewer confirmed an existing UI fault: App labels a pending save as session-only, and the result render cache omits save status, so success does not refresh the message. Actual storage succeeded. Follow-up needed in App/result wording and screen-router cache; outside this switch card, no runtime edit made.

Cockpit sync ran; GP-CAREER-LIVE has no matching task. The Director should add its ID to the appropriate task notes. STATUS refreshed. No merge, push, release, live checkout or real save access.

## Removed

No runtime path, asset, save field or existing assertion removed. No generated evidence is needed in the final change.
