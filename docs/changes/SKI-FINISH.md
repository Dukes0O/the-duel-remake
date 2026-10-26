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
