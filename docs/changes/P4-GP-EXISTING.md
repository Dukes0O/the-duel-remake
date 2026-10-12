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
Original fieldFollow4dd90 complete/exit0: opening pileups0/30 each difficulty;
players3laps30/30 each and all7CPUfinish90/90. Opening criterion passes.
Observed0wins each and1.23Medium passes do not establish full3.2 balance.
Final scope/reference decision is with Claude; native18 waits metadata freeze.
No unchanged rerun or new mechanism.

## Removed
No runtime asset or legacy mode is replaced. Remove the stale no-GP-recording menu claim once wired. Replace implicit staged rejection with explicit first-lap policy; replace duplicate GP shoulder width after hook grant.
## Bounded tuning, 11 October 21:20 decision (before code)
Claude accepts base-only Team Room; widened Azure GP comparison is a low-priority follow-up.
Tune only GP course overlays through existing fieldPace and fieldAggression. Each of the nine existing circuits gets at most three original 90-race runs (30 original seeds per difficulty), preserving standard legal driver, eight-car field, three laps and section 3.2 targets. Stop at three; retain the closest measured result and let Kyle judge in play. Existing Duel/Time Trial metadata and authored circuits remain unchanged. Azure begins at pace .80/.78/.77 and aggression 1.4 because its current field wins all races and Medium passing is 1.23. Other circuits first measure their current pace; adjust only when the run identifies a gap. Prefer safety and completion before the smallest win-band/pass difference when choosing between measured settings.
The Director grants the existing tools/gp-existing-rate.mjs recipe only a course-id parameter. Preserve its original memory ownership wrapper, runRace seeds/driver, state/layout hashes and targets; no new harness. Record all runs and source before selecting a result. Storage and record sources receive no new edits; prior reviewed storage verdict remains subject to exact-byte proof.
## Authored Grand Prix record length, before code
Read-only integration review found merged Harbour Lights asks for four GP laps, but GP completion and leaderboard normalization still require three. The Director grants a narrow normalization fix once the current frozen Azure run drains: resolve the authored course by its existing stable id/index and use grandPrixLaps when present, defaulting to three. Keep existing mode keys, archive rules, base records and malformed-Pacific-four-lap rejection exact. Test actual native Harbour four-lap completion and record reload, plus default Pacific three-lap and malformed-four controls. This new integration interaction requires a fresh independent Save Guardian review before merge; the earlier exact-byte verdict alone is insufficient.
## Capacity interruption
Azure tuning attempt 1 on 3a82b78b was stopped at the Director's request when Claude's Tremblant Snow browser job created a third heavy job alongside Azure and Panorama. Retained stdout showed 15/30 Easy full races with zero opening pile-ups; the full 90-race report was not produced. This is incomplete evidence, not a target pass. Count this interrupted attempt conservatively as attempt 1 of the three-run cap. The next Azure run uses the existing four-job race-field-balance CLI, with the exact original driver/seeds/targets, after the Director releases capacity. No other team's process was stopped.
The granted correction also uses authored one-lap GP counts when a later stable-id open course joins COURSE (Summit Run). Default three-lap existing circuits remain exact. The Director explicitly grants the two leaderboard normalization sites and the leaderboard event filter and GP lap-count text alongside progression; genuine Harbour records must survive reload and remain visible. No ghost or wallet rule changes are part of this fix.
## Authored record fix evidence
The new regression first failed on the unchanged old source at “authored Harbour four-lap completion is valid”. The fix changes only the five granted authored-lap-count validation/filter sites and GP count text; existing three-lap circuits still default to three and legacy keys remain exact. Native GREEN was interrupted immediately after the capacity check exposed new Team Room browser and lane jobs alongside Panorama. No native GREEN or full fixture pass is claimed from that interrupted process. Next heavy checks use a separate inspected process snapshot before start.

## Fresh legacy record correction, before assertions
Save Guardian reproduced Duel120s followed by slower TimeTrial130s: the carried unconditional mode discriminator admitted a second row where the original combined key rejects it. The Director approved restoring the original Duel/TimeTrial key; the faster TT115s replaces Duel120s, and GP180s stays separate through its mode event key. Therefore the earlier three-row coexistence assumption is corrected to two rows. No timing, byte preservation, capacity, ghost bound or record-validity check changes. This correction must remain when the retained lane later syncs the separate career-pay slice.

## Settled Pacific and final Azure choice, before code

Original CLI Pacific attempt 1 on 2ec80395 passed all section 3.2 targets in 197.78 seconds: wins 22/30, 13/30 and 5/30; zero opening pile-ups; 90 actual player three-lap finishes; 630/630 CPU finishes; Medium passes 3.4667 per race. Keep its GP pace and aggression multipliers at one. No repeat is needed.

Azure attempt 2 on the same source ran all 90 races in 406.97 seconds. It kept zero opening pile-ups and 90 player three-lap / 630 CPU finishes, but 30/30 player wins at each difficulty exceeded every win band. Medium passes 2.4667 per race missed three. Raw reports are in integration evidence leaves pacific-baseline-1-2ec80395 and azure-tune-2-2ec80395. Original CLI emits no final-state hashes; none are claimed.

The Director approves Azure GP-only pace .96/.91/.90 and aggression 1.8 for its third and final attempt. Observed best-AI/player finish-time quantiles estimate .9614/.9112/.8999 when applied to the current .80/.78/.77 values for desired win shares; this is a starting estimate, not a pass. The existing capped pass-window/dive logic gets the aggression increase from 1.4 to 1.8 to address the passing deficit. Keep original first-lap spacing, grid, width, geometry, driver, seeds and every target/assertion exact. No other circuit or mode changes. Count the earlier capacity interruption as attempt one. After this final original 90, report the closest complete result honestly and move on under Claude 21:20. New jobs wait for a fresh shared-slot check.

## Final Azure measurement and accepted pay sync, before code

Azure attempt 3 on 5bb31482 completed the original 90 in 387.67 seconds, exit 1: wins 10/30, 6/30 and 2/30; Medium passes 2.3333. All win bands and the Medium passing target remain failures. Opening pile-ups were zero, actual player three-lap finishes 90/90 and CPU finishes 630/630, with no unfinished cars or stderr. The cap includes interrupted attempt one and is exhausted. Retain .96/.91/.90 and aggression 1.8 as the closest complete setting: both complete runs pass safety and completion, but final win shares are substantially closer than attempt two's 100 percent at every difficulty. The final passing result remains outside. Kyle judges the bounded result in play; no fourth run or target waiver. Raw final rows remain in integration evidence azure-tune-3-5bb31482.

The Director confirms pay actually merged at c80ab166. Sync that accepted ancestry after the frozen run drains, keeping the career dev gate, paid record/ghost paths and exact legacy leaderboard filter call. Preserve existing circuit eligibility and GP-only geometry/tuning; no driver, first-lap, seed or target changes. The old enabled-records/free-wallet fixture is superseded by the approved position-pay table. Add explicit career-dev overrides only where fixtures request GP records or ghosts; replace its zero-delta assumption with actual approved position pay, exact bank delta and once-only settlement bytes. Flag-off zero-pay behavior remains covered in the accepted pay fixture. No timing, capacity, damaged-legacy byte, ghost bound or validity assertion is relaxed. No extra standalone native run before the normal required GP checks.

## High Country attempt two choice, before code

Original baseline attempt one on f9ccc11f completed 90 races in 206.94 seconds, exit 1: player wins 30/30, 29/30 and 29/30 exceed all win bands. Opening pile-ups 0/1/0 of 30 stay within five percent; actual player three-lap finishes 90/90 and CPU finishes 630/630. Medium passes 4.2667 per race (4.1 after start) already meet the target; there were no unfinished cars or stderr. Raw rows are in high-country-baseline-1-f9ccc11f.

Bounded GP-only attempt-two choice: pace 1.10/1.065/1.055, aggression remains one. Actual best-AI/player finish-time quantiles estimate 1.0982/1.0656/1.0561 for desired win shares near 70/40/15 percent; race interactions can change that outcome, so this estimate is not acceptance. Add only an immutable High Country overlay through the existing per-difficulty fieldPace option. Its base course, geometry, first-lap spacing, driver, seeds and every target/assertion remain exact. No new mechanism. Stop when all targets pass, otherwise use at most one final run after attempt two, keeping the three-run cap.

## High Country final choice, before code

Attempt two on d985cf8f completed all 90 in 220.25 seconds, exit 1: Easy wins 19/30 and Medium 11/30 meet their bands, Hard 2/30 misses ten percent. Medium passes 3.1667 (3.1 after start) pass; opening pile-ups 0/1/0 remain within five percent. Actual player three-lap finishes 90/90, CPU finishes 630/630, no unfinished cars or stderr. Raw rows: high-country-tune-2-d985cf8f. Final attempt three changes only Hard GP pace from 1.055 to 1.050; its observed target finish ratio .995789 estimates 1.0506. Retain the passing Easy 1.10, Medium 1.065 and aggression one exactly, along with all original inputs, geometry and targets. This is the last High Country run; if still outside, retain the closest complete result honestly and move on.

## High Country settled; Harbour & Highlands attempt two, before code

High Country final attempt three on df38ec84 passes every original target, exit 0 in 285.28 seconds: wins 19/11/6 of 30, Medium passes 3.1667 (3.1 after start), opening pile-ups 0/1/0, all 90 player three-lap and 630 CPU finishes. Keep pace 1.10/1.065/1.050 and aggression one; no repeat. Raw rows: high-country-tune-3-df38ec84.

Harbour & Highlands baseline attempt one on df38ec84 completed the original 90 in 249.77 seconds, exit 1: wins 30/27/27 of 30 exceed all bands; Medium passes 2.8333 (2.6667 after start) miss three. Opening pile-ups 0/1/0 pass five percent, all 90 players completed three laps and all 630 CPUs finished, with no unfinished cars or stderr. Raw rows: harbor-highlands-baseline-1-df38ec84.

Attempt two uses only its GP overlay: pace 1.085/1.050/1.040 from measured target finish ratios 1.0848/1.0485/1.0393, plus aggression 1.25 to address the modest passing gap through the existing pass logic. These are estimates, not passes. Base course, geometry, first-lap values, original driver, seeds and every target/assertion stay exact. At most one final run remains after this attempt.
