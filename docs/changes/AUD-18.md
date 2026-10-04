# AUD-18: kept fight voices

Status: review needed. Lane: codex/audio/fight-voices.

## Decisions

- Kyle's nine kept takes are final. Recording and choosing are done.
- Exact MP3 copies use the existing voice bus and voice ducking. No paid call,
  new take, catalog edit or source-take edit. Runtime growth: 380319 bytes.
- First player attack, repair or signature action announces the chosen crew
  once per fight. Native raider warnings announce Bill once per zone per fight.
- One line at a time; at most three lines wait. HUD reads a WeakMap caption.
  Speech, captions and their history never write race state or player saves.
- Mute stops speech, keeps captions, and never replays a heard line. Pause,
  menu and result clear speech and queued captions. Stage load resets history.
- fight-voices starts in dev and Preview requests it. Laptop-only subtitle
  strip; no phone code or phone checks added or removed.
- Every new event uses its existing catalog cue: crew.<id>.callout or
  raider.toll. The gatekeeper bank cue, source and receipt are unchanged.

## Checks

- Independent red tests committed before source: ea62a61, 20 cases,
  2 passed / 18 failed. Current source passes 20 cases / 272 checks.
- Feature switches: 35 checks; Preview: 22; combat HUD: 8 cases pass.
- Gatekeeper: 8 cases; combat audio: 11 cases; sound bank and file placement
  pass. Production build passes. No source receipt or hash changed.
- Changed assertion: feature catalog grows from seven to eight switches;
  new production-off and explicit-QA checks preserve the old assertions.
- Three ordinary replay fingerprints remain exact in the native event listener.
- Laptop browser/native audio pass: High and Performance, private port 54479,
  memory-only saves, two screenshots, no warnings or errors. Eight crew HUD
  captions and pause/menu/no-stale-resume checks pass. No HUD overlap.
- All nine native-event recordings pass full-throttle speech contrast:
  6.29-13.49 dB over the engine; maximum mix peak 0.71310, below clipping.
  Only four quiet takes gain 1.1-1.5 in the bank; source bytes stay exact.
- Broad lane gate was stopped/held at the Director's request until Claude's
  phone cleanup lands. It is not a pass: 107 passed, 1 failed, 240 not run.
  This run predates final QA gain/placement fixes. Independent review pending.
- Recipe: node tools/build-fight-voices.mjs copies and hash-checks all nine takes.
  Native scenario: tools/scenarios/fight-voices.mjs, High and Performance.
- Kyle's listening check remains a separate human gate; no listening approval
  is inferred from decoded bytes or waveform measurements.

## Removed

None. This adds the kept takes to fights; no existing voice or cue is replaced.
