---
task: ARENA-04
status: ready-to-merge
kind: feature
flag: bounty-hunt
player_facing: yes
---
# Bounty Hunt: native wiring and settled CPU routing

## What changed

Bounty is registered behind its dev switch, with discovered rank-nine App and
yard admission in both the Scrapdome and Salt Flats. Native fixed steps own
points, five-second wreck credit, seeded mark handovers, recovery and overtime.
Regulation ends at three minutes; tied points open next-wreck overtime for
thirty seconds, followed by damage dealt if nobody earns a wreck.

The existing atomic Fuel save path also banks Bounty scrap and hold. It keeps
the durable owner checks, one-write receipt, failed-save retry and unknown
progress. Salt's venue allowlist and existing pay remain unchanged.
The scoreboard and results show points. An amber roof beacon follows the real
rendered marked car; its owned geometry and materials are disposed. The HUD
arrow uses existing projection and direction fallback. Presentation only reads
event state. Actual private UI/contact/pay journeys pass in both qualities.

## Settled answers and ownership

Tests preceded Source at f4afad3; the free module began at f12be4f with pending
recovery/overtime fixes at 7da183d and the reviewed native tie fixture at 0f80b31.
Salt merged at 08c28c5. The exact Director hooks were granted at 8ace154 and
merged normally into this lane before shared Source edits.
Claude's 2 October handover answers are retained: self-wreck earns no bonus,
the marked victim cannot be its own fallback leader, and a wrecking recipient
falls back to nearest running car with seeded distance ties.

Claude's 14:00 answer released only the Bounty routing seam in arena-brains.js.
Unmarked computers now hunt the marked car; a marked computer faces its nearest
pursuer and keeps a 45 m gap; a marked player keeps the existing one/two/three
Easy/Medium/Hard hunter counts. The rear Oil path still uses normal target aim.
The change stays inside generic target selection and goal planning, under the
Bounty mode check. No warlord-specific rule or other mode changed.

## Evidence: bounded checks only

- Admission-only: 12/12 native/public cases, 57 assertions pass, including
  rank-nine Salt entry and actual once-only pay; Node duration 493.0964 ms.
- Selected mechanical/save/HUD subset: 15/15 cases, 169 assertions pass,
  including handover, exact distance tie, overtime and failed storage;
  Node duration 766.4036 ms.
- Passive scoring and regulation subset: 2/2 cases, 17 assertions pass,
  including pause and whole seconds; Node duration 448.6595 ms.
- Brain/rear-Oil subset: 1/5 cases, 40 assertions reached. Rear Oil deployment
  passes. Four genuine REDs remain at Claude's native seam: player hunter
  counts are 0 versus 1/2/3, and an unmarked CPU targets cpu-2 instead of the
  actual marked cpu-3; Node duration 320.0535 ms.
- Feature switch suite: 32 checks pass. Syntax checks for beacon, renderer and
  browser scenario pass. git diff --check passes.

After resolving the integration conflicts and adding the approved CPU routing,
the complete native suite passes **40/40 cases** with no skips (716 acceptance
checks). The assertions prove capped player hunting, pursuit of a marked CPU,
kiting, rear Oil and mark-cue routing.
Actual Bounty inputs match at 30, 60 and 144 FPS; roads, Last Car Rolling and
Sal still match every existing literal control pin with Bounty disabled and
enabled.

After syncing with integration commit 041ebca, the lane gate passed **340/340**
in **586.66 seconds**. The build passed in **425 ms**; Vite reported its existing
large-chunk advisory. The current-base private browser run passed all four
journeys in High and Performance on Scrapdome and Salt Flats, with memory-only
saves, twelve screenshots, zero warnings and zero errors. It ran on private
port 29695. The marked car stays offscreen in those race views, so they do not
judge the roof beacon's appearance. Kyle should review the visible beacon, the
handover cue and frame cost in Preview before release.

## Behavior and test changes

The existing feature catalog assertion adds bounty-hunt: dev and increases the
exact count from ten to eleven. All old state assertions remain. This additive
consumer change is within the Director's grant. The static Preview flag list
adds Bounty; no launcher execution or Preview interaction occurred.
The integration update adds `marked` to the shared arena-marker view model. Its
existing exact HUD test now expects `marked: false` for an unmarked car; the
heading, style, hunting and protection checks stay exact.
The full gate also found that the exact beta feature catalog test omitted the
new `bounty-hunt: dev` entry. The test now includes that one switch; all existing
switch values and production-on/off checks remain unchanged.
The native Bounty suite now also checks that initial entry and later handovers
play the bounded procedural mark cue, and that the cue is silent when Bounty is
off. The cue adds no recording or runtime asset.
The Arsenal audio integrity test keeps its exact baseline hash for every other
sound-bank entry and export. Its exclusion list names the six ARS-01 cues and
the one added Bounty cue. The separate Bounty assertion verifies that cue's
flag, layer count and event routing. The wave-one audio regression also excludes
only the new Bounty cue from its pre-Bounty bank hash; its recorded Arsenal
cues remain in their own native audio checks.
Native Bounty behavior is new. Ordinary race, Last Car Rolling and Sal replay
fixtures stay exact in the complete native suite.

## Sound and remaining work

ARS-01 has released the shared audio hook. This card adds only the procedural
`arena.bounty-mark` recipe and connects it to the initial `arenaLoaded` event
and later `bountyMark` transfers, behind the Bounty switch. No recording or
runtime asset is added. Existing arenaWreck/arenaPhase/result cues remain in
place. Save Guardian review is clear. Guardian native retry, seven historical
fixtures, damaged data, backups and both budgets pass. A fake
DOM setter-count concern was withdrawn after real Chrome showed no unchanged
arrow attribute mutations. A Kyle Preview check, final lane/build gates,
visible-beacon look, frame cost and human sound verdict remain before merge.

## Removed

Removed the superseded tests-only note after keeping its useful rule and test
facts here. No old asset or runtime path is replaced; no assertion or replay pin
was weakened. The dev switch remains until its later approved release cleanup.
