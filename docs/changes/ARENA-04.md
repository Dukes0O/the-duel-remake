---
task: ARENA-04
status: building
kind: feature
flag: bounty-hunt
player_facing: yes
---
# Bounty Hunt: native wiring, awaiting brains and review

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
event state. A genuine UI/contact/pay browser journey is authored but unrun.

## Settled answers and ownership

Tests preceded Source at f4afad3; the free module began at f12be4f with pending
recovery/overtime fixes at 7da183d and the reviewed native tie fixture at 0f80b31.
Salt merged at 08c28c5. The exact Director hooks were granted at 8ace154 and
merged normally into this lane before shared Source edits.
Claude's 2 October handover answers are retained: self-wreck earns no bonus,
the marked victim cannot be its own fallback leader, and a wrecking recipient
falls back to nearest running car with seeded distance ties.

Claude owns arena-brains.js and the other six reserved warlord/contact files.
The integration inbox asks for the bountyHunt.markedId / bountyPoints seam:
unmarked CPUs hunt the mark, marked CPU runs with kiter behavior, and a marked
player retains one/two/three hunters on Easy/Medium/Hard. No alternate brain,
mode override, warlord Source or audio/tuning file was edited here.

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

No broad Bounty replay/FPS matrix, lane gate, build, browser, frame capture or
audio capture was run during the Director's serialized integration full tier.
No merge-ready, browser fidelity, frame cost, save review or audio verdict is
claimed. Replay literal pins and existing acceptance assertions are unchanged.

## Behavior and test changes

The existing feature catalog assertion adds bounty-hunt: dev and increases the
exact count from ten to eleven. All old state assertions remain. This additive
consumer change is within the Director's grant. The static Preview flag list
adds Bounty; no launcher execution or Preview interaction occurred.
Native Bounty behavior is new. Ordinary race, Last Car Rolling and Sal replay
fixtures stay exact and await their full matrix run in the assigned gate slot.

## Sound and remaining work

New handover event bountyMark reserves cue bounty-mark; initial mark uses
arenaLoaded. Existing arenaWreck/arenaPhase/result cues remain in place.
The audio owner must connect/review bounty-mark; it remains unsounded here.
Brain Source from Claude, independent source/save review, full Bounty matrix,
lane/build gates, actual High/Performance browser views, gameplay/frame checks
and sound verdict remain before this card can be complete or merged.

## Removed

Removed the superseded tests-only note after keeping its useful rule and test
facts here. No old asset or runtime path is replaced; no assertion or replay pin
was weakened. The dev switch remains until its later approved release cleanup.
