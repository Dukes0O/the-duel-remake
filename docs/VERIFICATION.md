# Remake verification

## Release preparation, 25 October 2026

Prepared for Claude, the Release Manager. This is a record of the work and
checks since the Summit release at `9279efa4`, through `7ebd219f` on
integration/wasteland. It covers all 81 change notes named by
`git log --name-only 9279efa4..HEAD -- docs/changes/`. Release
(Claude, Release Manager, 25 October 2026): The Deep switched on and the Jesko
freed; CPU racecraft stays dev (Ardennes full-field player crash, card
GP-RACECRAFT-ARDENNES). Full tier on release commit `2b4d3926`: 509 passed,
0 failed, 0 not run (2,313 s). Since then only docs changed. Frame check for
The Deep at the kelp forest: High and Performance delivered p95 16.8 ms. Night
browser run 140/147: deep-art-final-sheet now manual-only, audio-race fixed
(QA-AUDIO-RACE-LAUNCH), lap-telemetry, p4-daynight and track-kits are older
failures on QA cards. Staged build and installation checks follow below.

### What players get now

The current switch list keeps the helicopter, Summit, Yeti and ordinary
Grand Prix on. Fixes without a new switch reach those existing features:
grass, tufts and grit sit on the drawn ground and off every road; road
acceleration is gentler with quick crash recovery; the helicopter hook has
a wider catch window, a guide ring and pilot hints; the Titan launches off
cars again. Chase police and Easy Checkpoint Rush follow the slower launch.
Summit's world builds faster without a scenery change. The Yeti is paler at
night, and Harbour and Panorama have written passing-zone notes.

Course-view, yard, Yeti and race-audio checks were repaired. The scripted
demonstration driver can turn out of scenery pockets. These changes do not
turn on the new feature families below.

**Switched on in this release:** The Deep (`the-deep`): drive down the old ramp at Pacific Canyon into the Kelp Coast, meet Ana, log the sea life, find pearls, raise the lost Falcone Sirena with sonar and lift bags, and race the Coast Cup. Also the Koenigsegg Jesko races on every course and in every mode again (Kyle, for Gratian). CPU racecraft and the wide start wait for the next release (an Ardennes crash to fix first).

### Built but switched off

Checked against [the switch list](../src/feature-flags.js) and the course
switches it reads. All the following remain development-only:

- The Lab: benches, challenges, upgrades, radio, Sirena restoration, tuning and lap pay; fan car art is built, registration is still to come (`lab`, `lab-tuning`).
- The Deep: Kelp Coast trail, sea life and log, pearls, radio, sonar, lift bags, Sirena car, armour and Coast Cup (`the-deep`).
- Heli-skiing: five runs, art, flight handovers, snow, medals and saves (`heli-skiing`).
- The pilot's map: places, travel, scouting, secret routes, the Table and reverse-route Team Room notes (`pilot-map` and each secret course's own switch).
- Driving lessons: all four lessons, instructor, road markers, radio, board, results and saves (`driving-lessons`, with `tyre-slip`; gears also needs `engine-curve`).
- Sliding tyres: grip, steering, sound and the Drift Trial launch adjustment (`tyre-slip`).
- Engine curve: pull by revs and gear, automatic shifting and separate best laps (`engine-curve`).
- Racecraft: rival nitro, pace and first-lap defence; the four proposed passing moves remain disabled (`cpu-racecraft`).
- Earned cars: McLaren F1 and Bugatti Bolide models, armour and medal access (`earned-cars`).
- Helicopter rescues: mission rules, saves, board, drawings, autopilot, Summit arrivals, clocks and fuel stops (`rescue`).
- Helicopter wildlife and skins: surveys, pay, paint, gear, dirt, washing and saves (`wildlife`, `heli-skins`).

### Last night's full check and follow-ups

[Night report](board/checks/night-2026-10-24.md) and
[detailed results](board/checks/night-2026-10-24.json), source
`1d5ad5895a6e8c6b85c26b5022b0191083411d17`, run overnight on 24 to 25 October:
full tier **509/509**, no failures or unrun suites, four jobs; combat balance
passed on current rules. Browser batch **140/147**, so the batch failed.

The four behaviour or readiness failures and their follow-up cards were:

| Browser check | Result and follow-up |
| --- | --- |
| `audio-race` | New after FIX-LAUNCH (`46c6d520`); QA-AUDIO-RACE-LAUNCH moved the bomb probe to 4 s, kept the crossbow at 1 s and kept every assertion. Race audio and listening then passed three times. |
| `lap-telemetry` | Timed out waiting for the High Team Room comparison; QA-BROWSER-SWEEP. Also failed alone and on older `bab0036b`. |
| `p4-daynight` | Timed out waiting for the native path and rear-view frame; QA-BROWSER-SWEEP. Also failed alone and on `bab0036b`. |
| `track-kits` | Timed out waiting for the High kit world and shader preparation; QA-HARBOUR-ROAD-CLEARANCE, tracked by QA-BROWSER-SWEEP. Also failed alone and on `bab0036b`. |

The other three batch failures were `audio-baseline` (repeat-control check,
QA-AUDIO-BASELINE-CONTROL), `deep-art-final-sheet` (a picture recipe needing
manual inputs, made manual-only in `9c1211d0`) and `frame-pacing` (the batch
could not reuse the frame evidence). They remain part of the original seven;
the follow-ups do not rewrite the 140/147 result.

The original High frame run failed at 34.3 ms with Claude's browser tab open;
Performance was 18.2 ms. World builds were 415/387 ms and full first loads
4.20/3.64 s. After closing that tab, the separate run of `frame-pacing`,
`tremblant-snow` and `tremblant-views` passed alone, as recorded in the
[run log](board/run-log.md). That log gives no replacement timing numbers,
so none are inferred here.

Since the full-tier source, changes through `7ebd219f` are board and notes,
the manual-only art-recipe listing, and the race-audio probe fix. No game
source changed. The audio fix passed its 16-suite lane check, replay checks
and production build. Its separate crash-audio wrapper passed 23/23 twice,
then 22/23 while the laptop was busy, then 23/23 alone on the permitted
rerun. No sound limit or assertion changed. The run log's shorthand that all
three audio checks passed three times is qualified by this
[actual receipt](changes/QA-AUDIO-RACE-LAUNCH.md). This preparation does not
claim that the remaining browser failures are cleared.

### Merge evidence since Summit

The [run log](board/run-log.md) records each merge's checks and conflicts.
The grouped receipts below cover the change notes; counts are the recorded
results, not fresh runs. Builds passed unless a limitation is stated.

| Work | Recorded merge checks and limits |
| --- | --- |
| Grass and ground lookup | FIX-GRASS-GROUND checked every road and the Tremblant hairpin picture. PERF-GROUND-ROWS checked 35,076 heights, all 20 courses' drawn data, replays, world composition and Windows/art suites. Drawn values stayed identical after the speed-up; its laptop timing was left to the full check. |
| Gentler launch and Titan air | FIX-LAUNCH: launch, replays, Windows suites, lessons, checkpoint recovery, campaigns and race field. DEMO-DRIVER-UNSTUCK then cleared the Hard seed 1993 combat failure. FUN-TITAN-LAUNCH, SKI-SAVE and TYRE-SLIP-DRIFT-RETUNE: combined 44 suites, combat balance and build. Titan at 30 mph: 1.3 s airborne, 3.7 m high. Drift recovery: 4,828 points, assertions unchanged. |
| Hook, Yeti and Team Room | FIX-HELI-HOOK: builder 204/204 and first-flight browser check; combined helicopter suites passed. YETI-FUR-TINT: accepted first picture round. TEAMROOM-VARIANT-NOTES: 51/51, Team Room browser check and wording review; reference laps unchanged. Only parent-course passing notes reach players now. |
| Summit loading | SUMMIT-BUILD-TIME: High 1,444 to 845 ms, Performance 1,451 to 890 ms; first loads 7.3/5.0 to 6.7/4.4 s. Drawn data matched across 26 builds. These are construction measurements, not a frame pass. |
| Scenario and test repairs | QA-ARDENNES-FRAME-READINESS restored 32 Ardennes pictures, Panorama, Stavelot and existing Grand Prix. FIX-MANIFEST-AWAIT removed the underlying loading loop; 15 suites and all five affected browser checks, including Yeti, passed. QA-YARD-HOME-AIR-ONLY passed the Jesko refusal; QA-YETI-THREE passed the encounter. QA-TEST-AUDIT: Windows-only suites, test runner, helicopter, board, placement and build; Claude reviewed changed and removed checks. QA-AUDIO-RACE-LAUNCH evidence is above. |
| Rescue family | RESCUE-SAVE: 283/284, missing preview switch fixed and its suite passed. RESCUE-ENGINE 140/140, HOOKS 154/154, AUTOPILOT 156/156, VIEW 161/161, FINISH part 1 50/50. Save and money reviews cleared; final look round 3 accepted. SUMMIT-HELI-RESCUES 140/140, SUMMIT-TUNE 148/148, SUMMIT-ARRIVAL 145/145, with combined helicopter checks. Final flying, frame and fuel-routing work remains on RESCUE-FINISH. |
| Wildlife and skins | SKIN-SAVE 284/284, SKIN-RULES 23/23, WILD-SURVEY 141/141, SKIN-GEAR 38/38, SKIN-HOOKS 158/158; save, money and code reviews cleared after recorded fixes. Combined helicopter checks passed; switch-off comparisons held. |
| Sliding tyres and racecraft | TYRE-SLIP: final conflict checks 19/19 and build, code/save review clear, released driving comparisons held. GP-RACECRAFT: switch, preview and race-field checks after merge conflict. GP-PASSING-2: Windows, race field, switches, replays and existing Grand Prix; a throwing nitro label was fixed. None of the four passing types passed its batch, so they remain disabled; wider-start work is separate. |
| Driving lessons and engine | DRIVE-LESSON-1 24/24; lesson 2, HUD, lesson 4 and helipad work passed their lesson and browser checks. SAVE-2 had an independent save review. LINES-2 supplied 32 radio takes. ENGINE-CURVE passed engine, launch, replay, lesson, field and Windows checks plus existing Grand Prix. DRIVE-LESSON-3: 17 suites and reviewed assertion change. VIEW-2: 43/43, both browser checks and look; the faint ice sign remains on DRIVE-LESSONS-FINISH-2. |
| Earned cars | EARN-CAR-2 builder 399/399; EARN-CAR-3 401/401. Combined vehicle, medal, earned-car screen, lesson, helicopter and switch checks passed. Eight-car Panorama timing remains on EARN-FINISH. |
| The Deep and Sirena | DEEP-TRAIL 29/29. SIRENA-ART 39/39; SIRENA-CAR passed in the 63-suite map/Lab/car batch. DEEP-SIRENA had an independent save review and ten Deep suites plus save checks. DEEP-LOG, LIFE and SIRENA-VIEW passed their Deep, save, Windows and browser checks; VIEW used 26 suites. RADIO supplied 16 Ana lines. SIRENA-KIT look accepted. ART-FINAL 57/57 and both browser checks; VIEW-2's combined merge added 28 Deep/lesson/save/Lab/replay checks. Final frame timing remains on FINISH-DEEP. |
| The Lab | ART and BENCHES passed their model/rules checks; RULES and HELI passed save and helicopter suites with save reviews. HELI-CHALLENGES passed helicopter/Lab suites and first flight; its practice fire was moved after the first layout proved unwinnable. SNOW passed in the 63-suite combined batch; RADIO supplied 54 lines. VIEW: 45 suites and three browser checks. RESTORE: save/pay review, Lab/Deep/save suites and two browser checks, look round 2. TUNE: save/pay review, combined lane 632 checks and build after a duplicate import was fixed. TUNE-VIEW: 91 suites, scenario and look. FAN-ART: 41 suites, build and combined car/Lab/replay checks; registration remains LAB-FAN. Bench framing remains LAB-FINISH. |
| Heli-skiing | RULES and RUNS passed ski, helicopter and switch checks. ART accepted round 2. SAVE had a save review and the combined 44-suite pass. HELI: 41 suites and first flight. VIEW: 45 suites and ski, map, first-flight and Yeti browser checks after conflicts; look round 2. Pickup-pad placement remains SKI-FINISH. |
| Pilot's map and secret routes | ART accepted after three rounds, ART-2 after two. DATA and DESTINATIONS passed combined helicopter, map, lesson, Lab and Windows suites. SECRETS part 1: 37 suites, first flight and Team Room; part 2: map/save/helicopter suites and save review. VIEW: 42 suites, first flight and corrected map browser check; look round 1. |
| Build tracking | COCKPIT-TRACKING links board cards to Cockpit tasks and preserves chosen final statuses; failures warn without blocking a merge. The 24 October cleanup records an earlier full 463/463 on `8b3be049`; it is not a substitute for last night's result. |

Change-note handling follows the Summit release: its collection commit
`f63b602a` kept the feature notes. Nearby releases deleted their temporary
RELEASE-FIRE and RELEASE-ARDENNES installation notes, rather than sweeping
all feature notes. The 81 source notes are retained here, including their
reviews, changed-test reasons and unfinished acceptance work. No assets,
code, saves or change notes were removed by this preparation.

Preparation checks: `node tools/test-repo-hygiene.mjs` passed (size targets
are advisory); `node tools/test-board.mjs` passed all 191 checks.
`node tools/build-status.mjs` refreshed the required status snapshot and
reported the full tier as stale for this branch's current commit. The
historical results above apply to their named sources.

## Summit Run installed, 16 October 2026

Release Manager: Claude, under AGENTS rule 18 (Kyle: "Follow rule 18 and
release Summit"). Live master is 9279efa4 (fast-forward from 42dcb5b6; code
equals 3abe9e00); production build 20261016154751-da048a9de7b2, built in the
live folder's dist-next. All 537 staged files matched over HTTP on private
port 5188; assets went into dist first and index.html and build-version.json
last, then a mirror left dist holding exactly the new build (four old files
gone). All 537 live files match over HTTP on localhost:5174. The live server
was not running after the overnight restart, so it was started hidden on 5174
with no browser opened. No tab refreshed, no save read or written, no rollback
build kept.

What changed for players: `summit-run` on (Summit Run, 2,600 credits, and the
free Summit Time Attack), `yeti` on; Team Room intel levels, reference ghosts
and engineer notes; the optional Coach; Ardennes braking boards and Stavelot
stone houses. The Ardennes far forest band is not in this release.

Evidence (details in docs/changes/RELEASE-SUMMIT.md): full tier 455/455 alone
on 7f108454 (rule 19 covers 3abe9e00); combat balance flags []; frames headed,
eight cars, panel off: Summit p95 16.8 ms both qualities with world build
about 1.5 s shipped as a warning (Director decision, SUMMIT-BUILD-TIME to fix),
Ardennes 16.8 ms both qualities without the far band. Browser scenarios were
still running at install and do not hold the release; results follow in the
inbox.

## Forest fires installed, 15 October 2026

Kyle asked for this release under AGENTS rule 18 ("Follow rule 18: release H2
Fire"); Claude was Release Manager. Live master is
42dcb5b6b14c334c75158e96f73bda2683274b3d (fast-forward from 7d430cd0);
production build 20261016043241-239fa3b298d2, built in the live folder's
dist-next. All 537 staged files matched over HTTP on private port 5188; the
assets went into dist first and index.html and build-version.json last, then
a mirror left dist holding exactly the new build; all 537 live files match
over HTTP on localhost:5174. No browser tab was opened or refreshed, no player
save was read or written, and no rollback build is kept (fix forward). The
live server was not running, so it was started hidden on 5174 with no
browser opened.

What changed for players: the `forest-fire` switch is on (H2 Fire: fire
calls, the bucket, drops, fire out pays 1,500 credits and the firefighter
badge, a lost fire closes Tremblant Woods for 10 play days with a buyback and
regrowth, seasons with no fires in winter), the main menu says why START is
closed on a burnt course (release review fix), and Ardennes' braking boards
sit 2.4 m from the road edge (bf358e5a).

Checks (rule 19): the full tier on ac8fd6c3, which already carried every H2
card, ran 452/453 alone with four jobs, its one fixture gap fixed and passing
in its own reviewed lane; combat balance passed on ac8fd6c3 (51 policy runs,
90 baseline races, no flags) and nothing combat-related changed since. The
release lane tier covered the switch and every suite that reads it: 267/267,
jobs 4, 2015 s; build passed. One independent release review: fit to ship,
with the silent START fixed before release. H2's browser checks on the same
code: FIRE-VIEW's look and frame check (p95 18.2 ms on High and Performance
over a 43-cell fire and racing on the burnt course) and FIRE-FINISH's
play-through (a fire flown out and paid in 2 drops; a fire left to burn,
lost overnight, the course closed with its buyback). No push to GitHub.

## Ardennes installed, 15 October 2026

Kyle requested installation and explicitly directed no duplicate full run after the sole test fixture correction. Live master is 7d430cd011de0145f404b7b24500e26ac011d881; production build20261016030307-f35c5308abb7. All537 staged files matched private HTTP, all537 installed files match their hashes, and live5174 entry/manifest matched. Ardennes Forest is on at2000credits. Reload from the menu when ready; no open tab was refreshed and no real saves were read or written. Summit and other development switches remain off.

The accepted implementation55d2b7de passed217/217lane/jobs4/build1.84s and independent review; Claude final art acceptance d807c0e2. Native eight-car packet: zero player crashes/resets, all7CPUs finish. Exact originalac8 full ran alone/jobs4:452/453, zero unrun,1368.216s. Its sole grounding suite omitted the real beech owner and threw before checking a root. Fixture-only89a4a26c preserved every old assertion/tolerance, prepared the unchanged original High/LOD GLBs, and added unique binding/tree conservation/exactXZ/actual-terrain1mm checks. It passed17/17lane/jobs4/197.996s, corrected suite72584checks/3709roots/806far-only, build1.504s and independent review. No game/assets/combat/native inputs changed. All453 suites have passing evidence cumulatively; the original full remains failed and no exact7d full pass is claimed. Kyle explicitly said: “there's no need for more testing, so let's install.” This is a release-specific exception, not a general rule change.

Current-rules combat on unchangedac8 passed51policyRuns/90baselineRaces/flags[]. Only Ardennes' actual scene baseline changed:7e3fd47fd52db506a6e076e33d530868c4b2d9b0be20e2dbbbc73c40f76481a6; foreign baselines/replays exact. Kyle SKIPPED frame timing; no p95/world-build pass. Original1c0 night browser aggregate remains failed119/129; unknown audio causes unchanged.

The install initially retained one Helicopter rollback build20261015161329-187a6c9406c6 (487files/305223013bytes). Kyle then clarified that live releases also fix forward with no rollback builds. That exact owned copy was sent to the Recycle Bin; retained rollback builds now0. The current Ardennes build remains unchanged. Four old hashed assets remain temporarily in live dist to preserve any open old race; current537files verified, no exact537-total claim. Superseded rollback, owned dist-next, both release-copy containers, merged fixture branch and current scratch were normally recycled; dependency/evidence junctions were unlinked without touching shared targets. No foreign cleanup or ACL change. Full original/result, correction gate, reuse proof, Kyle direction and actual install receipt remain under integration .evidence/2026-10-15/RELEASE-ARDENNES. Integration full-tier ledger untouched. No push/history rewrite.

## Helicopter installed, 15 October 2026

Kyle requested exact candidate `1c0cb3d0`; Codex installed it as Release Manager. Live master is `1c0cb3d0b5d134f579bf39cf744d6cd99dc0bb5f`, production build `20261015161329-187a6c9406c6`. Production build staged from the exact Git archive outside live, private5188 entry/manifest/assets verified over direct loopback, then assets copied before entry/manifest. Live5174 HTTP matched; final inventory487/487 files exact. No browser reload or player-save access. Helicopter is on; Summit/Yeti stay dev.

Original exact-source full check passed444/444 full suites, quiet Harbour frames (High18.2ms/world517ms; Performance18.4ms/world553ms; first-load6094.5ms warning), current-rules combat and both helicopter scenarios. Browser aggregate remains119/129, FAILED, with ten existing follow-up failures. Unknown audio causes remain unknown. Installation follows Kyle's explicit morning instruction after that failed-batch handoff; no all-green claim or check repetition. Existing large-chunk build warning retained. Staged verification was static HTTP, not a new browser runtime pass.

One rollback build `20261014035636-e7c3f590285b` is retained in live dist-previous; the superseded rollback, live dist-next and owned temporary staging were recycled. Install receipt is integration `.evidence/2026-10-15/RELEASE-HELICOPTER-1c0cb3d0/install-receipt.json`. No push/history rewrite; nightly continuation stays paused.

## Steering and race screen release, 13 October 2026

Kyle approved going live once green (13 October); Claude was Release Manager.
Before release Kyle rejected the on-screen corner warning panel, so it was
removed (d34bf40f, one independent review CLEAR); the larger trackside boards
stay. Installed at about 04:00 UTC on 14 October from exact commit
`d34bf40f`; live build `20261014035636-e7c3f590285b` verified over HTTP.
Full tier 423/424 alone with four jobs (1705.49 s); `test-drive-through`
failed once under full load and passed on its single rerun on the same commit
(rule 3). Combat balance `--check` passed. Codex's native evidence on eab3b136:
real Harbour keyboard lap 90.26 s with no crash, reset or stop; stock autopilot
trace unchanged; 1080p and 1440p screen views with no overlaps.

Frame check (headed, eight cars, Harbour Lights at night) did not pass on the
laptop tonight for either version: candidate first run High p95 50 ms and
Performance 33.4 ms, second run 33.4 and 33.3 ms; the live build bb8d3a99
measured the same way gave 33.4 and 33.3 ms, with construction about 5 to 6 s
on both. The release does not change frame cost; the shared slowdown is a
laptop or tool condition to investigate (frame-check card). Staged build on
port 5188: a Pacific Canyon Rival Duel showed the larger map and mirror and no
corner panel, with no browser errors. Previous build (laps and snowmen) kept
in `dist-previous`. `master` pushed to GitHub.

## Laps, snowmen and fixes release, 13 October 2026

Kyle approved (13 October: release with full tests; "install it"); Claude was
Release Manager. Installed at about 19:55 UTC from exact commit `bb8d3a99`
(integration `eb12ed1f` plus lap choice 2 to 6, the lap-choice and snowmen
switches on, and the leaderboard default-length fix). Live build
`20261013195337-21614651644c` verified over HTTP. Full tier 423/423 alone with
four jobs (1481.68 s); `test-drive-through` failed once on a tool problem (its
historical `tar` step under Git Bash) and passed on its single rerun from
PowerShell on the same commit. Combat balance `--check` passed. One independent
pay review: no code faults; one design gap (fixed per-race bonuses are not
scaled for shorter races) accepted by Claude and recorded on LAP-CHOICE.
Staged build on port 5188: lap buttons 2 to 6, a 3-lap Pacific Canyon Rival
Duel started as LAP 1 / 3 over 12.0 km, no browser errors. No frame check: no
rendering change in this release. Previous build (Panorama) kept in
`dist-previous`. `master` pushed to GitHub.

## Panorama Ridge release, 12 October 2026

Kyle approved ("go live"); Claude was Release Manager. Installed at about 02:57
UTC on 13 October from exact commit `36d7613f`, which also carries the
Tollkeeper fix released earlier that evening (`bf1ac981`); live build
`20261013025710-9bb819fa7c33` verified over HTTP. Full tier 415/415 in 935.76 s,
alone with four jobs, start and end commit unchanged (an earlier 415/415 pass on
`1f9f4f53` was superseded when the Tollkeeper merge landed). Combat balance
`--check` passed. Native Panorama browser race passed on High and Performance:
eight cars, three laps (115.108 / 89.358 / 87.54 s), no pile-up, no warnings or
errors. Staged build listed Panorama Ridge Sunset 20th at 1,600 credits, locked
until bought, with no browser errors. Frames (screen awake, graphics card idle,
eight-car grid): High p95 18.3 ms, Performance p95 18.2 ms; world build 0.38 to
0.39 s; first start in an empty browser cache waits 3.2 to 4.0 s for files.
Previous build (Tollkeeper) kept in `dist-previous`. `master` pushed to GitHub at Kyle's request.

## Tremblant Snow release — 12 October 2026

Kyle approved ("Go live"); Claude was Release Manager. Installed at about 16:45
UTC from exact commit `1a7a77e7`; live build `20261012164212-a60830f0f831`
verified over HTTP. Full tier 399/399 in 1030.02 s, alone with four jobs, start
and end commit unchanged; combat balance `--check` passed. Staged build listed
Tremblant Snow last at 1,800 credits, opened the Team Room and clicked every map
flag with no browser errors, in disposable storage. Frames (screen awake, eight
cars): Performance p95 16.8 to 16.9 ms on Tremblant Woods and Snow; High p95
33.4 ms with a few dropped frames on both, the same as the live Woods (follow-up).
Overnight timing with the display asleep read about 1 ms slower per frame on
every version and is not used. Previous build kept in `dist-previous`.

## Tremblant and Team Room fixes — 12 October 2026

Kyle approved both fixes for release that night ("yes, put it live tonight",
"yes, put them live tonight too"); Claude was Release Manager. Built from
integration 66281669 plus only TREMBLANT-FIX and TEAMROOM-FIX, so later
integration work (Grand Prix pay) did not ship. Installed at about 07:40 UTC
from exact commit `09fe13ef`; live build `20261012073726-ea597c79fdf7` verified
over HTTP. Full tier 398/398 in 1294.17 s, alone with four jobs, on that commit;
combat balance `--check` passed on the first candidate (0f40abd4), whose only
later change is Team Room picture rendering.

The first staged candidate (0f40abd4) threw a browser error from the menu camera
after a Team Room picture with the player's car parked in frame; the live build
before it was clean. The parked car was removed (09fe13ef) and the staged build
then opened the Team Room, clicked every map flag and closed it with no
errors, in disposable storage. Previous build kept in `dist-previous`.

## Tremblant Woods and arena fixes release — 11 October 2026

Kyle approved Tremblant Woods with the Grand Prix on 11 October and chose to
release Kyle's arena fixes with it. Claude was Release Manager. Installed at
about 02:10 UTC on 12 October from exact commit `8513dc1d`. Live build
`20261012020501-10e60a89f4dd` is verified over HTTP on the live port. The full
tier passed 394/394 in 834.05 s, alone with four jobs, start and end commit
unchanged; combat balance `--check` passed. The staged build listed Tremblant
Woods last, locked at 1,600 credits, with no browser errors, in disposable
storage. Real saves were not accessed and no open race was refreshed.
Previous build kept in `dist-previous`; `dist-next` removed; master pushed.

Contents: `tremblant-woods` on; the three Phase 4 circuits are race-only
(`noCombat`); an unfinished race is saved by course id with the old position as
a fallback only for saves without an id (old save fixtures load unchanged);
tanker valve armour on the HUD; arena wall collision at the drawn face with the
outer-wall gaps closed; one fuel-run beam at a time and a depot arrow.

## Grand Prix release — 11 October 2026

Kyle approved on 11 October ("the Grand Prix is good. we could merge that into
the full game"); Claude was Release Manager. Installed at about 23:45 UTC from
exact commit `7f59e4e6`. Live build `20261011233536-bdcb2ff808e5` is verified
over HTTP on the live port. The full tier passed 390/390 in 925.55 s, alone
with four jobs, start and end commit unchanged. Combat balance `--check`
passed. The staged build on the private port started a Grand Prix on Pacific
Canyon (eight cars, three laps, start lights, standings) with no browser
errors, in disposable storage; real saves were not accessed and no open race
was refreshed. One rollback build is kept in `dist-previous`; `dist-next` is
removed.

Switched on: `grand-prix` (Pacific Canyon and the Team Room). Tremblant Woods
was approved with it but stays dev until its course-list review
(claude/release-tremblant) passes; it follows as its own release.

## Polish release — 10 October 2026

Installed 10 October at 19:56 UTC from exact commit `1046076a`. Live build
`20261010195525-87b479fc74c0` is verified over HTTP. The full tier passed
371/371 in 937.27 s, alone with four jobs, with clean start/end source and
unchanged commit. A prior attempt was interrupted after a separate Claude lane
started competing tests; its partial result is not used as release evidence.
The staged production build passed High and Performance menu/race checks at
72 and 71 km/h, with zero browser warnings/errors and disposable memory-only
storage. Real saves were not accessed and open races were not refreshed.

One rollback build is retained in `dist-previous`. The staged server and
`dist-next` are removed. Old hashed live assets are retained for open races;
pruning them is deferred until those races no longer need them. Remote backup
is held by the existing binary-history compaction approval and protected refs;
no history was rewritten and no protected work was removed.


Kyle approved the Height and Seeker changes, accepted Smoke round two and
Arena round two (final), and authorized Smoke, Flame and Arena merges in
that order followed by the full tier and a real-game release. Flame round
one was already approved. Seeker rockets are on in production; career
backup stays dev. No save format or settlement behavior changes.

Ordinary arena armor is 1.21 instead of 1.20. Medium wrecks average 13.833,
within the unchanged 10–14 range. Warlord health is exact. Reviewed arena
replay changes contain only the added armor; other movement fields match.

Seeker damage is 8; legacy Pods and Gunn stay 10. Matched thirty-seed runs
complete all sixty races: off 80 armor / 447 firings, on 112 / 471 firings,
ratio 1.3286624203821655. Kyle explicitly accepted this exception to the
original 1.3 target. The original metric check still reports the excess; no
sample, threshold, rounding rule or damage-attribution assertion changed.

Approved Smoke covers the car at the measured distances: High visible
fractions 7.779%/2.460%, Performance 0.886%/2.127% at 10/25 m, all below 10%.
Wren retains its native 2.5 m radius; its sheet makes an appearance/haze
claim, not full F42 coverage. Actual-source frame p95 rises at most 0.595%;
preparation/render work p95 at most 5.714%. Flame p95 rises 3.3% in High
and is unchanged in Performance; the High mean rise was explicitly accepted.
Arena frame p95 stays 16.8 ms in both qualities. These source comparisons
use 3af7f15c, whose game source equals released master e4b82b0b.

Combat balance checks pass on ac01cbe6 with both explicit configurations.
The legacy weapon baseline has Easy/Medium/Hard wins 26/19/8 out of 30
(727.43 s). The released arsenal, wave-three, computer-crew and Seeker
configuration has 28/19/10 wins (787.31 s). The retired wasteland2 switch
cannot be tested as an off/on pair; these reports name their actual flags.
The independent paired Seeker damage exception above remains unchanged.
Source review through Arena merge 2bbabd9f confirms only presentation code
changed after those reports. Final promotion changes only the explicitly
overridden catalog state; simulation and balance-report code remain exact.

Height checks cover 43,745 finite colliders with unchanged grounded sweeps,
21 native crossing cases, 36 browser clear/touch/grounded cases and six native
UFO actions in both qualities. UFO remains an instant relocation. Derived
bounds add one-time construction work, with the largest measured addition
219 ms CPU on Eifel Crown; no per-frame geometry work was added. Two arena
control pins changed only for the approved armor fields (16 and 30 values);
movement, clock, scores, authored geometry and ordinary replay pins stay exact.

Smoke merged after 367 lane suites, build and review passed. Its only later
fixture correction calls the real camera-preparation phase before measuring
puff instances. All 22 original Oil/Smoke checks remain, and the full native
arsenal runtime suite passes 209 tests. No assertion or tolerance changed.

Flame merged after 368/368 fresh lane suites (620.71 s), build (494 ms),
and independent review. Its new licensed texture entry changed the catalog
snapshot. The reviewed digest update preserves every old catalog entry,
the separate Factory provenance snapshot, and all 30 source checks.

The browser release sweep distinguishes current scenarios from historical
art-fit recipes. Seven require obsolete or deleted private candidates, an old source/input
comparison, an obsolete launch mode, or pre-limiter audio equality: arena-shove, convoy-tanker-art,
first-person-polish, rustwall, rustwall-frame, vesper-art, and audio-baseline. Their assertions and pins
remain unchanged. Current native arena, convoy, installed hand/weapon,
hidden-road and earned-Vesper scenarios supply released-game coverage;
the approved art/frame verdicts above remain the visual acceptance.
This is an explicit scope limit, not a pass for those historical recipes.

The attempted audio-baseline run also exposed its own reference-repeatability
failure (1.648e-5 versus 2e-6). More fundamentally, it still requires exact
final-output equality with pre-limiter cf72d9c. Approved c0bb9b18, already
in master, intentionally inserted the final limiter; upstream differences
remain at or below 2.4e-7. No baseline assertion was edited. Current native
crash-audio coverage passes through its dedicated test runner (22.44 s in
the release lane), including actual output routing, peak limits, timing,
quiet-signal preservation and recorder cleanup. Its generic scenario needs
the private recorder page supplied only by that dedicated runner; the
generic navigation rejection is not recorded as a browser pass.
The historical Rustwall timing recipe starts ordinary Duel, which correctly
no longer exposes the Hidden Road. Current visit scenarios use the real
entry; frame pacing is compared with the last release separately.

Release-switch fixtures keep the old straight-flight, 10-damage cases
explicitly off, preserving their numeric and geometry assertions. Added
production-default witnesses verify 8 damage once and a real fighter
intercepting a seeker before its target car. The Fuel Run witness picks up
a generated canister through the native rule before acquiring its target.
Focused convoy checks pass 43 tests/401 checks; fighter contacts pass
11 tests/120 checks. The two initial new-witness setup failures exposed
normal Fuel Run target eligibility and ordinary-arena exit restrictions;
only those new fixtures were corrected, with no gameplay change.

Arena merged after 369/369 fresh lane suites (618.11 s), build (521 ms),
62 focused native tanker checks and independent review. The old test's
shared-material assumption was replaced with exact approved near/far
materials and 1.2/4.5 brightness. Both views retain color, timing, on/off
and recovery checks; geometry, input, non-lamp materials and disposal remain
protected. No runtime or asset change followed the approved art.

The final release-switch candidate b57e3dcd passes 369/369 lane suites in
623.48 s and its production build in 452 ms. The first lane stopped on two
voice cases whose flat-course mock omitted nearest; adding the exact inverse
of its existing point mapping fixed all 26 voice cases without disabling
seekers or changing assertions. Root review is clear.

Art intake passes: seven planned images present, no missing images or failures,
15,569,098 bytes. The generated storage model uses 3.48 MB of its 4.00 MB
budget for eight full players, records, archives and a full ghost reservation.
The 64-player boundary case fits at 2,500,506 bytes with a future maximum
ghost write after the existing origin move; no real career is read or trimmed.

The evidence-only native arsenal recorder passes all original checks in both
qualities, with zero measured chunk-clock gaps and no browser warnings/errors.
Its independent sample witness is also continuous: 588,927 retained frames
in High and 587,647 in Performance for each of mix, engine and weapons. This
proves the new capture, not the cause of earlier failures. Silent weapons-bus
intervals correctly report absent input channels; the same original zero-fill
and audio-quality checks remain. No assertion, clock label or tolerance changed.
The existing callback-diagnostics card retains the unresolved earlier cause.

The final A1/candidate/A2 driving comparison uses 120 frames per quality, full
render scale and the live rear-view mirror. Every p95 is 16.8 ms and p50 is
16.7 ms. The candidate has no frames above 33 ms; baseline A2 High has one
33.4-ms frame. Other maxima are 16.8–17.0 ms. Final Smoke Screen visible
fractions at 10/25 m are High 7.806%/2.690% and Performance 0.886%/2.127%,
all below the unchanged 10% limit. Wren remains the accepted small-radius haze,
not a full-car concealment claim.
The corrected convoy fixture removes the duplicate Three engine. Its retry
keeps delivered frame p95 at 16.8 ms throughout, but Performance pair two GPU
p95 is 9.704448 ms for the tanker versus 8.369152 ms for the box: +15.954974%,
above the unchanged 10% limit. Other pairs pass. Source review found no concrete
fixture defect. Approved distant lamp scaling and roof emissive mapping can
add work; the result is not dismissed as noise. The passing comparison with released
master is separate evidence and cannot turn this failed box comparison
into a metric pass. Blackiron's unchanged retry passes at 33.4/16.8 ms High/Performance.

The current browser tally is 94 passing and three failing scenarios out of
97 applicable generic scenarios. Seven historical recipes are excluded above;
audio-crash-peak is covered by its dedicated runner. Earlier raw failures are
retained separately from these final verdicts.

Two collision expectations fail identically on the candidate and an isolated
checkout of installed master e4b82b0b with the same reviewed fixtures. The
clean 140.7-mph stationary traffic contact produces knock, not a physical
smoking wreck. The ram target reaches lateral 7.110145 m after 24 ticks while
the native road half-width is 7.699509 m, so it is still on the main road.
Both builds have the same impact, motion, damage and crash results. The polish
did not introduce these two results. Their expectations remain failed; no
speed, timing, location, threshold or outcome assertion was changed to pass.
Bounded investigation is closed; the exception below settles the release decision.
Kyle relayed Claude's release decision on 10 October: accept the tanker GPU
excess because delivered frame pacing is unchanged and the distant lamps were
requested. Accept the two identical installed-build collision failures as
stale checks, not regressions. These three results remain recorded failures
with explicit release exceptions; they no longer hold installation. After
installation, QA-STALE-COLLISION will update the two checks to current rules
or delete them if they test removed behavior. No further QA investigation.

The final reviewed QA lane passes 370/370 suites in 895.32 seconds and the
production build passes in 580 ms. All reusable QA repairs are retained.
The exact final integration full-tier run follows this promotion merge.
This section does not yet claim that the candidate is installed.


## The Wasteland as a Mad Max easter egg — September 25, 2026

Kyle asked for nothing new on the main menu beyond Mad Max Duel, with the
Wasteland found while racing it, and approved the release in writing. A review
of the BETA-01 candidate found an Experimental button on the menu, a Hidden
Road present in every race mode on Pacific Canyon, and the Wasteland rules
(crew, armor, loadouts, on foot, raiders) applied to every Mad Max Duel before
the gate was found. EGG-REL removes the Experimental menu and the menu on-foot
camera setting (C still switches it on foot) and switches `wasteland2` and
`hidden-road` on. The Hidden Road and Rustwall now exist only in Mad Max Duel
(and the post-discovery WASTELAND visit). A race uses the Wasteland rules only
when its player had found the gate at the race start. Before that, Mad Max
Duel plays as it did in the live game. Garage hints count finished Mad Max
Duels on Pacific Canyon only. `src/wasteland-access.js` holds these rules.

About a dozen tests changed, each because its rule changed on purpose: switch
states moved from beta to on, road tests drive in Mad Max Duel, the hint count
excludes other modes, and the audio routing baseline names its switches
explicitly. The ordinary-race road fingerprint is unchanged against its stored
baseline. A new check shows the road does not change Mad Max driving. The
EGG-REL tree passed 271/271 suites and the production build. Private
memory-only browser checks passed with no warnings or errors: smoke, the
journey from a plain menu through a pre-discovery Mad Max Duel, the dirt road,
gate, Enter, yard and back to a Mad Max Duel with Wasteland rules, and Hidden
Road discovery (hints, Turn back, reload, a second player who
sees nothing, and the direct visit). Earlier BETA-01 evidence at 74646e8: full
270/270, combat balance off (wins 9/6/2) and on (8/5/3, Easy CPU hits 3), save
checks and private smoke. Current wall, crew and first-person hand art are
still being polished.

Release gate on the exact candidate 28ca5f6: full tier 271/271, clean start
and end. Combat balance passed with the Wasteland rules off (wins 9/6/2 of ten
at Easy/Medium/Hard) and on (8/5/3). Before release, the live launcher failed:
the rolldown native package in the live folder had lost its `package.json`.
`npm ci --offline` restored the locked packages with no version change. The
live folder fast-forwarded from eb879e5 to 28ca5f6. Build
20260925231031-649657493d40 was checked on a private port, the previous build
was kept in `dist-previous`, new hashed assets were copied first and
`index.html` and `build-version.json` last. No server was running.

## On-foot controls and the R key — September 25, 2026

Kyle, playing the live release: out of the car the controls were backwards.
Projected through the first-person camera, D walked left on screen, A right,
and mouse right turned the view left. FOOT-FIX makes strafing use the camera's
right and mouse right turn right; the gamepad right stick shares that path.
A new test projects each direction through the real camera at four facings;
it failed 4/4 on the old code. At Kyle's request (from Gratian), R no longer
restarts the race; the on-screen Restart button is unchanged. Changed tests
walk to the barrier and slope with A, expect mouse right to lower yaw, and
check that R does nothing while restart settlement is checked through the
Restart path. Exact commit faf5749 passed the full tier 272/272, the build and
the private browser smoke (0 warnings, 0 errors). The live folder
fast-forwarded from 28ca5f6 to faf5749 with no dependency change; build
20260926003909-0b03d903c5cd was checked on a private port and installed assets
first while a live server was running. The server returned the new build
version and landing page; no open tab was refreshed.

## Mad Max roadside collisions — September 23, 2026

Player feedback on the live build showed that traffic and signposts stayed in
place after a hit. CMB-08 makes traffic, cacti, smaller trees, signposts and
chevrons move out of the road below half the striking car's current upgraded
top speed. At or above that closing speed, they break apart with pooled debris
and leave the scene. Both outcomes slow the car by at most 25 mph without
taking player armor, a crash slot or race time. Large fixed scenery stays
solid. A traffic hit now calls out `TRAFFIC SHOVED CLEAR` or
`TRAFFIC OBLITERATED`. The `roadside-destruction` switch is on by default in
Mad Max Duel after Kyle's play test; Wasteland 2 remains in development.

The independent CMB-08 tests began red against the old behavior. The final
focused checks pass 23/23, and two lane passes each completed 189/189 suites.
Private High and Performance screenshots show a low-speed traffic car on the
nearest shoulder and high-speed traffic and sign debris. A changed browser
scenario confirms the new HUD message, visible debris and no armor, crash or
time loss; the old scenario's player-crash assertion no longer applies to the
approved rule. First debris rendering measured 10.20 ms against a 7.70 ms
nearby High baseline and 7.10 ms against 7.50 ms in Performance. These short
measurements do not establish long-session frame pacing. The final combined
integration lane passed 189/189 suites before a small road-race balance tune.
The full combat balance check after tuning passed its Easy/Medium/Hard win
targets at 9/10, 6/10 and 2/10, and the focused arena, projectile, collision
and pinned replay checks passed. The 189-suite lane was not repeated for that
tune; final browser and production-build checks are recorded separately.
The final production build passed. All 24 private browser scenarios passed with
no warnings or errors, including knockaway, traffic callouts, ramming, UFO,
Experimental settings and frame pacing. The live server returned the staged
landing page, bundle and build version after the asset-first release.

## Opponent field, checkpoint clearance, and combat sound — September 23, 2026

The simulation now keeps up to three CPU cars in an opponents list. The normal
menu still starts one rival. A scripted three-opponent race completed on every
finishable course; practice has no finish line. The renderer, route map, HUD,
results, traffic contacts, and safe resets use the full field. The next combat
refactor will extend shield and weapon effects beyond the first rival. Splitting
the game simulation and menu screens preserved all 162 pinned one-rival replay
fingerprints.

After a missed gate, a crowded reset searches nearby clear spaces before
moving farther back. Focused checks include full 18- and 24-car traffic grids.
The combined integration merge tier passed **168/168 suites** in 232.68 seconds;
production build and private High/Performance browser smoke passed with zero
warnings or errors.

Combat blast and hit sounds now pan from the impact position and fade with
distance. A fresh private race on the combined build recorded 841 frames,
23 events and seven sound parts with memory-only saves. All ten analyzer checks
passed: 14 timed cues were within 30 ms, engine/rev correlation was 0.982 with
no lag, five measured combat sounds were 6.93–10.45 dB above the engine, and
the mix peaked at −1.532 dBFS with no clipping or measured clicks. This
recording did not include a landing or ordinary crash. The remaining new
weapon and on-foot cues, plus headphone and speaker review, remain open.

A private browser driving sample at 1280 × 720 used the real HUD and rear-view
mirror for 30 settling frames and 120 measured intervals per quality. High and
Performance both measured 16.7 ms median and 16.8 ms p95, with no interval
over 33 ms, matching the previous live build's p95 on this computer. An
earlier 1280 × 800 sample during the long browser sweep had six High-mode
intervals over 33 ms; a separate repeat at that size had one. These short
samples do not establish long-session or all-hardware performance.

## Armored duel and tactical UFO — September 23, 2026

The Wasteland build uses each selected car's top speed,
armor and target mass to set its combat crash threshold. Closing speed drives
vehicle damage and rear-hit force. With **Menu → Experimental** enabled,
traffic can wreck and leave the road, though a hard head-on hit can still
crash the player. Cacti fall on contact in all modes. The
`roadside-destruction` switch also adds falling small trees and signposts.
Broken objects no longer block the car during that race.
The car stops bouncing while stationary beyond the road edge. A missed
checkpoint now retries just before the missed gate. Combat recovery carries a
two-second clock penalty and a short control lock; ordinary race rules remain
separate.

The UFO is a single safe jump of 12/16/20/24 metres by upgrade level. It
charges after the first checkpoint each lap and can be used once per lap. The
HUD previews the actual landing and the callout reports the distance and route
position. It does not move the rival or skip an unearned gate. Across 100
seeded landings on 11 combat courses and 18 shortcuts, no landing crashed or
reset the car in the following two seconds. The balance matrix met the spec's
Easy/Medium/Hard win targets at 8/6/4 of 10 races; the largest measured UFO
race-time gain was under two seconds. One Hard sample finished slower after a
later traffic encounter, so that figure is not a guarantee for every race.

The first full integration tier passed 172/172 suites on the tactical UFO
runtime. Fifteen private browser scenarios passed with memory-only saves,
including a small tree falling while the car kept moving, a visible traffic
wreck penalty, and the UFO landing preview. High and Performance browser smoke
passed. The reviewed save-code refactor later passed its 164-suite merge gate;
its historical save migration fixtures and production build passed. Art intake
accepts the original Wasteland direction board as a reference image. Tileable
textures and flipbooks remain planned, not shipped runtime assets. The second
integration full tier passed 173/173 suites in 346.46 seconds after the launcher
and art reference merged. The roadside browser scenario passed again on that
commit: a small tree fell, the car still moved at 70.8 mph, and the browser had
zero warnings or errors. These two consecutive full checks and browser passes
meet the spec's rule for promoting roadside destruction to Experimental. The
launcher also passed its focused real-server checks on a private port.
After promotion, the production switch test confirms roadside destruction is
off until Experimental is enabled, while the QA-only career-backup switch stays
off. The Experimental browser scenario shows the roadside entry, starts with
the toggle off, and switches it on and off with zero console issues. The
roadside race scenario passed again after promotion with zero console issues.
The final combat balance command passed on the promoted code: Easy/Medium/Hard
won 8/6/4 of 10 races, and the largest measured UFO gain was 1.57 seconds.
The Hard UFO samples were 6.49 and 6.16 seconds slower because of later race
events. Production and QA builds pass; the production build retains the known
large renderer-chunk warning. Art intake and the 3.45 MB / 4 MB save budget
check pass.

The release frame sample compared master `479d857` with the staged runtime
`fbee332` in private Chrome on the same NVIDIA RTX A1000, at 1280 × 720 and
device ratio 1. Each condition used the Pacific driving fixture, 30 settling
frames and 120 measured intervals. High p50/p95 was 16.7/16.8 ms on both
builds, with zero intervals over 33 ms. Performance p50/p95 was also 16.7/16.8
ms on both; the old build had one interval over 33 ms, and the candidate had
zero. This is one short sample per quality. Vsync rounds many intervals to
16.7 ms, and the Performance scenes began four metres apart, so rare jank and
long-session performance need more play testing.

The final staged runtime passed all 16 memory-only browser scenarios: both
quality settings reached an active race, and the save, Experimental, impact,
traffic, roadside, UFO, visual-pose and weapon-bar scenarios reported zero
warnings and zero errors.

## Armory, road pickups, and camera reset — September 22, 2026

D restores chase view without steering. Weapon upgrades now have a separate
Armory beside Garage. Mad Max Duel periodically spawns bounded, expiring road
center pickups that recharge a weapon when crossed, including at high speed.
Camera (95), keyboard steering (92), combat (27), weapon upgrades, and road pickup
checks pass. Production build passes. The isolated browser preview confirms the
Armory button opens all four upgrade cards without changing the user's saves.

## Crash-site recovery — September 22, 2026

Recoverable impacts and rollovers now restore the car at its impact location in
every race mode, with up to 12 metres of clearance when blocked. Recovery retains
legitimate lap-gate crossings interrupted by an impact. Lap validation and water
or map-boundary rescue still apply.

The crash-site checks cover all 16 courses in duel, time trial, and combat modes,
blocked positions, interrupted gate crossings, and rollover recovery. Core tests
(509, long campaigns skipped), off-road physics (8,788), race integrity (601),
combat (27), and police route reset (3) pass. Production build passes with the
existing chunk-size advisory.

## Weapon upgrades — September 22, 2026

Added player-specific level 0–3 weapon builds, garage purchases, saved-profile
migration, race snapshots, and separate upgraded combat records. The weapon
upgrade test covers costs/caps, normalization, persistence, max bomb count,
five-second shield duration, reduced recharge, and leaderboard separation.
Combat (27), progression (27), App progression (141), and custom rival (5,651)
checks pass; production build passes with the existing chunk-size advisory.

The requested local account grant was verified after reloading its temporary
maintenance page. That page was then removed. The active game race was not
reloaded; weapon builds take effect next race. No account defaults were changed.

## Mad Max Duel — September 22, 2026

Added an opt-in combat mode with UFO position/progress swaps, eight-direction
ballistic bombs, swept-hit crossbow bolts, five-second damage shields, and CPU
weapons. Fixed visual pools show projectiles, blast clouds, shockwaves, debris,
UFOs, and shields; combat-only rigs add bumpers and roof crossbows.

`test-combat.mjs` passes 27 checks, including pause/restart isolation, exact shield
duration, incoming damage immunity, bounded pools, UFO checkpoint handling,
separate records, and a complete input-driven combat race saved through App.
Race integrity (601), audio (449), custom rivals (5,651), saved race settings,
progression, driver progression, render reuse, camera, and build-update tests
pass. Production build passes with the existing large-chunk advisory. The QA
build passed before the final cosmetic rig/HUD refinements.

An isolated in-memory Chrome game verified the new mode, all four keyboard
actions and cooldowns, UFO position swap, and visible shield. Screenshot review
identified a style-score/HUD overlap; the combat style score now sits above the
weapon bar. No real career storage was used by this browser check. Full campaign
matrices were not rerun for this change.

## Desktop release promotion — September 22, 2026

Promoted the previously uncommitted rival, camera, and freestyle changes into
the desktop-launched primary checkout. Production and QA builds pass. The live
Chrome menu at `localhost:5174` exposes opponent car, driver, and upgrade choices;
inspection did not change saved selections, credits, or ownership.

Focused checks pass for custom rivals/playground (5,651), camera views (93),
driver UI (66), drivers (1,669), freestyle geometry (55,080), physics expansion
(12,371), build updates (194), camera clearance, saved race settings, drift
leaderboards, and renderer reuse. The core suite with campaign matrices disabled,
progression, progression integration, terrain, and circuit geometry also pass.
The broad runner was stopped during the exhaustive shortcut suite after these
checks; this promotion does not claim a completed full regression run.

Updated the core camera-cycle assertion for all seven supported views and made
the build-update source inspection tolerate Windows line endings. Kept update
eligibility synchronization first in the render lifecycle.

## Direct camera keys

C selects front, B back, V right and X left. Directions follow the vehicle's
heading and height; D remains steering. Camera-button cycling retains hood and
wide views. Side cameras are kept within tunnel walls and below tunnel roofs.
`test-camera-views.mjs`: 93 pose and real keyboard-dispatch checks passed.
Camera clearance (356), App lifecycle (8), rear-view mirror (67), and production
build also passed. No temporary files were created for this pass.

Checkpoint: 20 September 2026. The latest checked update is described first. Later sections preserve earlier checkpoints; their counts and screenshots are historical evidence.

## Playground nitro, speed strip and custom rivals

- Fast core suite: 504 passed, zero failures (`DUEL_SKIP_CAMPAIGNS=1`).
- Production and QA builds passed. Live `localhost:5174` serves build
  `20260921032038-e791ed5ec86a`. Temporary QA output, logs, server and browser tab
  were removed; production build and the live server were retained.

- `test-playground-rivals.mjs`: 5,651 checks. Held practice nitro, ordinary-race
  restrictions, input-only 4 km drives, maximum speeds and stopping runout,
  CPU build/driver arithmetic, player isolation, restart/reload, ownership,
  record separation and one complete input-only custom-rival race.
- Stock Titan reached 209 km/h; factory-max Koenigsegg reached 647 km/h.
  Both stayed on the strip and stopped within its 600 m braking zone.
  Custom Medium rival race completed in 159.62 seconds with one player crash.
- Playground geometry: 55,080 checks, 27,516 terrain triangles; scenery remains
  12 draws / 91,972 submitted triangles. Off-road physics: 8,788 checks, including
  actual mountain climbs. Physics expansion: 12,371 checks. Its driver assertion
  now compares against the installed neutral build, including factory-max cars.
- Existing saved settings, progression, progression integration, driver,
  Koenigsegg driver, ghost, NPC yielding/routing, race integrity, prepared surface,
  practice/route maps, course preview, App lifecycle, renderer readiness/reuse and
  warmup suites passed. Full campaign/expansion matrices were not run for this pass.
- Browser QA used isolated in-memory careers. Verified Koenigsegg/Axel selection,
  factory-max UI, distinct live opponent model, drag entrance and sign legibility.
  Refined the runway edge after screenshot review. No browser warnings/errors.
  Short static scene sample: 60 FPS at the inspected view; not a whole-game guarantee.

## Koenigsegg completion driver — Axel Storm

Axel unlocks automatically with the Jesko, for no extra credits, and is granted to existing car owners on load. Unlocking never changes the selected driver. The four car-specific bonuses are +30% handling, +20% suspension, +30% tires and +20% nitro. They map to corner grip ×1.3, tire braking/loose-surface grip ×1.3, roughness response ÷1.2, and boost acceleration/capacity ×1.2. Base top speed, gearing, other cars, ordinary drivers and banked-credit rules remain unchanged. A bounded `v2` record class keeps the enhanced Jesko separate from neutral bests, leaderboards and ghosts; existing `v1` signatures stay intact.

**12 distinct focused suites pass.** The new driver suite passes 818 checks, including every one of the 56 possible final upgrades, already-owned-car migration, malformed/forged ownership, no charges or auto-selection, player isolation, physical steering/suspension/nitro effects, records and replay persistence. Its actual input-only two-lap Pacific race finishes in **68.88 seconds with zero crashes and 346 replay samples**. The older driver-driving suite also completes both ordinary input-only races. Progression, driver UI, ghost, race settings and busted/quit regressions pass. The broad campaign and expansion-driving matrices were not rerun for this addition.

Compiled browser QA used an isolated in-memory garage. A final 950-credit Titan tank upgrade reduced its wallet from 50,000 to 49,050 and unlocked both the Jesko and Axel immediately. Club Driver stayed selected until Axel was explicitly chosen. The menu showed all four percentages, the Koenigsegg remained at 530 km/h before boost, and the driver note fit at 1,280 × 720. No browser warnings or errors were captured. No live player data was read or changed.

Production and QA builds pass with the existing renderer-size warning. The live `http://localhost:5174/` build is **26.09.20 20:40 UTC · ce3e7f**, ID `20260920204010-ce3e7fe7c777`, entry `index-c2gTHa2T.js` and renderer `render3d-BP8UEfjs.js`. The temporary QA tab, server, generated output and this pass's logs are cleaned after verification; reusable regression tests remain.

## Adaptive Performance graphics

Performance was a fixed lighter preset, not a hardware-specific setting. This pass adds a bounded 80–100% 3D render scale based on delivered racing frames. It requires sustained slow delivery before a five-point reduction and much longer stable delivery before recovery. Loading, hidden tabs, pauses, menus, countdowns, debug draws and configuration-change frames do not train it. The HUD remains native-resolution; physics, saves and the selected quality preference are unchanged. High retains its existing contact shading, bloom, smoothing and 2,048-pixel shadows.

Performance now draws the same scene directly to the canvas with tone/colour conversion and 1,024-pixel shadows, bypassing bloom and composition. It retains its original unsmoothed edge treatment. An initial version accidentally enabled canvas multisampling, increasing Harbor scene GPU median to 10.42 ms; that version was rejected. The final version disables that extra cost. All five custom fragment shaders now have the required display transforms. Warmup matches the direct canvas target; no startup-time improvement is claimed.

Read-only hardware inspection found an i7-13700H, RTX A1000 6GB Laptop GPU and Intel Iris Xe. Browser WebGL diagnostics confirmed the tests used the NVIDIA adapter through ANGLE/D3D11. The same compiled, isolated scene controls were sampled before and after, at 1,280 × 720, device ratio 1.5 and actual Performance render ratio 1. Each sample covers 120 frames after 30 settling frames. Final timed samples ran without concurrent heavy test processes.

| Frozen scene | Before: GPU medians, scene / bloom / output | After: direct scene GPU median | Draws before → after |
| --- | --- | --- | --- |
| Harbor, 700 m | 7.39 / 1.13 / 0.09 ms | 7.35 ms | 673 → 659 |
| Neon Docks, 557 m | 8.84 / 1.54 / 0.09 ms | 7.19 ms | 667 → 653 |

These are separate pass medians, not summed frame percentiles or universal speedup figures. Both before/after samples delivered about 60 FPS, 16.8 ms frame p95 and no frames above 33 ms. The improvement is graphics headroom at this viewport, not a measured increase beyond the display limit. Short samples are sensitive to clock speed and background load. They exclude startup, and the scene-only page does not include the production mirror styling.

A separate real-UI driving sample used the production HUD, audio, traffic and active 252 × 76 rear-view mirror. Pacific Canyon at 261 m delivered **120 frames, 16.7 ms median, 16.8 ms p95, 16.9 ms maximum and no >33 ms frames**, at full Performance scale. CPU submission p95 was 8.8 ms including the mirror; App CPU p95 was 1.7 ms including simulation, audio and HUD. This is a short moving sample, not a full-course or all-hardware guarantee. Visual checks covered night scenery, tire marks, normal driving and the mirror. High → Performance → High restored the expected pipeline, ratio, smoothing and shadow resolution. No browser warnings or errors were captured.

Local lamps use a reused two/four-light shortlist instead of allocating and sorting every pole each frame. **1,440 exact light-state comparisons** preserve lamp placement, intensity, ties and cutoffs. Its isolated 10,000-update median improved from 9.83 to 2.67 ms; this tiny subsystem result is not an overall FPS claim.

**29 distinct suites pass** across the final 25-suite rendering/lighting/lifecycle collector and four additional core/model/grounding suites. The fast core passes 504 checks. New checks cover adaptive timing and resize feedback, High restoration, real RenderPass clearing and failure state, direct shader output, matching warmup and lighting parity. The long campaign block and expansion-driving matrix were not rerun for this rendering-only change.

Production and QA builds pass, with the existing large renderer-chunk warning. The unchanged live URL `http://localhost:5174/` serves entry `index-DwHQhR8L.js`, renderer `render3d-BY-Lz-sF.js` and build `20260920202636-b2556cadc83d`. HTTP 200 and byte-for-byte disk matches were verified for HTML, manifest, entry, stylesheet and renderer. Footer: **26.09.20 20:26 UTC · b2556c**. No live browser refresh or save access was performed. Reusable QA controls and tests remain; generated QA output and this pass's temporary server logs are removed after verification.

## Koenigsegg reward, metric speed and rear-view mirror

The ninth car, Koenigsegg Jesko Absolut, unlocks automatically after a player owns and fully upgrades all eight other cars in all seven categories. It arrives maxed and has no credit purchase. Progression passes **818 checks**, including all 56 possible final-upgrade paths, existing complete garages, malformed saves, free ownership, settings, paint, player isolation and real App purchase/reload/race flows. The production UI passes 49 checks. A disposable browser career showed 7/8 complete, then earned the car when buying Titan's final 950-credit tank upgrade. Its balance fell from 50,000 to 49,050 only; all seven Jesko upgrades showed level 3 and disabled purchase buttons. No live career was read or changed.

The new driving suite passes **40,023 checks and eight input-only races**. All eight other fully tuned cars are slower and have weaker acceleration, braking and nitro capacity. Measured arcade speeds are about **530 km/h unboosted and 647 km/h with nitro**; the tank lasts 18.317 seconds. A stop from 322 km/h takes 1.658 seconds and 73.69 metres. Both Pacific races have identical 30/144 FPS trajectories and their own valid records. The six expansion-course runs all win, with no missed gates or boundary resets. Five are crash-free; on Cloudbreak the automated driver clips a stopped, yielding oncoming car at the lap seam. That is a real player-initiated collision, not an NPC ramming or checkpoint fault.

The distinct original model was reviewed from front and rear, then refined with a carbon roof, tinted glazing, fitted light recesses and visible rear cover/diffuser. Model checks pass 443, routing 115, nine-model grounding 4,967 and crushing 2,855. Existing car geometry is unchanged. The extra audio voice uses the existing licensed recordings with a distinct mix; it is not a recording of an actual Koenigsegg.

Displayed speeds now use km/h in the dashboard, menu, garage, tickets, drift hints and roadside signs. Internal physics and saved speed units are unchanged. Metric presentation passes **62 checks**. Restoring only the old sign text in memory reproduces all 16 previous complete-scene hashes exactly; updated metric texture hashes retain identical geometry, placement and object counts. The road-furniture suite passes 593,044 checks.

The live rear-view mirror uses a reflected rear camera with a 220-metre range and a small reused target, refreshed at most 30 Hz. It does not repeat shadow, ambient-shading or bloom passes. **67 checks** cover orientation, reflection, tunnel clearance, render-state restoration including errors, resizing, menu transitions and disposal. Browser review confirms a car behind is visible, the mirror stays clear of the course heading at a 390-pixel viewport, and it hides at the menu. A short frozen-scene sample on the compiled build reports **60 FPS / 16.8 ms frame p95**, with a 252 × 76 mirror target. This is not a moving-race or broad-hardware benchmark. No warnings or errors appeared in the final compiled-page review; an earlier QA-only callback mistake was fixed before the build.

**125 of 126 discovered suites have passing coverage in this update.** The broad collector passed 120/121 on its first run; its only failure was a source-boundary assertion that did not yet include the mirror in frame timing. The corrected 121-check timing suite passes. The fast core passes 504 checks and the three later UI/metric/mirror suites pass separately. The old long expansion-driving matrix and the campaign block inside the core were not rerun in this car/presentation update; their prior results remain in the preceding checkpoint. The new car's eight full races are fresh, not substituted historical results.

Production and QA builds pass, with the existing large renderer-chunk warning (3.27 MB raw / 436 kB gzip). The unchanged live address `http://localhost:5174/` serves entry `index-D1J7tE36.js`, renderer `render3d-u3rFFcne.js` and manifest `20260920195814-982f5ad6b490`. HTTP 200 and byte-for-byte disk matches were verified for HTML, manifest, entry, stylesheet and renderer. Footer: **26.09.20 19:58 UTC · 982f5a**. No live refresh or server restart was forced.

Both temporary browser tabs and the verified port-5175 test servers are closed. Removed the regenerable `.qa-dist` directory and this update's two QA logs. Reusable checks and isolated test controls remain; no duplicate car export or throwaway image was created. The live `dist`, dependencies, pre-existing live logs and original checkout remain intact.

## Freestyle playground, off-road physics and course unlocks

All **120 discovered suites are covered with passing results**, using a broad collector and separate long/focused runs rather than one uninterrupted invocation. The collector ran 113 suites in 728.4 seconds; ten older fixtures initially failed. Eight needed explicit in-memory course ownership after the new paywall, one preview-cache fixture needed its intended retained reference, and the shared-index audit needed to follow the extracted mountain-surface module. All were corrected and rerun without changing financial, crash, win or geometry expectations. The two subsequently added ghost-terrain and practice-map suites also pass.

The full core campaign block completed **60/60 campaigns and won 180/180 stages**. That first run then stopped at an old upgrade fixture that selected the last course (now practice) and replaced its road frame with an incomplete curvature-only object. The fixture now selects a racing course and preserves real coordinates. The final fast core passes **504 checks**. The exact remaining standalone-event block was executed separately and passes **28 checks**, covering 24 event replays and the Hard chase after three forced crashes. Together with the 23 campaign assertions, all core blocks have been exercised; no skipped block is presented as tested by the fast rerun. Later practice-only recovery and capable-car climb guards have dedicated regressions.

The final expansion matrix completes and wins **48/48 two-lap races**, with **648 checks** in 246.196 seconds. All 24 pairs at 30/144 FPS have identical input and motion hashes. There are no checkpoint or boundary resets. The three genuine Stuttgart Manual traffic collisions remain, without suppression. Original racing checkpoints and ordinary-car boundaries remain enforced; only Titan/Dusthawk receive the requested off-road freedom.

The new playground is an explicit **900 CR course purchase**, separate from vehicle and driver purchases. Course access passes 160 checks, production purchase/practice UI 38, and all eight cars across sixteen owned courses 1,718. Migration preserves evidence-backed existing access without changing credits. Practice never creates a finish reward, milestone, personal best, leaderboard row, interrupted-race charge or ghost. An isolated browser purchase reduced 50,000 to 49,100 CR; a Titan purchase reduced it to 37,100. Practice restart and menu exit each worked in one click and left 37,100 unchanged. No real career was read or changed.

Jump distance passes **374 checks**, including a real **70.258 m / 1.358 s** jump with exact 30/144 FPS parity. The distance/height HUD, landing hold, pause and resets pass separately. **8,788 off-road checks** cover world-heading travel, actual mountain support, rock limits, forward/reverse rollover, downhill solid-wall protection, repeated climbs, physical crushed-wreck support and police behavior after crushing. An independent review caught practice recovery clamping negative/extra-loop travel into the race range, causing 267–333 m teleports. The final fix preserves the clear world position and heading, searches only nearby safe spots if obstructed, and passes bounded crash-loop checks for Titan, Dusthawk and F42. Ordinary race recovery stays unchanged. Ghost terrain compatibility passes 44 checks, crush/tumble graphics 2,597, mountain support 4,254 and practice maps 977.

The final terrain audit passes **2,545,523 checks** across sixteen circuits and four seeds. Every mountain rim remains at least 3.99 m below rendered ground. The adaptive playground mesh passes **52,168 checks**, including every rendered triangle against its driving height. It uses **26,060 ground triangles instead of 416,120**. Practice detail is eleven draws and 88,110 triangles. All **fifteen existing complete-scene signatures remain exact**; the new practice signature is added after visual review. The complete-world suite passes 33 checks. The original fifteen road map/preview outputs and shortcut payloads are unchanged.

Browser checks covered quarry overview, real flight, small-rock crossing, climb rollover, a visibly flattened road-traffic car, course purchase, any-car selection and the real untimed HUD. The local quarry views reported about 60 FPS, 16.9 ms frame p95 and no >33 ms stalls in a 240-frame window. Neon Docks measured 51 FPS on High and 60 on Performance; Harbor High measured 48 FPS. These short stationary/paused review samples are not universal performance guarantees. No warnings or errors were captured. Empty effects now submit zero idle uploads/draws; the isolated CPU benchmark improved by 57%, not overall game FPS. See [mechanics, reference prompt and art/performance iterations](FREESTYLE_EXPANSION.md).

Final production and QA builds pass; the existing large renderer-chunk warning remains (3.26 MB raw / 432 kB gzip). The unchanged live address `http://localhost:5174/` serves entry `index-Dv7C28Is.js`, renderer `render3d-Cp_qaQEv.js` and manifest `20260920193348-71ad5577bde6`, with every entry/style/script byte matching disk and HTTP 200. Its footer is **26.09.20 19:33 UTC · 71ad55**. No live refresh or server restart was forced. Refresh from the menu when ready.

Both temporary browser tabs and the verified port-5175 QA process are closed. Removed only the regenerable `.qa-dist` build and this turn's two QA logs. Retained reusable tests, the reference image, native/source assets, the live `dist`, installed dependencies and two pre-existing live-preview logs. The old checkout still owns shared Git metadata and remains until human play-test acceptance and the [safe retirement step](SERVER_CUTOVER.md).

## Six new circuits, specialist drivers and any-car entry

All **110 test suites have passing results**, with no long simulation block skipped. The final sequential collector passed 107 suites in **644.00 seconds**. The three separately assigned suites also passed: the full core with **550 checks in 799.052 seconds**, expansion driving with **648 checks in 194.026 seconds**, and world composition with **31 checks**. A final QA-storage rerun adds explicit coverage of the menu and update fixtures, passing 30 checks. Production and QA builds pass. The known large renderer-chunk warning remains: the new Blender meshes bring the renderer to about 3.25 MB raw / 430 kB gzip.

The full core completed **60/60 campaigns and won 180/180 stages**, with no catastrophic or life-exhaustion loss. Its long blocks now cover 60 campaigns, 24 standalone-event replays and one Hard chase after three forced crashes: 85 runs and 51 assertions. The core used frozen gameplay before the last off-road gantry sightline adjustment. The final-source expansion matrix then completed and won **48/48 two-lap races** across all six new courses, two cars, Auto/Manual and 30/144 FPS. All 24 display-rate pairs have identical per-step input and motion hashes. No checkpoint reset, boundary reset or landing-caused crash occurred. Three legitimate player/demo-initiated traffic collisions remain in the Stuttgart manual results; the race tests do not suppress them. See [physics methods and results](PHYSICS_EXPANSION.md).

New courses are Eifel Crown, Alpine Serpent, Azure Riviera, Red Mesa Corkscrew, Neon Docks Circuit and Cloudbreak Skyway. Repeated geometry passes removed terrain gaps, buried mountain edges and grounded far-edge cactus/pine roots on the actual rendered triangles. Geometry coverage includes 2,506,400 expansion checks, 2,527,559 terrain checks and 19,893 new pine-grounding checks. All **nine original complete-scene signatures remain exact**. The original campaign and event IDs remain stable.

Wall contact below 35° now scrubs speed without spending a crash life; sharper contact retains the impact-speed crash rule. Seven smooth crests keep 30/70 mph probes grounded and launch/land once at 150 mph. Physics coverage passes 12,364 checks. Full driving exposed a separate NPC defect: a traffic car retained its collision yaw while moving straight, causing repeated impacts. Gradual heading recovery fixes that defect without stationary pivoting or relaxing player-contact rules; yielding/recovery coverage passes 43,170 checks.

Every owned car can enter every one of the 15 courses. Course eligibility passes 1,610 checks across all eight cars; locked-car checks remain. Special events keep their objectives and recommend suitable cars without forcing them. Six purchasable specialist drivers add modest, documented car-specific skills. Unlocking does not automatically select a driver. Neutral and off-specialty combinations keep original stats and record keys; active skills use separate best-time, leaderboard and ghost classes. Driver rules, real App driving and UI checks pass 1,281, 48 and 62 checks respectively. Completion-screen coverage passes 162 checks, including the new circuit wording.

Actual Blender authoring completed three mesh revisions, with six editable native collections and 18,588 runtime triangles. Landmark geometry, normals, foundations, road clearance and resource cleanup pass 185,995 checks. Browser review covered all six landmark approaches, revised dock/gallery/skydeck visibility, the real menu's purchase/select flow, any-car selection and arena warnings. Six real-physics crest fixtures visibly lift the car clear of the road with matching height readings and no major crash or boundary reset. Final browser diagnostics contain no warnings or errors. Brief stationary review samples range from 31–60 FPS; they are not a controlled performance benchmark or a claim of universal 60 FPS. See [the references, prompt and iteration record](COURSE_EXPANSION.md).

Engine revs, load/lift contrast and shift transients use the existing licensed recordings. Audio passes 438 checks, including 536,302 finite automation commands, reproducible WAV generation and measured PCM pitch/loudness. A headphone/speaker listening play-test is still needed; automated audio measurements are not human listening acceptance. All browser fixtures install memory-only saves before loading the game. No live account, balance, race input or browser refresh was used.

Several older tests assumed a fixed nine-event list, a mixed biome on every course, or an automatically forced special-event car. These fixtures now select their intended vehicle explicitly and apply legacy-only assumptions to legacy courses. New circuits receive their own strict geometry, objective, finishing and display-rate checks. No crash, finite-state, lap or win criterion was weakened to force a pass.

The unchanged live address, `http://localhost:5174/`, returns HTTP 200 with entry `index-Ri4IOxHy.js`, renderer `render3d-BzWdKdfR.js` and manifest `20260920183309-b7106625cbb0`, exactly matching disk. The footer reads **26.09.20 18:33 UTC · b71066**. The existing preview process serves this build without a restart. Refresh from the game menu when ready.

Cleanup removed the portable Blender download/extraction, intermediate reference-review renders, disposable `.qa-dist` and this turn's QA logs. The temporary port 5175 preview and both review tabs were closed. These files can be regenerated; the native Blender source, runtime export, reusable tests, reference board and licenses are retained. The live build, dependencies and two pre-existing live-preview logs remain. The original checkout still owns shared Git history and stays until human play-test acceptance and the [safe retirement procedure](SERVER_CUTOVER.md).

## Harbor Route C checkpoint-edge fix

All 100 suites now have passing results with no campaign block skipped: the final core run passed 494 checks, including all 73 longer simulations, in 338.227 seconds; the other 99 suites passed together in 285.15 seconds. The final campaign result is 57 completed and three valid life-exhaustion losses, with 171/171 finished stages won and matching outcomes at 30/60/144 FPS. The 12 standalone-event runs and Hard chase recovery also pass. All nine complete-scene signatures remain unchanged.

Reproduced two false-miss cases on Harbor & Highlands, Route C (seed 17). Crossing the invisible 1,100 m checkpoint at 7.4 m lateral offset was collision-free but did not register. The game reported that missed checkpoint only at the finish. Separately, with all earlier checkpoints validated, a clean finish crossing at 7.1 m passed inside the posts but was rejected. Validation required the car centre inside the 7 m asphalt half-width; the existing shoulder and inside edge of the finish posts extend to 8.25 m.

Ordinary lap validation now includes that narrow 1.25 m shoulder. A shared constant keeps paved shoulder geometry, its shader and lap acceptance in agreement, without changing the rendered dimensions. Off-road grip, boost restrictions, solid posts, ordered checkpoints, forward-only crossing, teleport rejection and the separate timed Checkpoint Rush gate widths are unchanged. No course layout, vehicle design, save format or record key was changed.

The race-integrity suite passes 601 checks. Six real driving-step fixtures cover both sides of a Harbor checkpoint, first-lap line and final finish, including physical post clearance and completed results. Further checks cover all three campaign circuits on Routes A/B/C, both racers, both laps, exact shoulder edges, interpolated crossings, outside rejection, wrong-way travel, missing gates and teleport attempts. Two full input-only Harbor Route C races on Medium at 30/144 FPS complete both laps, with all six checkpoints and no crash or reset. Those full replays are now part of the regular suite even when the long core simulations are skipped. An independent full Route C replay also matched every sampled player/progress step and checkpoint event across both frame rates.

The first full core run (with nothing skipped) returned 488 passes and one failure in 325.081 seconds. Investigation identified a test classification error, not a stalled race: seed 2026 / F42 / Auto ends through five ordinary crashes and zero remaining lives. The existing game rules allow this without a catastrophic crash, but the matrix accepted only completion or catastrophe. The other 57 campaigns completed, winning 171/171 finished stages; all frame-rate comparisons passed. The corrected test accepts a non-catastrophic loss only with zero lives, an actual crash and an explicit unsuccessful game-over result. Five additional checks verify that ordinary life exhaustion ends the run and cannot earn finish rewards. Future unmatched outcomes print their seed, car, transmission, frame rate and progress. No driving or crash rules were changed to make this test pass.

The production build passes with the existing large renderer-chunk warning. The unchanged live address returns HTTP 200 with entry `index-WMtcm23o.js`, renderer `render3d-CwwMA6Gg.js` and manifest `20260920145756-c083e8f5bccd`, exactly matching disk. The footer is **26.09.20 14:57 UTC · c083e8**. No live browser refresh, real-account change or race input was used. This follow-up uses physics/geometry tests, not a new browser visual review.

Cleanup audit: no untracked scratch files, disposable QA build, one-off maintenance pages, backup patches or temporary test logs remain. This turn created no temporary server or browser tab. The live `dist`, installed dependencies and two pre-existing preview logs (75 bytes total) are retained. Reusable tests, asset sources/exports, references and licenses remain useful. The old checkout still owns this worktree's Git metadata; its safe retirement remains gated by play-test acceptance and the separate server handoff plan.

### What the longer race simulations cover

Earlier notes called these the “expensive campaign matrix.” That means longer local computing time. The two optional core blocks run 60 campaigns (five seeds × two starter cars × Auto/Manual × 30/60/144 FPS), 12 standalone events (six events × two frame rates), and one Hard chase with three forced crashes: 73 runs and 39 assertions. They compare outcomes across frame rates, check finite simulation values and exercise finishing/recovery. The campaign checks permit valid crash-limit losses but require that complete campaigns remain possible; 180 wins in earlier notes were an observed result, not a required assertion.

These blocks are not exhaustive. Their normal campaigns use Easy CPU; their seeds are 1, 42, 1989, 2026 and 90517, not Route C's 17. Other suites cover Medium/Hard and additional cars. `DUEL_SKIP_CAMPAIGNS=1` skips these two blocks only, so a passing suite count alone does not establish that the long simulations ran. The previous update's omission is preserved below rather than rewritten as a full run.

## Gentler keyboard taps, NPC yielding and night-harbor detail

All 100 suites have passing results on the final production source: 99 non-core suites passed together in 409.70 seconds, and the corrected core suite separately passed all 450 checks with `DUEL_SKIP_CAMPAIGNS=1`. The expensive core campaign matrix was not run. Production and QA builds pass; the known large rendering-chunk warning remains.

Keyboard steering now starts at 78% and reaches full input over 0.20 simulation seconds. A release or direction change resets immediately. In a real input-only F42 approach at 74.8 mph, 50/100 ms taps produced 79.48%/80.82% of the previous sideways movement. Held steering, analog gamepad input, autopilot and raw vehicle tuning are unchanged. The new 94-check suite covers lifecycle resets and identical complete test trajectories at 30/60/144 FPS (`cfe859d2a6aea7e9`).

Traffic in both directions, rivals and police share a collision-shell-aware stopping plan. NPC-caused contact is handled before player damage, push or drift loss. Player-initiated forward, reverse, side and head-on impacts remain real, and police catches/fines remain enabled. Ordinary contact expectations were revised only where the user explicitly requested protection from arriving NPCs; rear-damage persistence is still tested through a player-initiated reverse collision.

Final focused checks pass: 450 core checks with the expensive campaign matrix explicitly skipped, 40,884 NPC yielding checks, 195 contact checks and 241 reverse checks. The yielding suite includes real-course full-step stops, both traffic directions, all CPU levels, large/turned vehicles, lap seams, shortcut separation, jumps and wall-safe corrections. An independent 372-check replay verified the wall-side cut-in over 30 follow-up steps. The final guard also sweeps the correction path across thin walls; if no local retreat is clear, it holds the previous pose instead of teleporting through scenery. The recovery test now checks waiting for a blocking player, then gradual recovery once the lane clears.

Four stock F42/Heritage replays still finish in 105.67 seconds without crashes and match across 30/144 FPS. Their combined motion/reward signature changes from `054228b00c4c90bc` to `d4504223d89a80de`. An in-memory comparison with the previous commit attributes this solely to one near-miss award occurring 11 simulation steps (91.7 ms) later: score, style score and near-miss count temporarily differ. Every player movement/control/damage/timing field, final result and saved ghost sample stays exact in this fixture. This does not claim unchanged NPC motion or keyboard onset; those are intentional changes.

Memory-only browser fixtures ran real 80 mph approaches for 12 seconds on seed-1989 road geometry. All four roles stopped at 0 mph, with 5.83–5.84 m centre gaps, no player movement or panel damage. Clearing the lane let traffic reach 36 mph after two seconds. The 100 mph player-into-stopped-traffic fixture still damaged both struck panels. Police movement was isolated from enforcement for that visual fixture; automated checks retain the normal catch radius and fine.

The night-city pass restores warehouse cladding and original building-order tints across spatial cells, replacing the obsolete total-building-count match. Existing cranes gain bracing, paired hoists, cabins and amber tips. They use 600 triangles and two material draws each, versus 72 triangles and six draws before. Harbor adds 1,056 crane triangles and removes eight draws; Midnight/Neon each add 2,112 triangles and remove 16 draws. No new lights, textures, collider changes or crane placement changes. Some cranes remain obscured by existing buildings; this is not a new waterfront layout.

The 52,788-check harbor suite verifies original positions, all vertex bounds, material identity/tints, resource disposal and geometry budgets. Harbor/Midnight/Neon complete-scene signatures were updated after browser and physical-feature review; all six other scene signatures stay exact. Browser review covered harbor driving height, crane detail, warehouse close-up and Midnight in High/Performance quality without observed warnings/errors. These are visual checks, not a general frame-rate improvement claim. Saved accounts, balances, ghost format and route versions are unchanged.

The same live address returns HTTP 200 with `index-_-3O2cGD.js`, renderer `render3d-C1l4au6Q.js` and build `20260920144459-f371a452d667`; the served manifest matches the production build. No live restart or browser refresh was forced. The temporary browser tab and port 5175 preview were closed, and generated `.qa-dist` was removed. Reusable regression tools remain; the live build, dependencies, old Git-owning checkout and its launcher are preserved.

## Startup and High-quality rendering — latest follow-up

All **97/97 suites pass in 277.65 seconds** with `DUEL_SKIP_CAMPAIGNS=1`. The 448 non-campaign core checks passed; the expensive campaign matrix was not rerun. Full F42/Heritage replay, rewards, account isolation, collision, reverse, cactus, HUD and scene suites are included in this run.

Shader preparation is now the supported-browser default, with explicit `?warmup=0` comparison/fallback. Start is disabled from initial markup and lazy import through first presentation. The loading UI distinguishes car loading from `PREPARING THE ROAD`. Preparation keys include only world rebuild, car and quality. Tests cover frozen clocks/rewards, preserved pause state, first-draw release, timeout/rejection, superseded work and resource retirement. Fullscreen preparation matches the actual Three r171 material/target/define dispatch; texture uploads and some first-draw work remain synchronous.

High contact shading no longer duplicates the colour pass's shadow rendering. The 256 m station/warehouse batches preserve 326,479 original instances across tested worlds/seeds. All geometry, transforms, colours, materials and physical features remain equal. Seven complete-scene signatures are intentionally updated for grouping and conservative bounds; both Titan signatures and all nine instance/geometry/material/texture counts remain unchanged. New/expanded checks include 983,788 batch checks, 94 shadow checks, 134 pass-preparation checks, 39 preparation-key checks, 34 production-readiness UI checks, 76 phase-diagnostic checks and 1,078 scene-lighting checks. The QA GPU profiler covers bounded queries, unsupported/disjoint/busy GPU results, exceptions and cleanup.

Same-build browser observations at 1280×720 / DPR approximately 1: initial renderer-attach-to-picture 2720 → 1768 ms and Harbor build-to-picture 2470 → 1009 ms with preparation enabled. Harbor submitted triangles fall from 4,169,241 to 2,722,763 while draws change 1174 → 1191. Short frame p95 remains about 18.1–18.2 ms; that is not proof of an FPS increase or universal hitch-free play. CPU/GPU tail variability and synchronous work are explicitly recorded in [the performance notes](PERFORMANCE_PASS.md).

Browser checks use memory-only saves. The Harbor review retained the same visible scenery and shadows. A real bounded coastal drive reached 3467 m with zero major crashes and boundary resets. The production menu showed Start disabled while importing, enabled only when ready, then a zero-time countdown; pause/resume worked. No live-player input, account edit, purchase, forced refresh or save reset was used.

The final real-menu check switched High → Performance, loaded the Stuttgart, then switched back to High and Harbor. Shadows were1024/2048 respectively, smoothing off/on, and the visible `PREPARING THE ROAD` state disabled Start until ready. One-click menu return worked. No warnings/errors were captured. A separate120-frame production-HUD sample at0m with the race clock active measured App CPU p95 0.7ms and HUD0.3ms; the stationary, muted sample is not a moving/audio-load benchmark.

Production and QA builds pass. The live server returns HTTP200 with `index-CGZjB_7O.js`, renderer `render3d-DFJA9nV3.js` and manifest `20260920060656-1aa5eee519bf`, exactly matching disk. The approximately960kB renderer-chunk warning remains. The live tab was untouched. The temporary QA tab was closed, viewport reset, port5175 server stopped and rebuildable `.qa-dist` removed. No new scratch files or helper processes remain; reusable tests, live build/dependencies and pre-existing live-process logs are retained.

## Pacific coast, frame metrics and build notice — earlier follow-up

Pacific Canyon now has asymmetric offshore crags, animated broken surf, layered water motion and a more detailed weathered lighthouse. Three visual iterations removed low hidden tips, then overly regular slab silhouettes. Browser review accepted the final driving-view shapes and corrected transparent surf order. Cars, road/terrain shape, colliders, driving, economy and saves remain unchanged. See [scope, measurements and reproduction](COAST_SHOWCASE.md).

All 90 suites have passing results. The broad run used `DUEL_SKIP_CAMPAIGNS=1`: 448 non-campaign core checks and 89 suites passed in a 581.16-second run; the final world-signature suite correctly failed against the old Pacific art signature. After visual and clearance review, only that Pacific signature was updated. A focused five-suite rerun passed in 24.12 seconds, including all nine complete worlds. The eight other event signatures remain exactly unchanged. The expensive core campaign matrix was not rerun; existing F42/Heritage complete input replays still match `054228b00c4c90bc`.

New checks: 229,856 coast placement/geometry/lifecycle checks across Route A/B/C, 194 build/update checks, 121 frame-metric checks, 3,795 effect-equivalence checks and eight sample-summary checks. The nearest new rock vertex is 96.77 m from the road. Rock bases stay at least 5.03 m below rendered terrain, and the lighthouse stays inside its original 3.2 m radius. The shoreline adds at most 13,608 triangles and 18 spatial draws across tested seeds, with no new bitmap assets. Geometry tests cover actual terrain triangles, not just analytic height estimates.

Build-notice browser checks use the actual production menu with memory-only QA saves: one version request after 20 focus events; notice hidden during racing; stale reload ignored; notice restored at menu; explicit double-click reload returns to the menu once; offline requests stay quiet. No real account or live race is used for these tests.

The effects optimization removes ten unnecessary ground samples during clean paved driving. Exact particle/mark/bound snapshots and RNG calls match the former path across 1,260 snapshots. Frame metrics separate steady frame intervals from first-draw time and synchronous render-submission time; the latter is not GPU time. No overall FPS or startup improvement is claimed. High and Performance presets and opt-in shader warmup behavior are unchanged.

A final diagnostic reproduced an existing texture warning: tunnel concrete was marked ready while the asynchronous image was still null. Only the already-populated headless DataTexture now receives the manual ready flag; browser TextureLoader sets it after completion. The actual delayed-loader regression passes, as do 38,165 tunnel checks and all nine world signatures in a two-suite, 11.67-second rerun. A fresh browser Harbor Performance → High → Titan transition produced no warnings or errors. This fixes that warning source; it does not establish the cause of the variable Titan timing samples.

Production and QA builds pass. The live HTTP response serves `index-D0oJcuFm.js`, renderer `render3d-jf8x0MIR.js` and matching manifest `20260920034918-d9ee120b4824`. The existing large rendering-chunk warning remains (about 957 kB). The live Spikyferns chase was left untouched. Refresh from the game menu when ready; no live account edit, race input or forced reload was used for verification.

Browser art checks covered the coast approach, road-level lighthouse pass, exit, close lighthouse, shoreline overview and Route B/C. A bounded real-physics test drive progressed from 2500 m to 3468 m with zero major crashes or boundary resets, then paused. These scripted checks are not human play-test acceptance. Temporary review tabs were closed, the 5177 QA server stopped and generated `.qa-dist` removed; `npm run qa:build` recreates it. Reusable tests/fixtures, operational `dist`/dependencies and the two tiny logs held by the live preview remain.

## Scene architecture cleanup — earlier follow-up

The rendering refactor separates ordered world composition, sampled surfaces, roadside structures and scene lighting. Water, meadow wind, checkpoint signals, fallen cacti and crushed arena props now use one explicit scene-system interface. Ambient and simulation clocks remain separate. No vehicle design, route geometry, physics, reward, account or save-format change is part of this update. See [architecture and extension plan](ARCHITECTURE.md).

Removed confirmed dead renderer callbacks, an unused import, an unwritten object-level shared-asset path, unreachable texture-generation fallback code and unused local bindings. Current model sources, exports, credits, references and historical save/layout compatibility remain. No additional obsolete binary assets were found, so none were deleted.

The cleanup also fixes repeated grass shader compilation retaining extra update callbacks and Three r171's undisposed GTAO shader material. Lighting has one resource owner; late HDR results cannot allocate resources after retirement, while in-flight shader preparation keeps its deferred cleanup. Scene-system cleanup is ordered and idempotent, retires even initially static worlds, and completes other hooks and graph resource cleanup before reporting a cleanup error.

All **85/85 suites pass in 325.10 seconds**, using `DUEL_SKIP_CAMPAIGNS=1`. The 448 non-campaign core checks passed; the expensive core campaign matrices were not rerun. The original 80 suites retain their established order, and new suites are discovered automatically. Added checks: 19 complete-world signatures/immutability checks across all nine events, 1,060 lighting/lifecycle checks, 16 scene-system checks, 24 QA-storage checks and 85 test-runner checks. Geometry/index bytes, transforms, material/texture properties, instance matrices/colors, object order and resource sharing match the pre-extraction world signatures exactly. Existing F42/Heritage input-only replays also retain their previous exact motion signature.

App-based QA pages share a fail-closed memory-only storage helper installed before importing App/main. The older visual-check page now has the same protection and visibly labels its temporary data; reload clears that data. No real careers were read or modified by the test fixtures.

Browser review covered Golden coast, Overcast alpine, tunnel headlights, night harbor, a checkpoint gate and the monster arena. Arena crush state changed from one to zero on a new sample while the cached world-build count stayed at five. Performance mode switched to 1,024-pixel shadows. No browser warnings or errors were observed. These are visual/behavior checks, not a controlled frame-rate benchmark. The live tab was left unchanged at Spikyferns' menu, showing 200 CR, Harbor & Highlands and Titan Monster selected.

Production and QA builds pass. The unchanged live address `http://localhost:5174/` serves `index-B3qtBbvL.js`, verified by HTTP response. The existing approximately 941 kB rendering-chunk warning remains. Refresh from the game menu when ready; no live refresh, race, purchase or account edit was performed for this refactor.

After verification, generated `.qa-dist` was removed and the temporary QA browser tab/server were closed. No one-off probe files or processes remain. `dist` remains because it serves the game; `node_modules` and reusable tests/docs remain for development. Two tiny redirected logs are locked by the active preview server and are retained until its next normal stop. The server still returns HTTP 200 after cleanup.

## Jump-height HUD — earlier follow-up

An airborne car now shows its actual ground clearance in metres, rounded to one decimal place, above the speedometer. The same readout tracks the current jump's peak. On landing it shows `JUMP PEAK` for two simulation seconds, then hides. Pause freezes the timer; menu, restart, new stage and crash/recovery clear stale values. This is presentation-only: driving, jump scoring, records and saved careers are unchanged. The continuously changing number is not an ARIA live region.

Passing focused checks: jump-height helper 95, actual HUD presentation 98, Stunt Trial 44, reverse driving 241, reverse presentation 18, Busted/quit 280, Heritage driving 94, completion UI 72 and App lifecycle 8. The helper's separate input-driven Titan flight reached 4.902 m and stayed airborne for 1.350 seconds; full-state trajectories matched the no-helper baseline and 30/144 FPS runs. Four complete F42/Heritage forward replays also retained their previous exact signature. The package now registers 80 commands; the full chain and expensive campaign matrix were not rerun for this HUD-only change.

Isolated memory-only browser review used real Titan ramp physics, not invented height values. The rising sample had 1.374 m ground clearance above terrain at 1.984 m elevation; the HUD correctly showed 1.4 m, not world altitude. The 2.942 m peak displayed as 2.9 m, stayed visible after landing and hid after two seconds. A new run started with the readout hidden. No browser errors were observed. This fixture freezes real simulation snapshots for visual inspection; it is not a new human play-test.

Production and QA builds pass. The same live server returns `index-BCAL93Ki.js`; the existing approximately 940 kB rendering-chunk warning remains. The live tab had Dukes00's garage open with 200 CR and was left untouched. Refresh from the menu to load the update. No real race, purchase or account change was used for testing.

## Cactus knockdowns and two-car damage — earlier follow-up

Desert cacti fall on the first player or NPC contact, stop blocking immediately and remain down through later laps. Restart/new-stage/menu resets restore the same cached instances upright. Falls follow impact direction, pause with the simulation clock and settle onto the actual rendered terrain. A cactus causes only a small speed scrub/light scratch, not a lost crash life or reward. Other trees and rocks remain solid.

Traffic, rivals and police own separate localized damage. Vehicle impacts above 1 mph closing speed mark the facing panels on both cars, including reverse and oncoming contacts. Repeated overlaps are gated by cooldown; reused render meshes return to exact clean vertices, normals and wear. Existing player major-crash, recovery protection, credits and rear-yield rules remain. The former core assertion that a yielding CPU never dents the player was replaced with explicit checks for cosmetic rear damage only and CPU front damage; its no-life-loss, no-speed-loss and no-crash-animation assertions remain.

Passing checks: core 448 (`DUEL_SKIP_CAMPAIGNS=1`), contact physics/account guards 207, NPC damage 1,656, cactus fall geometry 55,727, desert detail 441,087, vegetation cells 47,934, render reuse 119, vehicle grounding 4,398, paint 1,906, model routing 107, classic vehicles 196, reverse 241, reverse presentation 18, Heritage driving 94, driving rewards 47, Busted/quit 280, race integrity 44, NPC routes 17,057, police reset 3, police fines 225, Stunt Trial 44, Drift App 101, Checkpoint App 80, App progression 141, effects 172 and audio 392. The four complete F42/Heritage input-only races retain their exact `054228b00c4c90bc` per-step signature and 105.67-second finish at 30/144 FPS.

The new fall tests exercise 24 slope/direction/model combinations. Lowest support is 1.5 cm below the terrain, with no floating plant; touched cell bounds include all fallen geometry. This is numerical geometry verification, not a broad new art review. The package has 78 test commands; the complete chain and expensive campaign matrix were not rerun for this change.

Production and QA builds pass. The live server returns `index-0-v__HrJ.js` at the unchanged `http://localhost:5174/` origin. The existing large-rendering-chunk warning remains (approximately 940 kB).

Memory-only browser QA at `/tools/contact-check.html` showed actual cactus `tree-9` standing, then settled on the ground after one 18 mph swept contact with all five lives retained. The paired 100 mph collision showed player-front and traffic-rear damage; reset restored both to zero and cleared the visible wear. A separate cactus reset restored the upright plant in the cached world. No browser errors were observed. These are scripted real-physics visual fixtures, not human play-test acceptance. The live tab was in Spikyferns' Titan Stunt Trial, so it was not refreshed or otherwise disturbed; the new bundle will load on a later menu refresh.

## One-click Exit and Restart — earlier follow-up

Main Menu / Exit and Restart now perform their normal navigation immediately, without the second confirmation. The old prompt, pending state and confirm/cancel handlers were removed. Existing settlement still discards unfinished race earnings once while preserving the saved bank and completed-stage rewards. R restarts directly; browser key-repeat does not repeatedly restart.

Passing focused checks: Busted/quit 280, App progression 141, Heritage driving 94, completion UI 72, player settings 42, reverse driving 241 and App lifecycle 8. They cover pause, Busted, countdown, the GO boundary, duplicate actions, keyboard R, retained settings, completed rewards and exact forward-driving replays. The full 75-command chain was not repeated for this navigation-only change.

Isolated browser QA clicked Main Menu once from Busted and reached the menu with no dialog, retaining 2,000 CR. A single Restart from pause produced a fresh countdown at zero race time; a later one-click exit still retained the same 2,000 CR. No browser errors were observed. These checks used memory-only data, not real accounts.

Production and QA builds pass. The live Chrome tab loaded `index-iwWIpGeS.js` through a menu-only refresh and retained Dukes00's displayed 200 CR balance. No real race, purchase or account edit was used to test this change. The existing rendering-chunk warning remains.

## Reverse driving — latest follow-up

Reverse is available in both transmissions through a deliberate 0.25-second brake hold at rest. It is capped at 22 mph, has opposite steering yaw, cannot boost or over-rev, and must stop before accelerating forward. The R indicator, wheel direction, brake lamps, engine load, dust and ghosts follow signed speed. Rear static and vehicle contacts remain solid. NPCs keep nonnegative forward speeds when yielding to a backing player.

Passing checks: core 446 (`DUEL_SKIP_CAMPAIGNS=1`), reverse 241, reverse presentation 18, audio 392, effects 172, ghosts 86, layout archives 65, NPC routes 17,057, police reset 3, police fines 225, App lifecycle 8, driving rewards 47, race integrity 44, Busted/quit 249, Stunt Trial 44, Drift App 101 and Checkpoint App 80. Four complete F42/Heritage forward replays at 30/144 FPS still match the prior exact per-step signature and 105.67-second result (95 checks).

The core ramp fixture now explicitly marks its second lap as validated, matching the new guard against farming jump rewards before the start or on a previous lap. Backward ghost travel is recorded, but unsnapped teleports in either direction are rejected. Legitimate missed-checkpoint recovery marks a discontinuity. These changes preserve rewards for genuine forward driving.

The memory-only `/tools/reverse-check.html` browser test showed Auto and Manual travelling backward at −22 mph with R and positive 022 MPH on the HUD. Pressing W restored forward movement and forward gears. No browser errors were observed. This page uses only temporary memory and never touches real career storage.

Production and QA builds pass. The live server's current bundle is `index-mwTQ9czz.js`. The existing large-rendering-chunk warning remains. The package now registers 75 commands; this follow-up ran focused suites, not all 75 commands or the full campaign matrices.

## Heritage unlock and tighter near misses — latest follow-up

All six redesigned original vehicles remain unchanged from `2a36b47`; the cancelled rollback was fully reversed. A read-only Git-filtered blob audit confirmed the builders, six exports, both manifests, exporters and licensed source still match. Falcone Heritage adds the earlier F42 sport body as an independent 1,800 CR unlock. It shares the existing licensed source import with Aurora but not its GT trim. No duplicate asset was added.

Focused verification passes:

- Core: 443 checks with expensive campaign matrices skipped.
- Heritage driving: 95 checks, including four complete input-only Medium Time Trial races at 30/144 FPS. Stock F42 and Heritage each finished in 105.67 seconds with zero crashes and identical full per-step motion/control/damage/timing signatures. Their bests, leaderboard rows, ghosts, ownership and saved setups remain separate.
- Driving rewards: 47 checks. Near misses score at 6.39 m but not at 6.4 m or wider; the unchanged 65 mph minimum and collision rejection still apply. Police fines: 225; Busted/quit flows: 249.
- Progression: 27 groups; App progression: 92; paint presets: 79; paint App flows: 35; saved settings: 42.
- Model routing: 107; paint: 1,906; grounding: 4,398, within −4.02 to +4.19 cm. Readiness: 63; ghosts: 76; ghost vehicle ownership/cleanup: 395; completion UI: 72.
- Audio: 310 checks and 348,686 finite automation commands across eight cars. F42/Heritage engine behavior matches for recorded and fallback sound across all three cameras. This is not a new human listening review.

Memory-only browser QA confirmed the real garage purchase reduced 2,000 CR to 200 CR, the old F42 body appeared as Heritage, and normal race startup worked without observed console errors. The fixture toolbar now collapses after choosing a test to avoid covering game buttons. Real career storage was not used for these tests.

Production and QA builds pass, with the existing approximately 937 kB rendering-chunk warning. The live server responds with `index-COmGH8FU.js`; the same bundle was confirmed in the existing Chrome tab after a menu-only refresh. The user subsequently began a race, which was left untouched. The package now registers 73 test commands. This follow-up used focused suites, not a complete rerun of all 73 commands; the preceding complete 72-command checkpoint is below.

## Bank protection and player settings — current rule

The user clarified that quitting must forfeit only current-race earnings. This replaces the intermediate police-fine/quit policy described in the historical subsection below. Quitting, restarting or reopening an unfinished race now settles it with zero payout and zero debit. Prior completed stages remain banked. Police fines accrue against positive net earnings from the current race and cannot create debt or take saved credits.

Each player now stores an independent last-used race setup, including event, mode, CPU, transmission, car and route. Graphics quality remains device-wide. The live server now serves the updated production build at `http://localhost:5174/`. The browser still shows the three existing player names and the same selected-player balance. The selected 959 persists across reload. Human play-test acceptance is required before retiring the duplicate checkout; see `SERVER_CUTOVER.md`.

One uninterrupted final `npm test` run passed all 72 commands with `DUEL_SKIP_CAMPAIGNS=1`: 443 core checks plus all 71 remaining suites. Only the expensive core campaign matrices were skipped in this final run; their earlier 60 campaigns / 180 stage wins are recorded below. The other suites still ran their full driving replays, physics and geometry checks.

Focused checks pass: 225 police-fine checks, 249 Busted/quit/App/UI checks and 42 player-settings checks. They cover quit, restart, reload, repeated tickets, stale finish events, retained completed-stage credits, real loss settlement, menu restoration, challenge ownership, legacy migration and unavailable storage. The package registers 72 test commands.

Memory-only browser QA confirmed Busted → Main menu → Leave race keeps the wallet at 2,000 CR throughout. Switching Alpine Manual → Harbor Auto → Alpine Manual restored distinct circuit, car, mode, CPU, transmission and route controls, including Golden hour on the day route. No browser errors were observed. These fixtures never access the user's real career storage.

The final production and QA builds pass. The existing rendering-chunk warning remains (about 937 kB minified, 284 kB compressed). A fresh read-only export audit confirms all six original GLBs and both manifests match their builders byte-for-byte. Retired asset names occur only in retirement notes, not live code or build scripts.

## Earlier Busted → quit diagnosis — policy superseded

The existing confirmed-quit loss charge passed diagnosis; the displayed 150 police fine was never debited. Catches now save that credit deduction immediately, independently of the later race-loss charge. Unique saved ticket identities prevent duplicate charges, including after reload and after a zero-balance catch. Deadline-causing catches settle the fine before the timeout loss.

Focused checks: 157 fine settlement checks, 163 actual App/UI flow checks, 25 progression groups, 92 progression App checks, 72 completion-screen checks and 44 driving-reward checks pass. The package now registers 71 test commands. Browser QA used only the memory-backed reward fixture: Medium wallet 2,000 → 1,850 on Busted → 1,350 after Main menu / Leave race. No console errors were observed. A read-only source check confirmed the user's `localhost:5174` server still serves code without this fix; its live race and saved careers were not changed.

The non-campaign core rerun passes 443 checks. Race integrity44, police route reset3 and layout archives65 also pass. Production and QA builds pass, with the existing rendering-chunk size warning; `git diff --check` is clean.

## Latest vehicle, reward and route iteration

Validation was completed in separate runs, not one uninterrupted green `npm test`. The long core run passed both campaign matrices, including 60 completed campaigns, 180/180 stage wins and frame-rate comparisons. Its one failure came from an old shoulder-recovery fixture colliding with real traffic on a new bend. That fixture now isolates recovery in Time Trial. The rerun with `DUEL_SKIP_CAMPAIGNS=1` passed all 443 non-campaign checks. The unchanged expensive matrices were not repeated.

- The package now registers 69 test commands. The remaining suites were run in batches; five old geometry/reward fixtures failed initially, were investigated and corrected, then passed on rerun. Collision clearance and rendered-ground checks remain strict.
- Driving rewards: 44 checks cover the larger near-miss zone, unchanged collision/speed limits, Manual multipliers, police escapes at ordinary and chase finishes, duplicate protection, two-crash repairs, clean-run evidence and losses.
- Progression: 25 groups and 92 App assertions cover comparable bests, first-run baselines, repeated stage improvements, police credit awards, Manual earnings and failed stunt objectives. Failed challenge objectives cannot set bests or receive finish-related bonuses.
- Layout archives: 65 checks prove layout-3 records and complete ghost samples survive load/save/merge after the move to layout 4. Current rankings, ghost selection and direct playback exclude old geometry. Drift leaderboard compatibility passes 33 checks; ghost material ownership and cleanup pass 395. Active ghosts retain the 12-record/1.25 MB limit; archives remain separate. If browser storage fills, saving reports failure without replacing prior stored data.
- Vehicle routing: 76 checks; separate classic bodies: 196; paint and surface decals: 1,637; actual vehicle grounding: 3,837. Grounding samples stayed within −4.02 to +4.19 cm across the measured crests. The isolated incline test still verifies yaw-first wheel fitting independently.
- Natural circuits: 44,409 checks, maximum road grade 14.9%. Route variations: 1,866,146 checks, including 1,738,521 clear Titan-width sweeps. Wide shortcuts: 93 branches across 63 layouts, 2,406,819 clear hull sweeps and at least 3.09% 3D distance saving. Twenty input-only branch replays saved 2.41–12.15% with no hits, resets or off-surface time.
- Terrain: 872,619 checks across nine events and four seeds; station foundation error 0.0000 m. Mountains: 148,233 checks, 18,048 clear road/branch rays, unchanged collision footprints. Exact presets: 222 checks including all 15 fresh solver comparisons. Terrain materials: 15,121 checks.
- Desert grounding: 441,087 checks across 1,140 cacti and 798 rock colliders. Cactus burial is now measured against the actual rendered triangles and remains 0.296–0.338 m. Landscape cells: 314,376 checks; exact polyline integration: 7,598 checks with independent full-scan equality retained.
- Audio retains the preceding recorded engine/tire mix: 248 checks and 301,448 finite automation commands passed. No new human listening review is claimed here.

Browser review used isolated ports 5176/5177. The vehicle showroom uses no career data. Its final pass confirmed distinct starter silhouettes in neutral paint, fitted 959 lamps and rear grille, unobstructed rally lamps and clean livery edges. Damage and wheel/driver hooks remain automated checks. These are original stylized models, not exact licensed replicas of the references.

The real App reward screen was tested through scripted finish fixtures backed only by page-local memory: a first Medium/Auto finish showed its baseline and 1,300 CR; the comparable improvement showed 1,550 CR; a clean Manual win showed 2,800 CR; a three-hit Manual win showed 3,000 CR, no clean bonus, and two repairs/two refilled slots. These are settlement fixtures, not claims of human-driven races. No real wallet or port 5174 storage was changed.

The latest mountain silhouette and slope-sensitive meadow/soil/rock shading were reviewed in the browser. A shader compile issue found during review was fixed; the final scene and car viewer reported no console errors. First-frame compilation can still pause for seconds, and point FPS samples are not a hardware performance guarantee.

Retired `cinder-gt.glb`, `desert-service-station.glb` and their unused exporter scripts were removed; they remain recoverable from Git. The licensed Aurora asset and live procedural stations remain.

Final `npm run build`, `npm run qa:build` and `git diff --check` pass. Vite still warns about the roughly 938 kB minified rendering chunk (284 kB compressed). A read-only asset audit found no live references to the retired files and verified all 332 meshes in the six original GLB exports against their current builders. The actual game menu selected Stuttgart from the synchronous classic source and rendered its new body without console errors.

## Complete checkpoint

- Gameplay:464 checks passed;60 completed three-stage campaigns,180/180 stage wins, no catastrophic outcomes in that deterministic matrix.
- Progression:20 groups; App persistence, ownership and interrupted-race integration:70 assertions.
- Terrain:622034 checks across seven events and four seeds. Station foundations had 0.0000 m maximum error. Actual rendered terrain kept mountain rims at least 3.98 m buried. The audit included 281725 far-triangle queries and 1859 near-strip hits for omitted far quads.
- Circuits:33921 checks, with a 14.9% maximum road grade. Shortcuts:59 branches across 45 layouts,1449561 clear Titan hull sweeps,3.03% minimum 3D distance saving.
- Prepared gravel:29 pace, nitro, upgrade, NPC and route-boundary checks. Driving effects:27 terrain, airborne, landing, crush and pool checks.
- Audio:209 checks and 162916 finite automation commands. Actual source/runtime PCM was decoded and measured. Worst six-second mixed-envelope variation was 5.99dB across the tested band transitions and seven car voices.
- Map:77 projection/branch/cache checks. Arena props:29 deformation/bounds/reset checks. Rally detail:22700 checks, visible rut clearance 9.7–13.0 mm, terrain at least 34.1 mm under the driving mesh.
- Mountain geometry:133388 checks and 12642 clear road/branch rays. Camera clearance:176 roof/portal/damping checks. Furniture:243037 assertions and 219294 clear Titan hull sweeps; tunnel rock has at least 1.87 m of cover around every collidable cell.
- Ghost recording:76 assertions; ghost vehicle material ownership/cleanup:332 checks. Terrain style:10228 continuity/vertex checks.
- Titan Stunt Trial:44 checks. Independent input-driven Hard trial replays matched at 30/144 FPS:50.45 s Auto and 50.44 s Manual, six landings and five crushes. App demo runs on Easy/Medium/Hard each finished in 49.68 s.
- Driving milestones:89 assertions covering one-time awards, player isolation, persistence and actual stunt finishes.

Separate later tunnel-detail tests passed 28620 checks, with overlay triangles no farther than 0.094 mm from the existing lining. Roof geometry remained unchanged. Their 176 camera checks also passed.

The input-only shortcut pace audit is separate from distance and collision clearance. Primary seeds 1989/42 across all five non-arena events produced 3.02–12.48% clean segment savings, with no crashes, resets or off-route time. Harbor seed 20 gave 2.73–2.93%; see `SHORTCUT_PACE_AUDIT.md`. These are driver-model measurements, not a guarantee for every human line.

## Browser evidence

Tests used the isolated local QA origin on port 5175. No purchase or race commands were sent to the user's port 5174 origin.

- Actual UI Pacific races completed older layout 1 in 1:42.05 and layout 2 in 1:47.10. Each earned 660 CR, and the local leaderboard recorded the appropriate layout. Those times are not comparable across route revisions.
- Circuit QA and Player 1 remained separate. Player 1 retained 50 CR and its level-one engine and tires.
- A later Time Trial recorded 1:46.21 and saved a ghost. The ghost survived reload and visibly pulled away from a stationary player. Abandoning that replay charged 300 CR once and preserved the saved ghost.
- A funded Garage QA fixture tested the real purchase flow:40000 CR minus the 12000 CR Titan price left 28000 CR and opened both arena events. The real-UI Hard stunt run finished in 49.68 s with six landings and five crushes. It earned 3000 CR:1500 base,150 clean,450 jumps,300 crushing,100 Clean debut and 500 Arena show. The wallet became 31000 CR.
- The wide tunnel camera stayed under the roof; generated concrete and flush service details rendered correctly. The arena physics preview flattened a salvage car without a major crash. Generated crowd cutouts and coastal waves rendered with no observed shader errors.
- The HUD map was readable at 1280×720 and did not cover the car or speedometer. Stunt objectives and bonus details fit the result screen.
- Point samples on this host were about 56–57 FPS. Dense city after batching and later route changes: about 6.80 M submitted triangles; coast 3.76 M; stadium crowd 0.82 M. Counts include shadow passes. These are snapshots, not a minimum frame-rate or hardware guarantee.
- All 11 runtime audio assets decoded and Web Audio reached the running state. No independent human listening review is claimed.

## Later integrations

- Paint catalog, renderer helper and App integration passed 76, 2,410 and 35 checks. The actual garage bought Copper Metallic for 250 credits, kept it through a reload, then bought Glacier Satin for 400 credits. Both visibly changed the detailed car. Factory restoration and race snapshots passed the automated checks.
- High graphics adds edge smoothing and 2,048-pixel shadows. Performance disables the extra shading and smoothing passes and uses 1,024-pixel shadows. City samples were 56 FPS in both modes, with about 6.80 million and 3.47 million submitted triangles respectively. These are point samples.
- CPU route strategy passed 17,018 checks. Four complete Medium/Hard races matched at 30 and 144 FPS. Useful branch replays saved 0.73–1.75 seconds through physical motion. The stale police target regression passed three checks after its fix.
- Recovery integrity passed 44 checks. The reproduced lap-line bug is fixed; repeated jumps do not duplicate rewards, and chase deadlines settle once.
- Route choices passed 1,768,977 geometry assertions, including 1,651,293 clear Titan-width sweeps across 12 natural layouts. The closest two shapes still differ by 11.82 m RMS after alignment. App integration passed 68 checks, including actual two-lap runs on all three choices and separate records, leaderboards and ghosts.
- Desert detail passed 340,471 checks. Across nine scenes, 874 cacti were grounded against rendered terrain and 608 rock transforms kept their original collision footprints. Visible cactus heights range from 0.94 to 4.25 m.
- Generated cloud density and granite cliff textures are integrated. The sky and scene light now share one sun direction. The cloud deck compiled and rendered in the coastal scene without observed errors.
- A real browser Time Trial on Pacific Route B finished in 1:45.38, awarded 660 credits and saved a separate ghost. Its best time and ghost appeared in the menu on return. Garage QA held 31,010 credits after this run and the two paint purchases.

The later combined checkpoint completed logically across `.qa-checkpoint.log` and `.qa-checkpoint-rest.log`. Its 60 campaigns passed. A coastal recovery fixture was corrected to mark gates before teleporting the player; the unchanged production fix then passed 622,058 terrain checks. The course-preview assertion was corrected for singular “shortcut” and passed all 93 checks. All intervening suites passed.

## Eighth event and latest graphics

- Neon Drift Trial: 435 focused gameplay, 152 trial, 46 scoring, 44 recovery, 38,437 circuit and 755,534 terrain checks passed across eight events. Actual App inputs finish the unmodified city route in 99.38 seconds with 6,319 banked points. Easy/Medium/Hard targets are 3,500/5,000/6,000; deadlines are 150/125/110 seconds. A real crash produces 110.13 seconds and 5,899 points: Easy and Medium win, Hard times out. Independent 30/144 FPS input runs match.
- Drift App integration passed 98 checks, including failed score goals, deadline losses, restart/reload settlement, player isolation and a 15% performance-bonus cap. Failed goals cannot set best times, leaderboard records or ghosts. Time records for normal completed race losses remain eligible.
- City interiors passed 548,422 checks; the shader adds perspective rooms without changing building footprints. A browser close-up showed shelves, counters and room surfaces with no observed errors.
- Vegetation grouping passed 35,713 checks for 3,791 exact part instances. Harbor building grouping and hidden-window removal passed 19,327 checks, including a legacy-window fallback fixture. These reduce submission without deleting visible scenery.
- Three new CC0 ambience loops passed 240 PCM/automation checks with 177,736 finite audio commands. The old engine envelope remains at 5.99 dB worst tested six-second variation. Engine samples and ambience both reached ready in the browser.
- City paint placement passed 5,772 checks and 2,880 ray samples. Crosswalks and stop bars now sit 22.6–27.4 mm above actual asphalt, instead of below it.
- Current coastal point sample at canonical seed 1989: 56 FPS, 627 draws, 3.05 million submitted triangles in High. This includes shadow and shading passes. It is a point sample, not a hardware performance guarantee.

Score-first drift board passed 30 checks; the updated App suite passed 101. A second real-UI Hard run finished in 99.38 seconds with 6,319 points and a 798-point best chain. The visible leaderboard showed 6,319 PTS, target 6,000, Hard/Auto and stock upgrades. Each QA Hard win earned 1,950 credits, including its existing win streak; Garage QA reached 29,910 credits after buying the Banshee and winning twice.

Road materials passed 71,948 checks. Browser QA caught bright night-time wheel bands; night roughness polish was removed and the corrected city asphalt was reviewed. The skyline passed 692,828 checks; 96 towers remain at least 117.27 m from driving surfaces and their foundations are at least 1.20 m below rendered ground. Local lamp pools and restored crosswalks rendered without observed shader errors. A city point sample held 57 FPS with 5.14 million submitted triangles in High.

Landscape cells passed 313,575 checks across 47,927 unchanged instances. Modeled total camera/AO/shadow submissions fell 61.9%, though draws increase and hardware timing still matters. Chevron cells passed 50,146 checks; the largest packed world-vertex difference was 0.061 mm, and sampled draws fell from 702 to 200.

Retained environment behavior passed 112 checks: keys, chicken/crush resets, effect cleanup and shared/private resource disposal. Actual menu→race retained world build count 2 instead of rebuilding the same scenery. The root renderer also disposes its sun shadow and clears its owned debug reference; App/HMR teardown subsequently passed eight checks.

Generated `tire-smoke.png` is 1254×1254 RGBA with real transparency (alpha 0–254). Existing effects regression passed 27 checks after adding separate gray rubber smoke. Later driving visual QA confirmed soft neutral wisps; see the final integration entry.

## Nine-event checkpoint

The combined nine-event run passed in two consecutive portions: `.qa-nine-event.log` through road furniture and `.qa-nine-event-rest.log` from prepared surfaces onward. The first run found an old synthetic rally fixture missing `def.offroad`; matching the real event definition corrected it. No driving rule was weakened. The resumed chain exited successfully. Later route-load presets and parked-city detail are separate follow-up work.

- Main simulation: 481 passed, zero failed; 60 completed campaigns and zero catastrophic outcomes in that matrix.
- Terrain: 869,098 checks over nine events/four seeds; circuit geometry: 44,321; shortcuts: 86 branches across 63 circuits with 2,172,162 clear obstacle sweeps. Maximum grade remains 14.9%.
- Timberline Checkpoint Rush: 457 trial checks and 80 App/reward checks. Twenty-four input replays match across frame rates: Auto 101.68 seconds, Manual 101.65, 12/12 gates, zero hits/resets. The Hard clock retains at least 8.49 seconds before each successful gate. A crash-delayed Easy run succeeds; tighter timers correctly fail it.
- Gate rendering: 19,943 checks and 1,656 actual road-triangle rays. Minimum banner underside clearance is 5.328 m; numbering faces approaching drivers, physical posts match the model, and two-lap signals update correctly.
- Actual QA UI: Dusthawk purchase cost 3,500 credits (29,910→26,410). The Hard checkpoint run finished in 1:41.68 with 12/12 gates and no misses, paid 1,950 credits, and the menu showed its car best and 28,360-credit wallet.
- Tire smoke: 74 checks, including 31 live particles after 0.75 seconds at each of 30/60/144 FPS, terrain/airborne suppression, reset, bounded pools, real sprite alpha and single texture disposal.
- Chicken pool: 35,660 checks. Across 28 populated course views, 17% of source birds were submitted on average, reducing chicken triangles by 83%. All physical flocks, colors, scatter and pickup/restart states remain present. Retained-environment checks now pass 119; App teardown passes eight.
- Exact polyline lookup: 59,133 helper checks and 69,715 Course checks, plus 7,571 terrain-integration checks. Full positions, geometry buffers, mountain transforms and skyline foundations match the original scans. Local query benchmarks improve roughly 1.6–4.7× depending on workload; these are CPU microbenchmarks.
- Weathered sidewalk: 37,676 checks cover 1,044 strips, 1,044 curb faces and 64 cell joins. Two-metre texture coordinates remain continuous; station and shortcut access stays open. City interior checks remain 548,422; changed sidewalk joint batching lowers total detail draws to 206 Harbor / 361 Chase without adding glass draws.

The city concrete/curbs were reviewed in the browser. First GPU frame timing varies substantially under parallel testing; world-build and first-frame times are now displayed in the QA fixture so future profiling can separate CPU geometry work from GPU compilation.

## Final route, lighting and detail integration

The fresh core run passes 481 checks with 60 complete campaigns, 180/180 stage wins and no catastrophic outcomes in that matrix. All 64 other current suites pass in `.qa-final-rest.log`: the first 58 finished in 238.7 seconds, followed by warmup, readiness, meadow-material, completion-screen, pine-material and vehicle-grounding checks. Later bark and parked-glass corrections reran their affected suites. No fixture or production fix was required in this final run.

- Exact shortcut presets: 222 checks with `--verify-solvers`, including all 15 solver comparisons. `npm run assets:routes -- --check` passes. The normal 177-check suite covers cloning, invalidation and custom-seed fallback. Cold default constructors sampled at 57–118 ms instead of 701–1,801 ms; unchanged physical geometry is checked independently.
- City parking: the final fitted-glass version passes 424,213 placement/geometry checks, with 179,952 transformed vertices inside colliders, 143,630 Titan clearance sweeps and 42 gameplay checks. The earlier 438,481-check version used more box vertices; replacing those with fitted glass quads reduces geometry. Harbor has 10 cars; Chase and Drift have 18. Player, rival and police all hit solid parked cars. Six actual App city runs finish with no unintended hits or resets.
- Cosmetic city relocation: 3,770,694 checks. Of 18,954 cosmetic instances, 4,706 moved away from sidewalks/driving corridors; none were removed. Non-city instances and physical transforms are unchanged.
- Daylight choices: 2,666 lighting checks and 135 App checks. Clear, Golden hour and Overcast produce identical 1,084-sample trajectories, rewards and ghosts in the same 105.38-second Time Trial. Night and tunnel constraints remain active. Browser menu selection, persistent Golden hour on reload, disabled Night event selection, golden coast and overcast pass were reviewed.
- Meadow material: 323 focused checks and 313,578 landscape checks. The original transparent grass image, geometry, placement and wind are retained. Cooler tint, soft root shading and mostly upward diffuse normals remove the glaring folded-card appearance. Front/back lighting is consistent; close-up browser review passed.
- Pine material: 1,725 focused checks and 47,441 vegetation checks across 4,984 unchanged instances. Smooth radial/upward crown normals retain depth with consistent front/back lighting; the generated bark map adds color and subtle bump to unchanged trunks. The browser crown close-up shows a darker evergreen canopy.
- Standalone completion: 72 checks. Garage events use their actual name, settled reward, precise time and objective metrics after final navigation. Campaign-only geography and lives no longer appear on a city escape or other standalone event. Three-stage campaign results are unchanged.
- Tire effects: 160 checks. Road contact now uses the same visible-surface sampler as the car, preventing raised marks where a shortcut approach flattens roadside relief. Tire marks connect actual ground contacts at 30/60/144 FPS and restart cleanly after release or reset. Neutral generated smoke and continuous tracks were reviewed in the city drift fixture.
- Experimental shader preparation: 132 controller, 63 readiness, eight App lifecycle and 119 retained-renderer checks pass. `?warmup=1` requires parallel shader compilation; default stays off. It restores the render target, prevents simulation advancement before the first drawn frame and defers resource disposal safely.

Browser timing samples from the same QA sequence are exploratory, not a controlled benchmark. With warmup off, first composer calls took 2,184 ms at menu, 1,248 ms in Alpine and 1,370 ms in City. With warmup on they took 592/131/223 ms, plus submission of 40/236/152 ms and asynchronous waits of 174/989/119 ms. Shader caches and driver scheduling affect these figures. Warmup does not cover every shadow, post-processing, texture upload or geometry upload cost; do not describe it as eliminating loading pauses.

Two actual browser Hard chases with optional shader warmup each finish in 99.68 seconds. The first earns 2,300 credits including the one-time Night Escape milestone; the repeat earns 1,950. The corrected final screen shows CITY ESCAPED, the exact time, 2/2 laps and settled credits. Returning to the menu shows 32,610 credits and the correct car best.

The final tire-grounding correction passes 3,665 checks using all seven actual vehicle models and rendered asphalt, gravel and shortcut triangles. Intact tire bases and rolling radii are measured once; the whole car moves together and road pitch/roll use yaw-first orientation. The steep Ridge Rally s=2168 Titan contacts improve from roughly −40 to +40 cm to 0.91–1.03 cm. Browser views of Titan and the imported Falcone confirm grounded tires and intact bodies. Other sampled crests retain −4.0 to +6.5 cm variation because this remains a rigid visual chassis. All actual model bodies remain over 5 cm above their tire plane. Paint 2,410 and effects 160 checks pass after integration; airborne displacement and damage reset remain intact.

Final `npm run build`, `npm run qa:build` and `git diff --check` pass. The release contains the new bark and packaged license; the QA controls are excluded. Vite reports its known renderer chunk-size warning (about 917 kB minified / 278 kB gzip). No new runtime dependencies were added. Latest inspected QA browser logs contained no warnings/errors after 10:00 UTC. Temporary QA tabs were closed at the 5% quota stop.

The packaged asset audit resolves all runtime URLs and confirms self-contained GLBs. It restored the unmodified upstream `LicenseRef-LegalMark-Khronos.txt` under `public/LICENSES/`, fixing two broken relative links in the model license. Original/source audio, generated textures and route presets are included in the normal build.

## Assets and limits

Seven garage vehicles and nine two-lap events are implemented. Generated modeling references and material maps support the scene work. Source licenses and generated prompts remain documented in the asset folders and `IMAGE_PROMPTS.md`.

The engine/tire files are real licensed recordings. Seven voices mix shared recordings; they are not seven independently recorded cars. Police wails, impacts, salvage-car crunches and several other cues are original synthesis.

No new runtime dependency was installed. The game uses Three.js, Web Audio and the browser Gamepad API. GLBs were exported and reloaded, but no Blender render was performed. Blender was not found on PATH, in the checked registered installations or as a running process. Native release, Unreal migration and broad hardware testing are not claimed. Driving remains arcade drift and bounded visual damage, not soft-body simulation or an open-world GTA game.

## Audio depth continuation

The post-checkpoint audio pass uses the existing licensed recordings and adds filtered exhaust-body and intake paths, car-specific balance, a smooth recorded-load gear-change envelope, camera-aware hood/chase/wide perspective, a normal-driving asphalt tire bed and a stable fade into the recorded squeal. It also lowers the in-race synthesized sequencer so vehicle cues remain dominant. No source asset, licence, runtime dependency, handling rule, event, reward or save format changed.

Validation passes 248 focused audio/PCM checks with 301,448 finite Web Audio automation commands, 70 App/progression integration assertions, and the unchanged 481-check core simulation with 60 complete campaigns and 180/180 stage wins. Production and QA builds pass with only the existing renderer chunk-size warning. Browser QA on isolated port 5176 reported `Audio running · samples ready · ambience ready` in Pacific Canyon Circuit, Midnight Muscle Chase and Neon Drift Trial; the inspected browser log had no warnings or errors. This is browser decoding and runtime evidence, not a substitute for human listening on headphones and speakers.

## Release 26 September 2026: two live fixes (GATE-REJOIN, RALLY-CHECKPOINT)

Kyle and Gratian reported both in the live game. GATE-REJOIN: after driving
far enough up the hidden road for the clock to stop, reversing back to the
course left the race frozen (opponent parked, weapons and pickups dead,
clock stopped). Leaving now pauses the race with RACE PAUSED · DRIVE BACK TO
REJOIN; driving back resumes it with BACK IN THE RACE; only driving through
the gate settles it as abandoned (docs/changes/GATE-REJOIN.md).
RALLY-CHECKPOINT: the rally car, exempt from the course boundary, was
snapped back onto the road when it crossed a lap checkpoint out on the dirt
near Pacific Canyon's shortcut. Off-road-capable cars now count a checkpoint
within 120 m of the road or a shortcut; ordinary cars are unchanged; a
boulder stop says ROCK TOO BIG / BACKING OFF (docs/changes/RALLY-CHECKPOINT.md).

Everything else merged since the last release stays behind switches that are
off in the live game (scrapdome, crash-physics, crash-effects, titan-climb,
muddy-hollow). Release evidence for this exact commit is recorded in
docs/board/run-log.md.

## Release 27 September 2026: crash physics (CRASH-01 to CRASH-05, CRASH-RELEASE)

Kyle accepted crash physics in the Preview and asked for it in the real game.
`crash-physics` and `crash-effects` are now on. A car hit by another is solved
as a rigid body: it is smashed ahead, spins and slides to rest; smashed
traffic ends beyond the shoulder (docs/CRASH_PHYSICS.md). In Mad Max Duel both
cars take the hit and armored cars keep control; wrecks and shoved cars stay
solid; hits over 250 km/h closing explode the car after the smash; the nearest
wrecks smoulder all race; ram damage follows each car's change in velocity and
kit plating adds mass. Crash sparks, crumple, tyre smoke and impact sounds
come with it (CRASH-02).

Balance is judged on thirty races per difficulty (BALANCE-SAMPLE). Crash
physics made Hard harder (8 of 30 wins fell to 5, because every traffic smash
costs the player real speed), so the Hard Mad Max CPU now attacks every 6
seconds instead of 5 (its aim is unchanged): 8 of 30 again. CPU-hit targets
are now bands for the thirty-race mean. The Scrapdome, Titan climbing and
Muddy Hollow stay switched off. Release evidence for this exact commit is in
docs/board/run-log.md.

## Release 30 September 2026: Scrapdome, Titan climbing and Muddy Hollow (SCRAPDOME-RELEASE)

Kyle and Gratian played all three in the Preview; Kyle approved them for the
real game on 30 September. `scrapdome`, `titan-climb` and `muddy-hollow` are
now on; `career-backup` stays in development. The Scrapdome is reached only
from the yard and Muddy Hollow only by driving there; the main menu is
unchanged. Warlord fights are not in this release: they get their own
`warlords` switch in development (docs/SCRAPDOME.md section 5).

Also in this build: the crash switches are gone with crash physics permanent
(CRASH-SWITCH-REMOVE), and on-screen hints for leaving and re-entering the
car (UX-ENTRY-HINTS). Known item: the Titan is slow to turn at crawling
speeds; TITAN-HANDLING fixes that next.

Evidence on the release commit: full tier 298 of 298 (a first run hit a port
Windows had reserved in tools/test-launcher-port.mjs, unrelated; the rerun
passed cleanly); combat balance with the released rules passed (wins 26, 19
and 8 of 30 on Easy, Medium and Hard; CPU hits 2.67, 7.2 and 5.53 per race).
The balance run with wasteland2 off is retired by Kyle's decision of the same
day (BALANCE-W2-OFF-RETIRE).

## Release 30 September 2026 (second): ramp sides and Titan steering

Kyle asked for the Scrapdome ramp fix in the live game the same day he found
it: driving up the side of a jump launched cars 600 to 2,200 m into the air.
ARENA-RAMP-SIDE limits the vertical speed the ground gives a car in an arena
to its travel speed times the steepest authored ramp slope; straight jumps are
exactly as before, and sliding wrecks now stay on the floor. Also live:
TITAN-HANDLING (Kyle approved the Titan's low-speed steering in the Preview),
HK-LAUNCHER-PORT (a test fix). Sal's fight, the Side Saws and the warlord
reward are in this build but stay off behind the `warlords` development
switch. Release evidence is recorded in docs/board/run-log.md.

## Release 30 September 2026 (third): Sawtooth Sal (WAR-SAL-RELEASE)

Kyle beat Sal 3-0 on Medium in the Preview and asked for her in the main
game. `warlords` is on: Sal's fight (WAR-02a-FORMAT, WAR-02a-SAL, with Claude's
sweep and charge time limits), her reward and Side Saws (WAR-02a-REWARD) and
the settled pay (WAR-PAY: first win 600 times the difficulty factor, rematches
like an arena win). The main menu is unchanged. Release evidence is recorded
in docs/board/run-log.md.

## Release 30 September 2026 (fourth): save fix (SAVE-DAMAGED-FIELDS)

Kyle's go-ahead: a named career whose saved file has a number that cannot be
converted now keeps the career, using that field's existing zero fallback;
before, the conversion failure could discard the named player's career. No
save schema or key changes. Release evidence is in docs/board/run-log.md.

## Release 4 October 2026: the Wasteland's second wave

Kyle played the Preview and asked for everything in it in the main game, and
for the controls to stop sitting on the screen. `fuel-run`, `bounty-hunt`,
`arsenal`, `salt-flats` and `crew-gear` are on (they stay in the switch list
until retired). Also live: the Dustmonger, Mother Mirage, the Kettle Kingpin
and the Twin Vultures (WAR-02b, WAR-02c, WAR-03b, WAR-03c on WAR-HOOKS), the
Pit (ARENA-PIT), Fuel Run (ARENA-03), Bounty Hunt (ARENA-04), the Salt Flats
(ARENA-06), Oil Slick, Smoke Screen, Harpoon, Caltrops, Rocket Pods, the
Flamethrower and Scrap Magnet (ARS-CORE, ARS-01, ARS-02), the eight crew
signature gear items and boarding (CREW-02, CREW-03), and the H key
(HELP-KEY). Gearhead Gunn, the Tollkeeper, Baron Blackiron, Ambush Alley and
the Convoy Raid are not built and stay out of the game. The Decoy Drone,
Mother Mirage's reward, waits for ARS-03; her fight pays scrap only until
then. The Twin Vultures' buggies are Dusthawk Rallys, and the two-tone horn
in their design is not made.

Tests that pinned the five switches as development switches were changed on
purpose and are listed in docs/changes/RELEASE-2026-10-04.md. Tests that pin
the earlier combat and arena rules (replay fingerprints, CPU cadence, the Pit
and Salt controls, the on-foot weapons) now run with Arsenal and crew gear off
explicitly, with every assertion unchanged. Release evidence is recorded in
docs/board/run-log.md.


## Release 9 October 2026: the rest of the Preview

Kyle played the Preview and asked for everything in it in the main game.
`convoy-raid`, `tollkeeper`, `blackiron`, `warlord-cards`, `arsenal-wave3`,
`fight-voices`, `cpu-crews`, `ambush-alley` and `gunn` are on (they stay in the
switch list until retired). `career-backup` stays a development switch. Also
live: Gearhead Gunn (WAR-03a), the Tollkeeper (WAR-03d), Baron Blackiron
(WAR-03e), the story wall, results posters and Vesper (WAR-04), the Mortar,
Tesla, Nitro and Decoy Drone weapons (ARS-03, which also makes Mother Mirage's
Decoy Drone reward real), Convoy Raid (ARENA-07), Ambush Alley (ARENA-05),
computer crews (CREW-04) and Fight Voices.

Thirteen test files that pinned these nine switches as development switches, or
whose older baseline relied on one being off, were changed on purpose and are
listed in docs/changes/RELEASE-2026-10-09.md. Development-switch rules are
still tested with the switch pinned to dev in a test catalog; older baselines
now name the switch off explicitly. No fingerprint, number, tolerance or
expected value changed. The full tier passed on the release commit, 363 of 363.
Browser scenarios convoy-raid, gunn, blackiron, arena-ambush-alley, cpu-crews,
arsenal-wave3, new-warlords, fight-voices and frame-pacing all passed with
memory-only saves, no warnings and no issues. Release evidence is recorded in
docs/board/run-log.md.

## Release, 25 October 2026 evening (Claude, Release Manager)

Release commit `7516eedf` plus these notes: `cpu-racecraft` switched on with
the wide start and the lane-holding fix (GP-RACECRAFT-ARDENNES), and The
Deep's DEEP-PLAYTEST-1, DEEP-RAMP-2 and DEEP-EXPLORER. Full tier on 7516eedf:
511 passed, 0 failed, 0 not run (1,436 s). Frame checks run alone with the
graphics card idle: deep-frames (kelp forest, High and Performance) and the
eight-car grand-prix recipe both pass their 18.5 ms limits. Racecraft batch
(360 races): Panorama 8+-crash races 12 to 5, mean crashes down on all three
courses, Pacific race time up to 3.10% (accepted).

## Release, 25 October 2026 night: Story release 2 (Claude, Release Manager)

`lab` and `lab-tuning` switched on (LAB-LIVE, LAB-LIVE-FIX). Full tier on
release commit `4a53aa1f`: 515 passed, 0 failed, 0 not run (1,465 s). The
first full tier on 499a742c failed four suites the switch-on exposed; fixed
forward in LAB-LIVE-FIX and reviewed. Frame check, eight Speirlings, run
alone with the graphics card idle: High 18.4 ms, Performance 18.3 ms (limit
18.5); only a sound recipe and tests changed since. Scripted player pass: all
16 Lab lessons pass with simple play (LAB-CHALLENGE-EASE).

## Release, 26 October 2026 early morning: live fixes (Claude, Release Manager)

HELI-CARRY-CLEAR (helicopter lesson 4) and SAVE-RECORDS-IDB (ghosts and
telemetry in IndexedDB, reserve removed, independent save review clear).
Also merged but behind dev switches: SKI-PICKUP, SKI-AUDIO effects,
LESSONS-ICE-GATE, driving lesson 1 failure wording. Full tier on release
commit `591d9245`: 516 passed, 0 failed, 0 not run (1,475 s). No frame check:
race scenes are unchanged since the 25 October passes (rule 19); lesson 4
adds one ring to a lesson view, far below the busiest race view.

## Release, 26 October 2026 afternoon (Claude, Release Manager)

HELI-LANDED, HELI-RETURN-LOADS, GP-CAREER-LIVE (`grand-prix-career` on),
GHOST-SAVE-MESSAGE, SUMMIT-TUNNEL-WALL, SUMMIT-GROUND-GAPS. Also merged
behind dev switches: LAB-WALK, lesson 1 Beaver fix, map, ski and rescue
finishing passes. Full tier on de0555b0: 518 passed, 2 failed
(`test-terrain`, `test-map-destinations` expected the pre-fix Summit ground);
both updated with a reviewed note (only Summit changed, 3 heights by at most
0.17 m) on 301e61c0, where they and the lane tier for those changes (9/9)
pass; no game code changed after the full tier (rule 19). Frame check,
Summit, eight cars, headed, alone, GPU idle: p95 16.8 ms High and
Performance; world build 1,051 / 1,013 ms, over the 1 s limit, shipped as a
warning by Director decision (SUMMIT-BUILD-TIME-2).

## Release, 26 October 2026 evening: Summit finish (Claude, Release Manager)

SUMMIT-FINISH-AREA (look accepted at round 3) and SUMMIT-BUILD-TIME-2. Also
merged behind dev switches: HELI-LOGBOOK, ski tuning, LAB-LESSON-FRAME,
LAB-LIFT-2. Full tier on f514c859: 525 passed, 1 failed
(`test-audio-crash-peak`, no audio change; its one rerun on the same commit
passed, rule 3; QA-AUDIO-CRASH-PEAK-AGAIN). Frame check, Summit, eight cars,
headed, alone, laptop panel off, GPU idle: p95 16.8 ms at both qualities
(pass); world build High 1,036 ms, Performance 984 ms then 2,589 ms on the
rerun: a warning, shipped by Director decision as on 16 October; follow-up
SUMMIT-BUILD-TIME-3.

## Release, 26 October 2026 night (Claude, Release Manager)

GO-LIVE-EVENING (`driving-lessons`, `heli-logbook`, `heli-skiing`, `rescue`
on; `tyre-slip` stays dev, lessons keep their own sliding rules), lab-2 with
LAB-BRIAN-FIX, LAB-LESSONS-WORKSHOP and LAB-LESSONS-FLYING, plus
DRIVE-LESSON-ANY-COURSE, the ski tuning and rescue margins. Full tier on
release commit 4e94aed2, run alone: 528 passed, 0 failed, 0 not run (1,801 s).
No frame check this release: no timing recipe exists for the ski and rescue
views (HELI-VIEW-FRAMES); race scenes are unchanged since the evening Summit
check (rule 19). Released at Kyle's direction to test in the real game.

## Release, 27 October 2026 (Claude, Release Manager)

LAB-LESSONS-SNOW and LAB-LESSONS-TUNNEL (lab-2 on). Full tier on release
commit 3dd322a4, run alone: 530 passed, 0 failed, 0 not run (2,477 s). No
frame check: race scenes unchanged since the 26 October Summit check (rule 19).

## Release, 27 October 2026 morning (Claude, Release Manager)

LESSON-INSTRUCTOR-ANY-CAR and HELI-SUMMIT-LANDED, both live fixes from Kyle's
play. Rule 19: the last full-tier pass is 3dd322a4 (530/530); since then only
`src/lessons/drive-lessons.js`, `src/heli/heli-ui.js`, two lines of
`src/app.js`, their tests and docs changed (no core, save shape or physics).
Lane tier for each change: 34/34 and 42/42; on the merged commit the lesson,
helicopter view and mode suites pass and the build passes. The every-car
instructor suite passes 196/196. No frame check: no scene changed.

## Release, 27 October 2026 afternoon (Claude, Release Manager)

LESSONS-V2-RULES and LESSONS-V2-VIEW (driving lessons, second version;
`driving-lessons` stays on). Full tier on release commit 9d521bb0, run alone:
532 passed, 0 failed, 0 not run (1,823 s). Every-car instructor suite
196/196. No frame check: lesson drawing is new but lessons are not races and
race scenes are unchanged since the 26 October Summit check (rule 19).
Brian's new lines follow in LESSONS-V2-LINES.

## Release, 27 October 2026 evening (Claude, Release Manager)

LESSONS-V2-LINES: 22 new instructor lines, 47 old lines and files removed.
Rule 19: the last full-tier pass is 9d521bb0 (532/532); since then only the
lesson radio code in `src/lessons/` and `src/app.js`, the voice files, the
audio catalog, two lesson tests and docs changed (no core, save shape or
physics). Lane tier 97/97 in the lane; on merged commit 39107cda the lesson
lines suite (314 checks), lesson run suite, every-car instructor suite
(196/196) and build pass. No frame check: no scene changed.

## Release, 27 October 2026 night (Claude, Release Manager)

LESSONS-V2-FINISH part 1 (Kyle's play: full runs, any step again; room to beat
the instructor; Woods braking road) and DEEP-ROCKS-PUSH, with the test-only
merges HELI-VIEW-FRAMES, QA-AUDIO-CRASH-PEAK-AGAIN and QA-SUMMIT-GLACIER-EDGE.
Rule 19: the last full-tier pass is 9d521bb0 (532/532). Since then the game
changes are lesson code (`src/lessons/`, the lesson lines of `src/app.js` and
one lesson line of `src/game.js`) and the Deep's rocks (`src/deep/`); no save
shape, physics or race rule changed. Lane tiers: lessons 39/39 (every-car
instructor suite 196/196), rocks 157/157 with replay fingerprints and world
signatures unchanged; builds pass. The nightly full check covers the whole
tier tonight. No frame check: no race scene changed.

## Release, 28 October 2026 (Claude, Release Manager)

MAP-FINISH: the `pilot-map` switch goes on (the map's build items merged 26
October; Claude judged the look sheet). Rule 19: since the last full-tier pass
(9d521bb0) the only new change is the switch and its three switch-state
assertions; lane tier 37/37 and build pass; map suites 499, 300 and 529
checks. The nightly full check covers the whole tier. No frame check: no race
scene changed.

## Release, 28 October 2026 early (Claude, Release Manager)

DEEP-TRAIL-JOINTS: the Deep's frame turns smoothly at trail joints and its
nearest point is the exact inverse. Rule 19: since 9d521bb0 the only new game
change is in `src/deep/`; lane tier 156/156 with replay and world-signature
guards passing; build passes. The nightly full check covers the whole tier.
No frame check: no race scene changed.

## Release, 28 October 2026 night (Claude, Release Manager)

Fix forward for DEEP-TRAIL-JOINTS (live since 05:37: the dive ended on the
first throttle; found by test-deep-kelp-coast, which the joints lane tier did
not select). Also FINISH-DEEP place titles with the Coast Cup card fix and the
EARN-FINISH night pass (behind `earned-cars`, still dev). Rule 19: game
changes since 9d521bb0 are in `src/deep/`, `src/lessons/`, lesson lines of
`src/app.js` and `src/game.js`, the earned-car view and one config number
behind a dev switch; no save shape, physics or race rule. On the merged
commit every `tools/test-deep-*.mjs` passes by hand; lane tiers: joints fix
26/26, Deep titles 48/48, earned cars 80/81 (the one failure was this fault).
The nightly full check covers the whole tier.
