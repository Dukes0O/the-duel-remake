# GO-LIVE-EVENING

## Current decision before code

Claude's 26 October review supersedes the first pass: release driving-lessons,
heli-logbook, heli-skiing and rescue. Keep tyre-slip dev. App and Duel admit
lessons on driving-lessons alone; the lesson's own sliding-rule latch and its
scratch instructor stay unchanged. Ordinary races retain their existing rules.
Heli-skins stays dev; logbook rank paint already works independently.

Merged integration/wasteland at 6ea7ace7 before this follow-up. Only STATUS.md
conflicted; kept this lane's copy as Kyle requested. No code conflicts.

## Checks

Add a native App/Duel regression for lesson admission with tyre-slip explicitly
off, sliding rules within Casual and Pro lessons, and no sliding rules in an
ordinary Pro race before and after the lesson. Check disabled lesson admission
separately. Run the lane tier, build, affected full-tier suites and replay guard,
with four workers or fewer, inbox holds and shared job admission. No frame timing.
Lane tier: 45 passed, zero failed or not run, jobs 4, 215.61 s. This includes
the new native admission/isolation regression and the helipad positive case
with tyre-slip off. Replay guard: 225 checks across 25 cases, 23 events,
three FPS values and three runs; unchanged fingerprints. World composition:
47 unchanged-scene checks. Production build passed (577 modules), with the
existing mixed-import and chunk-size warnings.

The change picker selected two extra full-tier-only suites: convoy-tanker-art
and first-person-polish. Both passed, alongside the restored drift-trial and
engine-curve suites: four passed, zero failed or not run, jobs 4, 44.34 s.
The restored engine fingerprint stays exact; drift-trial passed its original
152 checks and the existing explicit Pro recovery matrix. No frame timing.
Independent read-only review: clear, including all changed assertions.
Session-end status and Cockpit board sync completed. Cockpit's local build
succeeded; its pre-existing Google inbox/calendar feeds still need interactive
re-consent. No merge or push performed.

Previous pass: lane 35/35 and build passed. Full on 5e747f71 ran all 526 suites:
522 passed and four old default-dependent fixtures failed. Their targeted repairs
passed. The retained full-tier ledger records that historical failed run;
it does not claim a clean full run for this follow-up. Rule 19 calls for the
affected suites and replay guard here, not another complete full run.

## Changed assertions and fixtures

- Catalog: four approved release switches dev -> on; tyre-slip on in the first
  pass -> dev in this follow-up, as Claude directed.
  Remove tyre-slip from released-switch and released-off-override assertions.
  Add explicit production checks that tyre-slip is off, including a URL request.
- Ski switch assertion: heli-skiing dev -> on. Physics and scoring limits unchanged.
- Undo this card's tyre-slip pins in drift-trial and engine-curve fixtures;
  restore their original inputs and historical fingerprint assertion unchanged.
- Helipad admission: remove the old expectation that lessons on/tyre-slip off
  hides lessons. Exercise that combination as the positive fixture; keep both
  disabled-lesson cases, with tyre-slip off and on.
- Keep the approved map-off rescue pin, and the existing shelf, arrival and ski
  DOM children needed by the released UI. All their assertions stay unchanged.
- Add native regression assertions for the isolated lesson sliding rules and
  unchanged ordinary Pro race behavior; details/results recorded below.

## Removed

Removed the unapproved global tyre-slip release and the historical fixture pins
that only supported it. No runtime assets replaced. Recycled generated scratch,
build and raw test evidence, including the prior full run's generated art proofs,
after recording verdicts. No pictures or frame timing
required. No real player saves accessed. Cockpit task T-062 maps this card.

## Claude review (26 October 2026)

Approved and merged: the four switch states, the explicit off-path fixtures, and lessons admitting on their own switch with tyre slip kept dev. No frame check for the ski and rescue views (no recipe yet; HELI-VIEW-FRAMES); races unaffected.
