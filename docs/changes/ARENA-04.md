# ARENA-04: Bounty Hunt acceptance tests

## State and settled answers

Independent tests preceded Source (f4afad3). The free mode module now exists
(f12be4f), with pending recovery/overtime fixes at 7da183d. Shared admission,
settlement and HUD hooks await Salt; the marked-car brain seam belongs to Claude.
Only this test suite and note change here. All saves use a private memory Map.

Claude's 2 October 00:30 answers are recorded in the current board and
SCRAPDOME section 10: Easy/Medium keep one/two hunters on a marked player;
Hard permits all three. A marked CPU is hunted by every other CPU. A self-wreck
recipient earns no twenty-point bonus. A wrecking hitter or leader falls back
to the nearest running car, with seeded distance ties; the marked car cannot
be its own fallback leader. This card also enables Bounty on the Salt Flats.

## Tests first: added native cases

- A self-wreck gives its other score leader the mark without changing scores,
  even when the marked victim has the highest score.
- A genuine last hitter that is wrecking falls back to the nearest running car.
- A wrecking score leader falls back to the nearest runner, not another leader.
- Equal-distance running recipients use the event's seeded order repeatably.
- A genuinely credited player mark respects Easy/Medium caps and all three on
  Hard, through real fixed steps and participant targets.
- Real Duel and discovered rank-nine App entry admit Salt Bounty, with actual
  course/event identity and initialized mark; App's native finish pays once.

These cases begin at real native/public entry. They never install fabricated
Bounty state or invoke the free module to bypass missing admission. Existing
module-only recovery tests remain explicitly labelled product regressions.

## Existing coverage

Clock, seeded starts, integer passive scoring, pause, credited/unmarked wrecks,
last-hit credit, CPU hunt/escape/rear Oil, shared overtime, HUD pure reads,
rank/dev/discovery gates, atomic scrap/hold, failed saves and actual App FPS
repeatability remain. Reviewed roads, Last Car Rolling and Sal replay fixtures,
samplers and literal pins stay exact for the Bounty switch off/on.

## Verification

node --check tools/test-arena-bounty-hunt.mjs passed.
node tools/test-arena-bounty-hunt.mjs --admission-only reached 38 assertions:
32 passed, six failed; twelve cases, six pass and six RED (232.9759 ms reported
by Node). Exact failure messages:
- Bounty Hunt must have its own dev switch under SPEC 0.12.
- startArenaEvent must accept Bounty rather than rejecting an unregistered mode.
- native Salt Flats admission must accept the real Bounty mode.
- rank-nine public App entry must admit Salt Flats Bounty.
- rank nine unlocks actual Bounty App entry.
- rank-nine yard must expose a real Bounty mode choice.

Nine native cases were added (seven mechanics and two Salt cases). The new named
mechanics cases remain blocked at missing native entry. Settlement, FPS and
replay matrix remain unrun here. No broad gate, build, browser, capture or frame
verdict is claimed. Shared admission is missing at this lane's 7da183d base.
The seeded tie fixture uses a positive minimal Duel step after actual scenery
damage to retain exactly tied stationary slots; independent review still assesses
that fixture. Ordinary hunting and handover tests use the 1/120 native step.

## Presentation and sound boundaries

Beacon, projected arrow, High/Performance browser views and frame measurements
remain unrun. Existing markup checks cover names, points and pure reads only.
Rear Oil tests cover weapon deployment, not audible mix. New Bounty cue names
and audio review remain pending; protected audio and warlord files are untouched.

Independent review repaired the tie fixture: seed 1990 distinguishes seeded order from
participant order, and clear lateral slots remain exactly tied through native credit.
No expected product outcome or original assertion changed.

## Removed

Removed stale claims that Source had not started and that rules were unresolved.
No existing assertion or replay pin is changed, and no Source file is edited.
