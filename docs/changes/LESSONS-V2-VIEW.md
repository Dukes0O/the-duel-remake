# LESSONS-V2-VIEW

## Decisions before code

Use the approved RULES contract and section 14. The native plan supplies the
briefing map, road line, boxes and targets. Scoring observations supply the
gap, corner lights, checks and advice. Presentation never writes race state.
App holds the car at its gate while the briefing/help is open. The native
controller replays the late clip then resets for clean Watch. Enter skips
Watch; retakes begin at Your turn. Gold reads the existing best margin.
No new save field, dependency, network request or feature switch.

## Built

Four-step strip with its exact what-counts line; late/clean Watch with race
camera, corner captions and Enter skip; green/white/red line; brake and lift
boxes; upright, surface-conforming road speeds; target beside the speedometer
with current km/h and speed colours; live distance gap; corner lights; per-corner
result table and advice; briefing with real section map, illustrated words,
steps, clean-run definition and Brian's intro; reopen-help button; board gold.
The existing driving-lessons switch controls it all. No frame timing.

## Checks

All commands used PowerShell with System32 first on PATH and jobs at most 4.
Admission counts were 0 or 1 before jobs, never above the shared cap at the
one-minute recounts. No competing job was stopped. Installed imageio FFmpeg
was supplied through FFMPEG_PATH for the unrelated audio suite.

- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: selected 52
  suites against integration/wasteland, so RULES is included. First attempt:
  23 passed, host suite failed, 28 unrun. Preserved the passing checks.
  Fixed host suite: **20/20**. Continuation: **28/28**, zero failed/unrun,
  **386.19 s**. Combined lane coverage: **52/52**.
- Every car and both settings: **196/196**, clean and repeatable.
- Replay guard: **225 checks**, 25 cases, 23 events, nine categories,
  three frame rates and three runs; fingerprints unchanged.
- New VIEW tests: **2/2**, target-colour boundaries, read-only markup,
  briefing hold, exact native late-to-clean replay, captions and skip.
- Final road-lettering drawing fix: renderer warmup and scene guards
  **2/2**, 0.12 s; final native browser close-up confirms readable lettering.
- Final `npm run build`: **PASS**, Vite **952 ms**. Existing chunk-size and
  dynamic-import notices remain. No code changed after these checks.
- Final browser `lessons-v2-view`: **PASS**, **1366 x 768**, private port
  **33640**, **12 pictures, zero warnings/errors**, memory-only storage.
  Enter starts once, skips Watch and closes help without advancing;
  leaving clears the speed colour. Your turn has no ghost; Follow has one.

The browser uses recorded inputs through native physics for student pictures;
no outcome is injected. Its temporary career alone supplies lesson-2 access
and a saved margin for the gold-board picture. No real saves were read.

## Assertion changes

No existing assertion changed or loosened. The native App fixture now calls
nextLessonAttempt once to dismiss the new briefing before its existing Watch
and skip assertions. This adds a setup assertion. The reviewer confirmed it.
While authoring the new VIEW test, corrected its initial fixture expectation:
all four rules belong on the briefing; Watch's panel shows only Watch's rule.

## Independent review

Approved. Fixed and confirmed: Enter bubbling/help dismissal, label heading,
speed colours after leaving, premature braking captions, optional display
fixture data and component CSS scope. Kept the existing tested radio position
and tiny-host disposal. The reviewer also approved the illustrated lesson
words and road quad with its height samples and upright UVs. No remaining
code defect found. No scoring, physics, reward or save change after lane runs.

## Pictures for Claude

Directory:
`C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.evidence/2026-10-27/LESSONS-V2-VIEW/`

- `panorama-jesko-briefing.png`
- `panorama-jesko-watch-late-caption.png`
- `panorama-jesko-watch-clean-caption.png`
- `panorama-jesko-follow-line-ghost-zone-target.png`
- `panorama-jesko-road-target-number.png`
- `panorama-jesko-your-turn.png`
- `panorama-jesko-beat-gap.png`
- `panorama-jesko-result-corner-table.png`
- `board-gold.png`
- `harbour-lesson-2-follow.png` (yellow lift box)
- `harbour-lesson-2-how-it-works.png`
- `harbour-corner-speed-green.png`

Passed report: `view-browser-report.json` beside them. Keep these for Claude.
No requested feature remains unbuilt. Claude's player finishing card and the
new voice takes remain their separate cards. No merge, push or live install.

## Removed

Removed the temporary result paragraphs, old compact panel styles and obsolete
middle-road marker display. Replaced the flat road-number planes with quads
that follow slope/camber. Recycled generated builds and local duplicate
captures; kept the recipe, tests, verdict and requested review pictures.
Session-end status is included. Cockpit sync completed: zero task changes;
it reported unrelated HELI-SUMMIT-LANDED without a task; no hand edit made.

## Claude picture review follow-up

Requested before merge: use the speedometer's shared speedKph/formatSpeed at
all lesson display boundaries, including road paint, captions, tolerance and
structured advice. Keep mph in simulation and scoring. Put the step panel
below the mirror using its 30vw / 3.2 height, leaving course name and time
clear. All-passed corner observations get a whole-run advice sentence.
Remove crossed map leaders; put short numbered markers at the corners and
keep a matching speed key. Full adjacent speed labels overlap Harbour esses.
No rule, threshold, save or race-state change.

Planned checks: display conversion/advice tests, native browser bounds and
speedometer equality, lane tier jobs 4, then build. Replace prior pictures.
The one existing target-text assertion changes from Corner 56 mph to Corner
90 km/h to match the shared conversion; no threshold assertion changes.

Follow-up review: approved, no remaining defect. New display test passes
3/3, including exact speedometer rounding, no mph in screen markup, clean
advice without a corner name, and missed-speed advice from unrounded data.
The browser checks panel bounds against mirror/course/time and compares
"Your speed" with the actual speedometer. Final picture run: 1/1 scenario,
12 pictures, zero warnings/errors, memory-only, private port 7899, laptop
1366 x 768. Visually checked Panorama and Harbour briefings, Follow me and
result. Replaced all 12 prior pictures and report in the same evidence folder.

The direct browser rebuild first hit EBUSY while the gate used a scratch
course fixture. No source change: the existing run-browser-scenarios runner
then passed with its separate build leaf. No new test machinery added.

Follow-up final gate: `node tools/run-tests.mjs --tier lane --changed --jobs 4`
(JSON output only for the receipt) **52/52 PASS**, zero failed or unrun,
**311.35 s**, including all affected suites and RULES. Every-car instructor:
196/196; replay fingerprints unchanged. Then `npm run build`: **PASS**,
Vite **865 ms**, existing chunk/dynamic-import notices only. No source change
after these passes. Admission counts 0/1 and minute recount 2; no competing
job stopped. System32 first on PATH, installed FFmpeg supplied as before.
Cockpit sync: zero task changes; the same unrelated unmapped card remains.
Generated output and duplicate local captures recycled. Nothing merged/pushed.

Follow-up Removed: removed imperial screen formatting, the corner-specific
all-clean advice, crossed map leader lines and the mirror-covering panel
placement. Internal mph rules and thresholds remain unchanged.
