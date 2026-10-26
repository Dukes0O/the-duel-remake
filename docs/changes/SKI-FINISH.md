# SKI-FINISH: keyboard evidence for Claude

26 October 2026. Evidence slice requested by Kyle. The feature remains dev;
Claude owns the finishing verdict. Radio remains on-screen text.

## Method and limits

Private headless Chrome, disposable profile and memory-only QA career, seed
1989, stock skis, no wax. The existing ski-view pilot flies the real session
to its pads. Skiing dispatches keyboard down/up events through the App's
normal keyboard mapping and fixed-step simulation. It does not position the
skier, inject scores or use analog ski steering. The script knows the route:
150 ms decisions without tucking model the steady attempt; 50 ms decisions
with tucking on straights model practice. These are keyboard proxies, not a
child's play-test. Finish times include the existing five-second missed-gate
penalties. Scored clocks begin at the start line, not at step-out.

The first capture had a stale HUD after stopping the App loop. It is excluded
from the verdict. The corrected recipe keeps the UI drawing while advancing
keyboard inputs. No frame timing or voice recording ran.

## Findings

| Run | Steady / practice outcome | Bronze / silver / gold target | Tumbles | Finding |
| --- | --- | --- | --- | --- |
| Slalom | Both finished; 213.51 s / 111.19 s. Raw 28.51 / 21.19 s; 37 / 18 misses; no medal | 28.69 / 26.26 / 24.31 s | 0 / 0 | Pole colours and pairs are visible. Keeping the skis between 2 m poles, alternating every 8.2 m, is the problem. Even the practised script fails badly. |
| Giant slalom | Both finished; 64.51 s / 48.90 s. Raw 59.51 / 48.90 s; 1 / 0 misses; none / gold | 62.01 / 56.76 / 52.55 s | 0 / 0 | Wider panels explain the line better. Steady misses bronze by 2.49 s; practised gold has 3.65 s spare. |
| Moguls | Both weaving attempts reached pickup without a scored finish. A supplemental straight attempt finished in 12.35 s, scoring 25 points | 50 / 65 / 80 points; no medal time | 0 / 0 weaving; 1 straight | The weave wanders to the boundary during jumps. The straight attempt is 25 / 40 / 55 points short of the medals. This proves proxy limitations, not that a child cannot finish. |
| Aerials | All crossed finish: steady 0 points; straight tuck 58.2 (bronze); whole spin 83.2 (gold); half spin 52.7 (bronze) | 50 / 65 / 80 points; no medal time | 0, except 1 on the half spin | Tuck produces a safe 2.00 s jump, 4.40 m high. A whole spin earns gold. The loading tips explain judging but do not tell a beginner to tuck on the inrun. |
| Powder | Reached pickup; all three stashes found; 300 credits; no timed result | None | 0 | Bright fresh patches, stash counter and yeti rocks give reasons to explore. No clock or medal pressure. |

Timed margins (positive means too slow): slalom steady +184.82 / +187.25 /
+189.20 s against bronze / silver / gold; practice +82.50 / +84.94 / +86.88 s.
Giant slalom steady +2.49 / +7.75 / +11.95 s; practice -13.11 / -7.86 /
-3.65 s. Aerials straight tuck is 8.2 points above bronze, 6.8 below silver,
21.8 below gold. Powder's travel time is exploration, never a medal clock.

The whole-spin aerial is 33.2 / 18.2 / 3.2 points above bronze / silver /
gold. Its finish comes 11.82 s after step-out, the same as the straight tuck;
the half-spin finish comes at 12.62 s. These are travel times, not medal targets.

## What a tumble costs

The straight moguls attempt and the half-spin aerial each tumbled once.
The rule disables inputs for 3 s while the skier keeps sliding; this is not
a three-second freeze or an added time penalty. Both traces show 3.02 s
between the event's before-step timestamp and the first untumbled snapshot
(1/120 s steps). The aerial half spin adds only 0.80 s to the finish compared
with the same tucked jump without rotation. Landing scores zero, but the
remaining air/form still earn bronze. Recovery is forgiving in this example;
judged points are the bigger cost. Moguls' held S brake carried into the
second jump and made a partial backflip: the same key's air role is a learning
hazard worth showing Kyle, not a rule changed in this lane.

## Group, thin air and pickup

The full group (guide plus four guests, 475 kg) was taken on an offered day
and flown to the summit pad. Finished slalom, GS and aerials attempts stop at
their result and then use fetch. The original weaving moguls attempts and powder
reached natural pickup; the weaving attempts had no scored result. The
supplemental straight moguls attempt stopped after its result and used fetch.
The scripted group route needed an automatic fuel
truck during its slow terrain-clearance climb; this is not a clean fuel-budget
or child-piloting trial. At 3,692.36 m, sinking under a full upward command, the actual
session emitted `ski.radio.thin-air`. The input was a full upward command;
actual collective was 73.1%, so this does not prove a physical lift ceiling.
It landed the group at 3,585.7 m.

**The on-screen advice is missing.** `heli-session.js` emits `ski.radio.*`,
but `HELI_RADIO_LINES` has no ski entries. `heli-ui.js` only displays entries
in that table. The screen retained the older fuel-truck radio line. The
packet's instruction to burn fuel or leave some behind therefore never reaches
the player. Claude needs a text-only wiring fix; no recording is needed.

Pickup is alpine at course s 7,320 m, lateral 30 m. Helicopter ground is
387.106 m, sampled course snow 387.122 m: a 0.016 m difference. The pad is
on snow at about 3,233 m altitude. HELI_SKIING section 3's old pickup height
and thrust row still describe the former site; the ski runs deliberately keep
their independent authored finish heights.

## Tuning decision

No runtime numbers changed. Before and after: guide pace 92%; silver +8%;
bronze +18%; slalom 8.2 m between gate rows, 2 m width, centres +/-1.1 m;
giant slalom 26 m between rows, 8 m width, centres +/-6 m. Judged thresholds
remain bronze 50, silver 65, gold 80.

Changing time margins cannot repair 18 to 37 slalom misses or a missing moguls
finish. Widening slalom until both alternating gates share a straight corridor
would erase the intended turn challenge. Do not tune to one route-aware bot.
A possible later GS-only bronze target is 65.69 s (+25% instead of +18%),
which would cover this steady attempt by 1.18 s; it is a proposal for Claude,
not an implemented or validated change. Slalom and moguls need the finishing
play-test before a credible global medal adjustment.

## Checks and evidence

Browser corrected pass: private port 34710; detail pass 36945; jump picture
8912. All three have no errors or warnings. A harness pass means the
recipe ran; it does not mean every run earned a medal or that play acceptance
passed. No changed assertions. No ordinary-race simulation files changed.

Sheet: `docs/board/looks/ski-finish/look-1.jpg`, 205,093 bytes, four genuine
in-game captures, resized and labelled only. This is evidence assembly, not
another art round. Rebuild with `python tools/art/ski-finish-sheet.py` after
the browser recipes. `DUEL_SKI_FINISH_PHOTO=1` selects only the side-view
aerial at more than 3 m above the snow. No frame timing.

Independent evidence review cleared keyboard/storage fidelity, medal arithmetic
and the absent radio-text finding. Its collective wording correction and
natural-pickup clarification are included. No review findings remain.

Card checks passed on source `9e950dde`: four suites, zero failures or not
run, jobs 4, 172.41 s. Ski physics/scoring/guide: 112 checks; zones: 223;
helicopter lifecycle: 15; view/input: 5. The lifecycle suite includes the
group's flight home and payment once; that is pure simulation evidence,
separate from this slice's browser drop/thin-air evidence.

Lane tier passed 22/22, zero failures or not run, jobs 4, 385.08 s, using
`node tools/run-tests.mjs --tier lane --changed --jobs 4`. Replay guard:
225 checks across 25 cases, 23 events and nine categories, unchanged; combat
replays: 12 checks across four encounters; complete scenes: 47 checks across
20 events, unchanged. No fingerprint or signature was regenerated.
`npm run build` passed in 1.32 s (541 modules); existing large-chunk and mixed
static/dynamic import warnings remain. Both commands ran in PowerShell with
System32 first on PATH and a fresh under-three-job admission before each.
One-minute recounts ran for active long jobs. Two early browser recounts found
a later fourth foreign job, so we started no extra work and left the newer
owner's process alone. No own job was the latest fourth. Later recounts were
at or below three.

The validated code/recipes are source `9e950dde`; subsequent changes are this
results note and the generated STATUS snapshot only. Cockpit sync completed
through its protected runner: zero task changes. No full tier, release or frame pass is
claimed. Integration advanced only documentation and board files through
`f1d0daf4`; there is no runtime-code divergence. This branch was not merged
or pushed.

Reproduce: `node tools/browser-harness.mjs scenario ski-finish --output-dir
.evidence/2026-10-26/SKI-FINISH/keyboard-corrected`. The optional
`DUEL_SKI_FINISH_DETAIL=1` pass captures tucked/spun/tumbled aerials and visits
the yeti more closely. Use PowerShell, System32 first on PATH, and FACTORY 8
admission before each heavy job.

## Removed

No runtime asset, rule or test was replaced. Superseded captures, raw review
output, gate logs and generated `.qa-dist`/`dist` builds were recycled after
the compact sheet and measured verdict were recorded. The keyboard and sheet
recipes remain in tools. No unrelated files or lane folders were removed.

## Open for Claude

Text-only ski radio wiring; the slalom keyboard difficulty verdict; a human
moguls finish and judged medal check; a tuck instruction for aerials; final
look/go-live decision. Group return-home payment was not exercised by this
slice. The feature stays dev.

## Claude tuning follow-up (26 October 2026)

Design before code: follow the card's five written decisions. Keep slalom's
450 m snow and finish: 38 gates fit at z 30..437 in 11 m steps (50 would put
12 gates beyond the finish). Width is 3.5 m, centres alternate +/-1.5 m.
Measure steady/practised times before setting this run's own medal targets.
GS changes only bronze to +25%; guide and silver/gold stay as authored.
First widen moguls' playable bounds and start/finish opening by 50%, then
repeat the unchanged keyboard proxy to distinguish lane width from steering.
Moguls alone uses 30/50/70 points; aerials remains 50/65/80. Tuck advice names
Shift, the actual tuck key (Down/S is braking). Thin-air advice is text only;
no voice assets, cue requests or physical lift changes.

Checks: existing ski physics, runs, heli and view suites; same steady/practice
and detail browser recipes, memory-only, including snowy pickup and thin-air
text; lane tier jobs 4 and build. No frame timing. Claude keeps final look,
assertion review and go-live decisions; heli-skiing remains dev.

### Measured result and slalom hold

The unchanged pure-session keyboard replay reproduced every earlier slalom/GS
number exactly before edits. After the requested layout, the same App browser
recipe gives slalom steady 110.51 s (25.51 raw, 17 misses), versus 213.51 s
(28.51 raw, 37 misses). Practice reaches pickup without a scored finish (it
crosses outside the finish opening), versus 111.19 s and 18 misses before.
The requested <=3 steady misses is NOT met. There is no clean steady/practised
pair from which to set honest new slalom medal times. Leave its guide-derived
margins unchanged pending Claude's decision. Its guide changes naturally with
the new gate line: targets are 28.88 / 26.43 / 24.47 s (bronze/silver/gold).

The 3.5 m openings at +/-1.5 m overlap by 0.5 m. The existing straight-line
zone test now passes all gates; the centre-following proxy still oversteers.
This is a material design result, not proof that the keyboard is impossible.
Do not tune more values or quietly change the proxy to claim acceptance.
Claude should choose whether to keep that straight corridor and use a
beginner straight-line comparison, or require alternating turns and approve
a further layout change. Keep the card open and the feature dev.

GS has identical times/inputs: steady 64.51 s (one miss) now bronze, practice
48.90 s (zero misses) still gold. Bronze 62.01 -> 65.69 s; silver 56.76 and
gold 52.55 s unchanged. Moguls' original narrow bounds clipped lateral flight
momentum at +/-30 m; the original 12 m finish was missed at x=8.50 / 25.27 m.
With 90 m bounds and 18 m start/finish openings, neither replay hits a wall;
both cross at x=0.39 / 0.21 m. Steady 78.0 points is gold; practice 37.6 is
bronze under 30/50/70. Max |x| is 41.26 / 35.01 m. No physics or steering
rule changed: free lateral flight is expected, and the lane fix suffices.

Aerials remains 0 steady / 58.2 tucked (bronze); its thresholds and physics
are unchanged. The loading card and inrun now name Shift explicitly, since
Down/S brakes and cannot be taught as tuck. Thin-air emits the same event,
and the actual group summit screen now contains: "There is less air up here
for the rotor to push. Lighten up: burn fuel or leave some behind." No voice
cue is added; ski text is separate from the recorded radio catalog. Powder
still finds all three stashes without a timed result. Snowy pickup and group
flight retain the earlier recipe's limits (including the automatic truck).

### Assertion changes for Claude's review

- `test-ski-runs`: slalom count 50 -> 38 and spacing 8..9 -> exactly 11 m,
  to fit the specified spacing inside the unchanged 450 m run. Add exact
  3.5 m width and +/-1.5 m centre checks; retain start/gates/finish order,
  guide clean-pass, drop, repeatability and all GS geometry assertions.
- The straight-line slalom test expects zero missed gates, rather than every
  gate missed, because Claude's new openings overlap. GS still misses all.
  This is a changed design claim, requiring Claude's written review; it does
  not pretend the old alternating-turn property survives.
- GS displayed bronze ratio 1.18 -> 1.25; silver/gold ratios stay exact.
  The default `timedMedal` unit checks remain untouched (generic +18%).
- Moguls displayed targets become bronze 30, silver 50, gold 70 rather than
  the shared 50/65/80. Add scoring checks for none/bronze/silver/gold using actual turn, air and speed parts.
- `test-ski-view`: moguls' displayed gold 80 -> 70; add tuck advice checks
  on the loading card and before z40, and absence at the ramp.
- Browser recipe: require the real thin-air event and visible text together;
  add start-screen evidence and moguls result photos. Keyboard controls,
  reaction intervals and scoring are untouched. No existing tolerance,
  replay fingerprint or world signature is loosened or regenerated.

Independent code/numbers and changed-assertion review remains with Claude
before integration. This lane does not merge or release.

### Follow-up verification and pictures

Default browser pass: private port 43264, five pictures, zero warnings/errors.
Detail pass: private port 34895, six pictures, zero warnings/errors; its
start-screen text contains the new Shift advice on every aerials attempt.
Straight moguls still finishes at 25 points with one tumble (5 below new
bronze). Aerials tuck/spin/half-spin remains 58.2/83.2/52.7 points; medals
bronze/gold/bronze, unchanged. No keyboard-driver or reaction-interval change.

The first four-suite check caught a real API compatibility fault: adding an
optional second argument to `judgedMedal` consumed Array.map's index. Fixed
by retaining the original one-argument public function and using an internal
threshold helper for configured runs. The unchanged 112 physics assertions
then passed. Three other suites passed on that first check: helicopter 15,
view 5, zones 228. A new score-test draft also caught floating-point
construction of exact boundary inputs; the final tests use actual score
parts for none/bronze/silver/gold, with no tolerance or old assertion changed.
Final lane evidence below covers the corrected source and all four suites.

One detail browser startup failed before capture: Vite could not clear its
output while an open test log lived in .qa-dist. Moved the log into .evidence,
then the one retry passed. No game/test tolerance was changed for this tool
problem. Shared capacity was counted before every heavy run and at the
one-minute checks; no over-cap own run or frame measurement occurred.

Updated `docs/board/looks/ski-finish/look-1.jpg`: 286,478 bytes, six actual
in-game captures, resized/labelled only. Viewed the assembled sheet: it shows
slalom poles, the aerials jump, powder/yeti, snow at pickup, the visible
thin-air radio line and the moguls result. It replaces the earlier four-view
sheet. Recipe: `python tools/art/ski-finish-sheet.py` after default output
`tuned-keyboard` and DETAIL=1 output `tuned-detail`. This is evidence assembly,
not an art round or Claude's look verdict.

Cockpit sync through the protected runner: zero tasks changed. Integration
advanced independently with LAB-WALK after this lane started; no shared
runtime changes were pulled into this frozen ski candidate. No merge or push.

Final lane gate on frozen gameplay/test source `37fff5a9`: 58/58 passed,
zero failed or not run, jobs 4, 457.17 s. Command:
`node tools/run-tests.mjs --tier lane --changed --jobs 4`. Includes ski
physics 112 checks, zones 228 checks, heli lifecycle 15 tests, view 5 tests;
replay guard 225 checks / 25 cases / 23 events / nine categories, combat
replays 12 checks / four encounters, complete scenes 47 checks / 20 events.
Fingerprints and signatures are unchanged. `npm run build` then passed in
1.76 s; existing large-chunk and mixed static/dynamic import warnings remain.
Both ran in PowerShell with System32 first on PATH and fresh under-three-job
admission. Later changes are only this note, the status snapshot, the six-view
sheet and its assembly recipe (no test reads that recipe). No full, frame,
release or child play-test pass is claimed.

### Removed in this follow-up

Replaced the earlier four-view sheet with the current six-view sheet and its
recipe. Removed the old slalom 8.2 m/2 m layout, GS +18% bronze rule and
shared moguls medal thresholds from the zone's active rules. Raw captures,
reports, gate logs and generated QA/production builds from this session were
recycled after their measured findings and the compact sheet were recorded.
No player save, runtime asset, unrelated file or lane was removed.

## Second slalom pass (Claude, 26 October 2026)

Merged integration first; only conflict was this card's document text, resolved
by retaining both the measurements and Claude's new answer. No code conflict.
STATUS stayed ours. Design before code: 33 gates fit z30..446 at 13 m spacing
inside the same 450 m run. Openings 5 m, centres +/-1.2 m. Glow belongs only
to the next pair of poles and changes no simulation state. Retain the same
150/50 ms keyboard driver and guide pace 92%.

The practised baseline crosses z450 at x8.74 m with 8 misses, outside the
12 m finish's +/-6 m posts, then reaches pickup without a result. The clock
never finishes because the physical finish opening was missed. Widen only
slalom's finish to 20 m (+/-10 m), visible in the arch, so that recovery line
counts. Keep course length, physics, gate penalties and other runs unchanged.
Measure first; if steady still misses >3, stop further tuning per Claude.
Otherwise use bronze 10% over measured steady penalised time, gold just under
practice, silver between them. Add run-specific time limits; guide remains
the ghost's pace. Checks: same keyboard browser recipe, existing ski suites,
lane tier jobs4 and build. No frames; feature remains dev.

Pure-session comparison (same stock skis, no wax, same discrete keyboard
mapping and 150/50 ms driver; no route/controller changes):

| Attempt | First layout | Second layout | Misses before -> after | Finish crossing x before -> after |
| --- | --- | --- | --- | --- |
| Steady 150 ms | 110.51 s (25.51 raw), no medal | 69.46 s (24.46 raw), no medal | 17 -> 9 | 1.72 -> -0.69 m |
| Practised 50 ms | No result; 22.86 s clock at z450 | 30.59 s (20.59 raw), no medal | 8 at z450 -> 2 | 8.74 -> -0.73 m |

Steady still misses nine, so Claude's explicit >3 stop condition applies.
Do not set more permissive medals from that failed acceptance. The slalom
keeps its guide-derived limits pending a control/design decision; these move
naturally when the guide follows the new gate line. Both attempts now have
valid scored finishes. The new practised line is already inside the former
opening; widening the finish specifically protects the demonstrated old
recovery line, rather than claiming that width caused the new line's success.
Glow helps a person see the next gate; this unchanged proxy reads the route,
so it does not react to the glow. No claim of a child's play-test is made.

Changed assertions in this pass: slalom gate count 38 -> 33; exact row spacing
11 -> 13 m; exact width/centre 3.5 m/+/-1.5 -> 5 m/+/-1.2. These are Claude's
new layout, with unchanged 450 m length/drop and retained clean-guide checks.
Add finish regression at x8.74 (accepted), x10.1 (outside), retaining all
missed-gate penalties. Add view checks for two emissive next poles, movement
to the next gate, clearing at finish and an unchanged simulation fingerprint.
No other old assertion, tolerance, penalty, replay or signature is changed.
The browser recipe only adds slalom result pictures; its driver is unchanged.

Removed: replaced the first layout and 12 m slalom finish with the second
layout and visible 20 m finish. No old physics, asset or test path is retained
as a workaround. Final captures/checks are recorded below.

Browser confirmation on private port 38933: all five runs, drop/group,
thin-air text and snowy pickup completed the same memory-only headless
recipe; nine pictures, zero warnings/errors. Slalom matches the pure table
exactly. Existing guide-derived bronze/silver/gold now read
27.9181 / 25.5522 / 23.6594 s; no calibration is claimed. The new line is
quicker for the guide, which explains those displayed limits. GS, moguls,
aerials and powder reproduce the previous results.

The updated eight-view sheet is 379,219 bytes and was visually inspected.
It replaces the previous six-view sheet; it includes both slalom results,
the course view, moguls, aerials, powder/yeti, snowy pickup and thin-air text.
Reproduce with the default recipe output `second-layout`, followed by
`python tools/art/ski-finish-sheet.py`. No retouching, art round or frame
measurement. Code/number and changed-assertion review stays with Claude.

Final checks on gameplay/test source `7171815c`: lane 59/59 passed, zero
failed/not run, jobs4, 300.80 s, using the requested
`node tools/run-tests.mjs --tier lane --changed --jobs 4`. It includes physics
112, zones 231, heli 15 and view 5; replay guard 225 checks/25 cases/23
events/nine categories, combat replay guard 12 checks/four encounters, world
composition 47 checks/20 events. `npm run build` then passed in 799 ms with
the existing mixed-import and large-chunk warnings. PowerShell, System32
first on PATH; fresh under-three admission before each heavy run and the
one-minute recounts stayed within the cap. No frame or full-tier run.

This pass did not regenerate any signature or fingerprint. Integration
brought its already-reviewed Summit ground/scene baseline changes through
the requested conflict-free code merge. Subsequent edits are only evidence
notes, the STATUS snapshot, picture sheet and its assembly recipe, which no
test reads. Independent code/numbers, changed-assertion and final look review
remain with Claude. No merge out of this lane, push, real save or live access.

Cockpit sync: zero task changes; it flagged unrelated new card
QA-SUMMIT-GLACIER-EDGE as lacking a Cockpit task. Leave that task mapping to
the Director. Session raw captures, reports, gate/build logs and generated
QA/production builds were recycled after the verdict and sheet were saved.
Only current recipe, source, notes and compact picture sheet remain.

## Casual line assist (Claude, 26 October 2026)

Merged integration first: only STATUS and card text conflicted. Kept ours
for STATUS and retained both card entries. No code conflict, including the
automatically merged helicopter UI. Design before code: Casual only, slalom
only, on snow without a tumble, while the next gate is ahead.
Ease heading toward its gap, capped at one third of the full carve rate
available in the current stance. Fade linearly with opposing player turn;
full opposite input disables it. Never change speed, edge inputs, snow,
layout, guide pace, penalties or airborne rotations. Pro remains unassisted.

Thread selected game difficulty through App -> helicopter session -> ski
run, menu limits and restart. It is independent of helicopter assisted/real
flight mode. Legacy pure callers default Pro so only explicit Casual opts in.
Measure unchanged 150/50 ms keyboard runs for Casual and Pro; preserve the
second layout and next-pole glow. Medal calculation awaits measured times;
Pro bronze's baseline was not stated in Claude's three-attempt recipe, so
that small choice has been put to Kyle while implementation proceeds.

Checks: bounded/fading/off-air/off-tumble assist, unchanged Pro baseline and
repeatability; correct menu/restart difficulty and matching result limits;
same memory-only browser recipe; existing ski suites in lane jobs4, build.
No frame timing. No save shape, key, runtime dependency or asset change.

The release hold interrupted this draft before its gates. On resume, merged
the newly released integration first, without any conflict. No draft changes
were lost. Limit the new assist and medal calibration to the slalom named in
Claude's answer; GS and the judged/free runs retain their prior rules.
The assist reaches its one-third cap at a 3-degree heading error and eases
linearly below that. Initial 25-degree and 5-degree response drafts left
9 and 4 steady misses; neither was accepted or gated. The cap, opposite-input
fade and all other physics stayed fixed. Final Casual steady/practice are
34.4333 s (24.4333 raw, 2 misses) / 19.7417 s (0 misses); Pro practice
30.5917 s (20.5917 raw, 2 misses), exactly its prior unassisted result.

Medal design settled: Casual bronze = steady penalised time *1.10; gold =
practice *0.99; silver midpoint. For Pro, the card requests only practice,
so use that measured Pro practice as its bronze baseline (*1.10), with gold
*0.99 and silver midpoint. This optional choice was put to Kyle before the
release interruption; no answer arrived, so continue with the stated
recommended choice. Round targets to hundredths. Casual bronze/silver/gold:
37.88 / 28.71 / 19.54 s; Pro: 33.65 / 31.97 / 30.29 s. Medal limits affect
only the slalom; other run targets and all save keys/record shapes remain as
before. Existing career bests/medals stay shared; no progress is wiped or
hidden. The loading card names the difficulty and whether assist is on.

Changed assertions in this assist pass: replace only the slalom's former
"gold=guide, silver=+8%, bronze=+18%" zone assertion with the measured
Pro target table and a new Casual table. Retain the GS guide/+8%/+25%
assertion, all layout/guide clean-pass checks and default `timedMedal` unit
assertions. New behavioural tests cover cap and fade, no air/tumble/Pro or
other-run assist, no forced speed or edge, deterministic keyboard runs,
Casual <=3 misses/bronze, clean practice/silver and unchanged two-miss Pro
practice/silver. View tests add difficulty labels, App-to-session difficulty,
menu/run limit agreement and restart retention. No old tolerance or replay
fingerprint is relaxed. New browser checks verify difficulty immediately at
step-out, retain the check while a run exists, and use the normal game
settings API. The first draft wrongly checked for a live run after powder
had naturally ended; it failed there despite correct slalom measurements.
Corrected the lifecycle location and reran; do not count that first packet
as a browser pass. No keyboard controller or interval changed.

Removed: slalom guide-based medal selection is replaced by per-difficulty
limits. No alternate physics path, old layout, save migration, asset or new
runtime dependency was added. Shared best/medal records and pay remain on
the existing save path; only the current run's criteria change.
