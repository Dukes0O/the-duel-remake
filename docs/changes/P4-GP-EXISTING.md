# P4-GP-EXISTING

Status: building. Claude settled best-lap ghosts; playback remains Time Trial only.

## Design before code

Offer Grand Prix on the three original closed road circuits and six expansion
circuits, behind the existing grand-prix switch. Use the settled eight-car,
three-lap field with no traffic, police or radar. Keep course IDs, geometry,
layout versions and every existing mode unchanged. Widen only if the full-field
check proves a particular section cannot work.

Grand Prix records use additive mode keys and three-lap validation; legacy
record and ghost keys remain exact. The score screen offers a separate GP
filter; All existing modes retains its old event key. A valid finish records without credits,
loss charges or milestones; pay belongs to P4-CAREER. Grand Prix records a separate best-lap ghost per event, route and mode,
for the later Team Room. Playback stays Time Trial only. The same course access rules still apply.

The Director granted narrow hooks in race-field, app and progression, plus
FIELD test updates. The previous High Country rejection expectation will use
Titan Arena instead: the test still requires unsupported events to reject GP.
This reflects newly supported road circuits, with no tolerance change. Internal
leaderboard deduplication now includes mode so old Duel and Time Trial rows can
coexist; their serialized event keys remain unchanged.

## Checks

Test-first eligibility failed on missing High Country support before code.
The GP best-lap recorder starts from native grid and interpolated line crossings;
completed unassisted laps alone can replace the mode best. Existing ghost keys,
Time Trial playback and storage caps remain exact. Native checks cover
every grid, first corner and narrow stretch with eight cars. The focused
246-check pass covers eligibility, state parity, mode rows and pure lap ghosts.
The later native App run was interrupted for the four-lane cap; no verdict.
A failing twelve-valid-TT fixture proved new GP admission silently evicted an
old recording. GP admission now rejects count/byte overflow before eviction,
keeps the original store bytes (including archives), and retains a queryable
session candidate. Results explicitly say storage full or save failed; no claim
of persistence. Eleven pure storage checks pass; old TT admission is unchanged.
Restored original UTF-8 punctuation in owned sources. Browser, save re-review,
current lane/build remain pending. Root source review and named save-guardian
review cleared 4cb54419 (11 storage checks plus 247 save fixtures). This final
presentation-only cleanup keeps the new GP notice readable. No art change.

## Reviewed source sync

Synced a89e562c (DAYNIGHT and atomic native audio capture) without conflicts.
GP storage admission and record modules stay byte-identical to c77e937d.
Synced e648f380 (all-27 Dossier and reviewed Telemetry) next. App conflicts
combine imports, startup, go observations, reset and cleanup for GP, TT and
Telemetry; incoming storage modules and GP storage modules remain exact.
No qualifying source is included. No native check, gate or build ran during
the shared gate; the combined source needs current checks before handoff.

## Native recipe repair

The built QA preview cannot serve raw source-module imports. Bundle the actual
course-access, configuration, race-line and existing installTestDriver helpers
with installed Vite in memory. No helper output, dependency or runtime hook.
All 18 native grid/corner/width/state assertions remain unchanged. Native,
current lane/build checks stay queued until the Director grants a quiet slot.

## Native first result

Native 2aa40030 stops at Azure Riviera High: three distinct computer racers
crash by 8.775 s, violating the unchanged fewer-than-three opening check.
Pacific, High Country, Harbor, Eifel and Alpine High passed with zero crashes;
remaining cases were not run. Native helper loads with no raw-import failure.
Retain the failed packet in integration evidence for Claude's decision.
QA now saves the failed corner's crash events and actual actor poses before
throwing the same assertion. No width, race rule or limit changed; no full
18-case pass or performance claim. Further native/balance checks await schedule.

Bounded headless reproduction at the same seeds: fresh Azure and the six-course
sequence both have zero crashes through 232 m at 8.375 s across outer steps
1/60, 1/30, .05 and .1 s. A second check uses the five actual native stop times
and pause/resume, continuing Azure to 10 s: one racer crashes at 9.10 s, none
by the failed native 8.775 s. This does not reproduce or explain the native
three-car failure. Keep the native assertion and Claude hold; no rule change.

Claude check-in4 judges Azure by the unchanged first30s pile-up rate <=1/20
over30 full seeded races per difficulty. Recipe calls existing runRace in
one job with its standard driver/seeds; restores a temporary start wrapper
that adds existing ownTestCourses only after the private memory facade exists.
No runtime/rule/assertion edit. Above-target evidence precedes any GP-only
start-line setback; current failed native assertion stays exact.

## Removed

No runtime asset or legacy mode is replaced. Remove the stale menu claim that
Grand Prix cannot record once recording is wired. No width change is assumed.
