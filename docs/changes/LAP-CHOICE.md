# LAP-CHOICE

## Design before code
Only closed ordinary/circuit/rally Duel races and GP offer default, 5 and 10
when larger than default. Runtime choices and distance pay require lap-choice.
App keeps a player/event/mode session map; no saved preference or schema field.
A cloned race definition supplies the shared player/CPU target and race length.
Qualifying stays two flying laps; the race choice survives its stage reload.
Records accept offered identities with the switch off. GP ghosts stay one lap.
Scale only positive finishing pay before Pro duplication. Bonuses, loss charges,
fines, milestones and settlement keys stay exact. Factor 1 bypasses rounding;
above 1 nearest-five pay is floored at the old component.
Catalog tests add only the dev switch/count; Preview adds only its flag.

## Validation
RED: the requested native 5-lap Duel initially had lapsTotal=2.
GREEN: tools/test-lap-choice.mjs passed 516 assertions on final source: native
ordered player/CPU gates, exact default replay states, all GP position shares,
Pro ordering, bonuses/charges, records, session isolation and qualifying/restart.
Existing suites passed unchanged: progression/leaderboard 27; race settings 42;
GP career 184 pure checks plus identical native fingerprint
`de5e5cfd5d1860757a5f5048b3a5376cdb75c2521787ed043a01be88b744e2ce`;
feature flags 78; beta catalog suite; Preview launcher 23; course/practice UI 38;
GP career menu suite; completion screen 222. No browser/frame/full checks ran.
Menu options, chosen distance/pay preview, course descriptions, HUD denominator,
result copy/distance-under-pay and leaderboard lap filter use the chosen length.
Changed assertions: catalog count 21→22 plus manifests, add lap-choice dev to
required dev membership and exact beta catalog. All other old assertions exact.
Independent money/save review and canonical lane/jobs4 + build remain pending.

## Removed
Replaced fixed default-only finish/record acceptance and eligible fixed-lap UI.
No old ghost behavior, saved setting, asset, cue or dependency was replaced.

## Live default distances above 8 km
Course switches below are on. GP pay still requires grand-prix-career; without
that existing switch GP remains unpaid. The table shows finishing pay with
career and lap-choice enabled, before unchanged bonuses/fines/milestones.
Old Auto winner pay is 600/1000/1500 CR (Easy/Medium/Hard) in every row.
Pro duplicates this component; GP lower positions keep their original shares.

| Event | Mode / default laps | km | New Auto winner CR (E/M/H) |
|---|---|---:|---|
| Pacific Canyon Circuit | GP 3 | 12.000 | 900/1500/2250 |
| High Country Grand Tour | Duel 2 | 9.600 | 720/1200/1800 |
| High Country Grand Tour | GP 3 | 14.400 | 1080/1800/2700 |
| Harbor & Highlands | Duel 2 | 8.800 | 660/1100/1650 |
| Harbor & Highlands | GP 3 | 13.200 | 990/1650/2475 |
| Eifel Crown | Duel 2 | 11.200 | 840/1400/2100 |
| Eifel Crown | GP 3 | 16.800 | 1260/2100/3150 |
| Alpine Serpent | Duel 2 | 9.600 | 720/1200/1800 |
| Alpine Serpent | GP 3 | 14.400 | 1080/1800/2700 |
| Azure Riviera | Duel 2 | 8.800 | 660/1100/1650 |
| Azure Riviera | GP 3 | 13.200 | 990/1650/2475 |
| Red Mesa Corkscrew | GP 3 | 12.000 | 900/1500/2250 |
| Neon Docks Circuit | Duel 2 | 8.320 | 625/1040/1560 |
| Neon Docks Circuit | GP 3 | 12.480 | 935/1560/2340 |
| Cloudbreak Skyway | Duel 2 | 10.400 | 780/1300/1950 |
| Cloudbreak Skyway | GP 3 | 15.600 | 1170/1950/2925 |
| Tremblant Woods | Duel 3 | 13.328 | 1000/1665/2500 |
| Tremblant Woods | GP 3 | 13.328 | 1000/1665/2500 |
| Tremblant Snow | Duel 3 | 13.328 | 1000/1665/2500 |
| Tremblant Snow | GP 3 | 13.328 | 1000/1665/2500 |
| Harbour Lights | Duel 4 | 16.211 | 1215/2025/3040 |
| Harbour Lights | GP 4 | 16.211 | 1215/2025/3040 |
| Panorama Ridge Sunset | Duel 3 | 14.526 | 1090/1815/2725 |
| Panorama Ridge Sunset | GP 3 | 14.526 | 1090/1815/2725 |
