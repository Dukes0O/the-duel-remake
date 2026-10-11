# P4-GP-EXISTING
Status: building. Claude settled best-lap ghosts; playback remains Time Trial only.
## Design before code
Offer Grand Prix on the three original closed road circuits and six expansion circuits, behind the existing grand-prix switch. Use the settled eight-car, three-lap field with no traffic, police or radar. Keep course IDs, geometry, layout versions and every existing mode unchanged. Widen only if the full-field check proves a particular section cannot work.
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
A failing twelve-valid-TT fixture proved new GP admission silently evicted an
old recording. GP admission now rejects count/byte overflow before eviction,
keeps the original store bytes (including archives), and retains a queryable
session candidate. Results explicitly say storage full or save failed; no claim
of persistence. Eleven pure storage checks pass; old TT admission is unchanged.
Restored original UTF-8 punctuation in owned sources. Browser, save re-review,
current lane/build remain pending. Root source review and named save-guardian
review cleared 4cb54419 (11 storage checks plus 247 save fixtures). This final presentation cleanup keeps the GP notice readable. No art change.
## Reviewed source sync
Synced a89e562c lighting/atomic audio, then e648f380 all27 Dossier/Telemetry. App unions retain GP/TT/TL startup, go, observe, reset and cleanup. GP storage
and record modules stay byte-identical to c77e937d; no qualifying source.
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
remaining cases unrun; helper loads without raw-import failure.
Retain the failed packet in integration evidence for Claude's decision.
QA now saves the failed corner's crash events and actual actor poses before
throwing the same assertion. No width, race rule or limit changed; no full
18-case pass or performance claim. Further native/balance checks await schedule.
Bounded fresh/sequence Azure repro at1/60,1/30,.05,.1 s has zero crashes
through232m/8.375s. Native five-stop/pause cadence through10s finds one
at9.10s and none by8.775s, failing to explain the native three-car result.
All native assertions stay exact; no rule change.
Claude check-in4 judges Azure by the unchanged first30s pile-up rate <=1/20
over30 full seeded races per difficulty. Recipe calls existing runRace in
one job with its standard driver/seeds; restores a temporary start wrapper
that adds existing ownTestCourses only after the private memory facade exists.
Rate recipe changes no runtime/rule/assertion; native assertion stays exact.
Actual fd925862 full90: Easy2/30, Medium10/30, Hard2/30 opening pile-ups; all exceed5%. Every race finished; seeds/layout/state fingerprints retained.
Claude check-in5 approves only Azure GP grid staging400m earlier: timing and
visible line stay0, lap one is400m longer. Duel/TT and all other GP grids,
road geometry and record/ghost keys stay exact. Native assertion unchanged.
Genuinely sync ec734cfd before narrow initializeField pose assignment.
All8-position RED old[-6..-34] vs staged[-406..-434]; GREEN151 grid checks
and406 focused checks. New fixture corrected legacy field=null to undefined;
old assertions exact. Storage modules unchanged; first staged ghost bound needs
Director decision. Setback90: Easy3/30 (10%), Medium5/30 (16.67%) fail;
Hard0/30 passes5%. All90 player3laps/all7CPUfinish; layout7f43383b unchanged.
Full rawsetback report retained; exact225-295m GP +2m total entry asksClaude.
Actual fresh memory App Azure passes417checks: native staged lap86.134s
has honest-426m start, clean/uninvalidated, excluded; flying lap62.87s saves
from0 with exact62.87027493425816s crossing-clock delta. First lap time kept.
New fixture compares exact clocks and rounded-ms event separately; initial
exact-vs-rounded fixture corrected, no tolerance or oldassertion edit.
## Approved entry/ghost design, before code
Claude check-in7: Azure GP-only +2m total, smooth zero225m to peak260m to zero295m.
Immutable opt-in course metadata feeds Course.roadHalfWidthAt; road center, elevation, start/timing, Duel/TT and all other GP widths remain exact. Actual drawing, surfaces,
scenery clearance and racing line must share it; GP geometry fingerprint changes honestly.
Exclude only the actual staged Azure first-lap ghost, retaining its lap time and later clean flying ghosts; every sample bound, capacity and player guard remains.
Director grants only road-surface shoulder-width/material and world shoulderEdge hooks;
GP vertex width comes from Course with no duplicate passing-lane addition. Existing paths stay exact.
Genuine4527 sync b8bf3408 retains local9 plus Tremblant once; no other code conflict.
RED absent width metadata, actual shoulder mismatch and old-module staged flag absent;
GREEN11,228 Course/surface/line/world-vertex/shader/ghost checks,11 storage and86 TT ghost checks.
Legacy sampled fingerprint7f43383b stays exact; GP width honestly changes it to58a80e29.
No existing assertion or sample bound changed. Original90 seeds/5percent and native/gates wait.
Actual e1a78d21 original90: Easy2/30 (6.67%), Medium6/30 (20%), Hard2/30 (6.67%); all fail unchanged5%.
All90 player3laps/all7CPUfinish; original inputs/seeds/state hashes retained, GP layout58a80e29.
Packet azure-rate-width-e1 retained; native18/gates/build wait for the Director slot.
Claude10:30 approves Harbour existing opt-in first-lap gap and wall room (fieldFollow), Azure GP only, once Harbour merges.
No further width or new mechanism. Implement only after the actual shared mechanism merges, then rerun original90 against3.2.
## Legacy guard, before code
Save Guardian found damaged old-layout samples{} or42 without raceLength throws, hiding a mixedvalid store.
Director approves only Array.isArray before final-sample inference; valid bounds/keys/capacity stay exact.
RED exact.at TypeError; GREEN26 mixed/capacity checks and86 TT ghost checks. Renewed save review requested.
## Actual Harbour sync and Azure following
Genuine Harbour0cdf038a sync resolves only additive GP eligibility and authored grandPrixLaps hooks; actual Harbour4laps and shared defaults survive. Before code, Director settles Azure GP-only immutable fieldFollow wallRoom1, firstLap margin5/reaction.5/closeIn.8/wallRoom1.4; default leadBraking1.15, width/grid/time/ghost/save rules and all other modes remain exact. Existing overlay assertions alone add exact/frozen metadata and otherGP/Duel/TT defaults; no new mechanism, fixture or publisher. Team Room remains base-reference only pending Claude; original90/native18/current lane4/build wait source review and capacity.
## Removed
No runtime asset or legacy mode is replaced. Remove the stale no-GP-recording menu claim once wired. Replace implicit staged rejection with explicit first-lap policy; replace duplicate GP shoulder width after hook grant.
