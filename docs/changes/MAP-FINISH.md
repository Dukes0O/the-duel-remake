# MAP-FINISH

Status: lane implementation and evidence ready for Claude; pilot-map remains dev, helicopter on. Kyle assigned this
lane directly on 26 October; Claude retains the finishing verdict.

## Design before code

Spread names with short leader lines, as Claude decided. Measure the actual
font, search nearby free rows, keep every name inside the chart, and include
the Table in collision checks. No zoom unless this cannot fit at 1280×720.
Reuse the fire view's atlas and sprite drawing at all sixteen model empties;
animation is visual only. Do not change race state, saves or progression.

Checks: map-view assertions for disjoint label boxes and fire anchors;
scripted memory-only player flight and pictures at 1280×720; lane tier with
four jobs, then production build. No frame timing or voice recording.

## Findings

The final scripted player-input survey passed on private port 61519,
1280x720, memory-only saves, zero console errors or warnings. It used actual
cruise, stick inputs, landing and the pump; it did not write helicopter poses.
Inspection visits start at the three parent pads with fresh test profiles.
The route test starts with the Table unseen, discovers it on home -> Pacific,
lands at Pacific, refuels, then cruises to and lands on the Table.

| Claim | Finding for Claude |
| --- | --- |
| Every course recognisable from its outline | Not established. At the default chart size, the 1.2 km outlines are only about 9 screen pixels across. Names identify the places; shapes alone do not reliably distinguish them. Outline sizing is outside this tuning slice. |
| Names do not overlap | Exact expected name sets and actual browser glyph bounds pass for 20 ordinary courses, 21 with the seen `?`, and 21 with the found Table. No zoom needed for name separation. |
| Fuel without a calculator | Each leg has an exact kg charge in the map note; full matrix below uses the 400 kg tank. There is no separate approach or return reserve shown. Home -> Cloudbreak (335) plus Cloudbreak -> Alpine (75) already exceeds a tank before flying locally: stop at Alpine first. High Country needs the Summit truck route with its required switches on; the helicopter/pilot-map-only visit does not offer Summit, so do not assume that stop is available. |
| Table found en route | Actual home -> Pacific cruise emitted tableSpotted without a seen flag fixture. Pacific -> Table costs 100/400 kg. Refuel at Pacific first. |
| Table worth landing | Landing paid exactly 500 credits and opened the 1966 logbook. The desert mesa and strip give it a clear purpose; visual verdict belongs to Claude. |
| All secret unlocks | All five reached by flight and found by the unchanged hover rule. Directed inspection, not a blind-search claim. Downward cable-view pictures captured at roughly 85-94 m above ground; all five readable to different degrees (details below). |

No sign size, hover or fuel number changed. Keep the authored sizes: all five
are visible from the cable camera and unlock at 45 m. The weak night chalk
clue and partly hidden pit ring need Claude's look judgement before tuning. Keep the
3 s / 25 m / 2-60 m / 6 m/s hover rule: the controller could hold it without
special state writes. Keep the prescribed 12 kg/km leg rule and six legacy
leg amounts: route planning needs fuel stops, and the map shows each charge.
Do not present the tank ring as a guarantee of approach or return fuel.
The scripted slow approach landed at Pacific with about 4.4 kg; this is a
controller result, not an optimal player fuel estimate.

## Secret sight lines and the Table

These are directed inspections with the ordinary cable camera (`C` twice),
not evidence that an untold player searches successfully. Course-local sign
coordinates came from the authored data to steer the test; none were shown
to the player as new hints. All five were then hovered over at 45 m and found.

| Secret | Visible from / reading |
| --- | --- |
| Woods reverse | Above the lake edge / old logging track, about 605 m along the road. Five pale arrows show strongly against the dark bank at 85 m. |
| Panorama reverse | Above the far end of Mountain Straight, about 1,430 m along. The pale grid and backward arrow are clear at 85 m. |
| Panorama night | Above Summit Park / lookout, about 2,358 m along. Glowing pits and moving flame/smoke show beside the road at about 89-94 m. The slope hides part of the ring; four pits read clearly in this view even though all eight anchors draw. Claude should judge this partial burial in the finishing pass. |
| Harbour reverse | Over the harbour wall at about 3,510 m along. The chalk line and chevrons show directly below at 85 m, but are the weakest clue at night; descend for a closer look. |
| Harbour dusk | Over the breakwater, 130 m off the road near its 270 m point. The upward-facing lit window shows as a bright pale mark at 85 m; the dark sea helps its contrast. |

The Table's top-down picture shows the isolated mesa, oval strip and wreck.
The landing really awards 500 credits and shows the last-page card. The tower
and wreck are small from 240 m; the logbook reward gives the stop a purpose.
Claude still owns the blind-search, look and release verdict. Tiny course
outlines, the night chalk clue, partial fire-ring burial and fuel reserves
are explicit open findings, not claims of a finished release.

Evidence: `.evidence/2026-10-26/MAP-FINISH/final/` and baseline
`before/map-open.png`. One sheet: `docs/board/looks/pilot-map/look-1.jpg`,
451,023 bytes. Its crops compare the original mixed-ownership chart with an
all-owned chart, so ink weight differs as well as label positions. No new
art, render round, frame timing or voice recording.

## Assertions

No pre-existing assertion changed or loosened. Added label-box checks for
both ownership fonts and fixed-capacity fire checks (eight flames, sixteen
puffs, animation, anchor positions, removal). Focused suite: 529 checks pass.
Independent implementation review: CLEAR.

Review found two faults in the new survey's assertions, fixed before its
final run: replace the permissive `<19` count with exact expected name sets,
including the seen `?` and found Table; assert that the logbook element is
visible rather than inferring it solely from the reward and discovery flag.
These changes strengthen coverage. Independent review confirmed both fixes; final survey passed with 13 pictures and no browser errors or warnings.

The first survey attempt failed because its controller asked the renderer's
previous-course ground helper for the Table's height. Its correction uses the
actual landing zone's y and helicopter ground readout; game rules unchanged.
The next survey passed. The final run passed the review's added coverage and fixed camera framing. No passing game gate or build has been repeated.

## Checks and cleanup

- Final native browser survey: PASS, private port 61519, memory-only, 13
  pictures, zero errors or warnings. No frame or voice run.
- Independent code and scenario review: CLEAR after both assertion fixes.
- Lane coverage PASS: all 41 selected suites. Requested command
  `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 35 passed,
  1 failed (sheet filename), 5 not run, 526.28 s. After renaming the JPG,
  the same command with `--keep-going` and filters for `test-repo-hygiene`,
  `test-review-evidence`, `test-ski-view`, `test-test-runner`,
  `test-warlord-gunn-art`, `test-world-composition`: 6 passed, zero failed
  or not run, 149.05 s. Passing suites were not repeated. Logs: `lane.log`
  and `lane-remaining.log` in the card evidence folder.
- `npm run build`: PASS, Vite 1.33 s. Existing large-chunk and mixed
  dynamic/static-import warnings remain. System32 was first on PATH for
  gates and build. Shared-job admission was below three; one-minute checks
  were at three. No release full tier or frame check was run.
- World composition guard: 47 checks across twenty events PASS; the fire
  view's 50 checks and map view's 529 checks PASS. Actual GLB inspection
  confirms all sixteen named flame/smoke empties exist.
- Replay baseline file was not changed: SHA-256
  `757c2a5d7fb897af63f72c875a74f61237e340a7a04f707e63ecbffb5d0d33b0`.
  Replay guard PASS: 225 checks, 25 cases, 23 events, 9 categories,
  30/60/144 FPS, three repeats. No world signature regenerated.
- Command Center protected board sync: 0 tasks changed. Status snapshot
  refreshed in this lane without reading the live checkout.
- Recycled superseded baseline captures and the first two survey packets.
  Keep the original map and final packet for Claude; remove them after his
  verdict is committed. No other lane or branch removed.

## Removed

Replaced the capped six-row label nudge. Recycled this run's `.qa-dist`
and `dist` output and superseded captures; recipes, the final evidence and
one compressed review sheet remain. No new art or runtime dependency.
Runtime asset bytes are unchanged; the retained review sheet adds 451,023
bytes (within its 500 KB cap). Shared review-folder size remains an advisory
janitor item; no unrelated assets or branches were removed.

## Leg fuel audit

All amounts are kg against a 400 kg tank; `!` exceeds the tank.
These are cruise charges only: climb, approach and sightseeing also burn fuel.
Ardennes is shown for chart completeness but has no landing zone. Summit
legs assume the Summit destination and truck are enabled; the survey's
helicopter/pilot-map visit did not have rescue on and did not offer Summit.

1: Tremblant Woods; 2: Tremblant Snow; 3: Panorama Ridge; 4: Summit Run; 5: Ardennes Forest; 6: Eifel Crown; 7: Alpine Serpent; 8: Cloudbreak Skyway; 9: Ridge Rally; 10: Timberline Checkpoint Rush; 11: High Country Grand Tour; 12: Red Mesa Corkscrew; 13: Pacific Canyon Circuit; 14: Harbour Lights; 15: Harbor & Highlands; 16: Neon Docks Circuit; 17: Neon Drift Trial; 18: Midnight Muscle Chase; 19: Titan arenas; 20: Azure Riviera; 21: The Table.

| From / to |1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 |-|25|120|160|115|185|275|335|200|265|340|225|290|215|235|245|245|245|145|215|205|
| 2 |25|-|110|150|100|170|255|315|195|250|335|230|300|225|240|255|255|255|155|230|215|
| 3 |120|110|-|90|180|225|190|235|105|160|240|165|270|320|335|355|355|355|255|320|175|
| 4 |160|150|90|-|245|275|145|175|75|85|175|160|285|400|405!|430!|430!|430!|330|395|200|
| 5 |115|100|180|245|-|85|265|335|275|300|410!|320|395|190|175|220|220|220|130|250|305|
| 6 |185|170|225|275|85|-|255|320|320|315|445!|375|465!|235|200|265|265|265|190|315|375|
| 7 |275|255|190|145|265|255|-|75|215|115|265|300|425!|450!|435!|480!|480!|480!|385|480!|340|
| 8 |335|315|235|175|335|320|75|-|235|115|245|320|450!|515!|500!|545!|545!|545!|450!|540!|370|
| 9 |200|195|105|75|275|320|215|235|-|130|145|95|220|405!|425!|440!|440!|440!|340|380|140|
| 10 |265|250|160|85|300|315|115|115|130|-|160|215|340|465!|470!|500!|500!|500!|400|470!|265|
| 11 |340|335|240|175|410!|445!|265|245|145|160|-|170|275|545!|565!|580!|580!|580!|480!|515!|235|
| 12 |225|230|165|160|320|375|300|320|95|215|170|-|135|420!|450!|450!|450!|450!|355|365|70|
| 13 |290|300|270|285|395|465!|425!|450!|220|340|275|135|-|440!|490!|465!|465!|465!|390|355|100|
| 14 |215|225|320|400|190|235|450!|515!|405!|465!|545!|420!|440!|-|75|40|40|40|75|125|375|
| 15 |235|240|335|405!|175|200|435!|500!|425!|470!|565!|450!|490!|75|-|85|85|85|105|195|415!|
| 16 |245|255|355|430!|220|265|480!|545!|440!|500!|580!|450!|465!|40|85|-|5|5|110|135|405!|
| 17 |245|255|355|430!|220|265|480!|545!|440!|500!|580!|450!|465!|40|85|5|-|5|110|135|405!|
| 18 |245|255|355|430!|220|265|480!|545!|440!|500!|580!|450!|465!|40|85|5|5|-|110|135|405!|
| 19 |145|155|255|330|130|190|385|450!|340|400|480!|355|390|75|105|110|110|110|-|135|320|
| 20 |215|230|320|395|250|315|480!|540!|380|470!|515!|365|355|125|195|135|135|135|135|-|315|
| 21 |205|215|175|200|305|375|340|370|140|265|235|70|100|375|415!|405!|405!|405!|320|315|-|

## Claude's review (27 October 2026, night)

See MAP-FINISH-LIVE.md: switch-state assertions follow the go-live; verdict merge and release.
