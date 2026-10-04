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
- fight-voices starts in dev and Preview requests it. Laptop-only subtitle strip.
- Every new event uses its existing catalog cue: crew.<id>.callout or
  raider.toll. The gatekeeper bank cue, source and receipt are unchanged.

## Checks

- Independent red tests committed before source: ea62a61, 20 cases,
  2 passed / 18 failed. Native ownership regression d8df393 before the fix:
  26 cases / 315 checks, 21 passed / 5 failed. No old assertion changed.
  Fixed source passes all 26 cases / 358 checks, including preserved fingerprints.
- Review fix: native weapon events include actor/enemy; CPU Star and enemy
  Arsenal cannot consume the player's crew line. HUD hidden writes are guarded.
- Mortar fire, Tesla charge, Decoy deploy and Nitro start use their actor-owned
  Arsenal launch cues. New-producer native checks belong to the combined ARS lane.
- Feature switches: 35 checks; Preview: 22; combat HUD: 8 cases pass.
- Gatekeeper: 8 cases; combat audio: 11 cases; sound bank and file placement
  pass. Production build passes. No source receipt or hash changed.
- Changed assertion: feature catalog grows from seven to eight switches;
  new production-off and explicit-QA checks preserve the old assertions.
- Three ordinary replay fingerprints remain exact in the native event listener.
- Laptop browser/native audio recheck passes: High and Performance, private port 17976,
  memory-only saves, two screenshots, no warnings or errors. Eight crew HUD
  captions and pause/menu/no-stale-resume checks pass. No HUD overlap or
  caption DOM writes across five unchanged snapshots.
- All nine native-event recordings pass full-throttle speech contrast:
  6.29-13.49 dB over the engine; maximum mix peak 0.71430, below clipping.
  Only four quiet takes gain 1.1-1.5 in the bank; source bytes stay exact.
- Broad lane gate is held for the external tested-base update. The earlier
  run is not a pass: 107 passed, 1 failed, 240 not run.
  This run predates final QA gain/placement fixes. Independent review pending.
- Recipe: node tools/build-fight-voices.mjs copies and hash-checks all nine takes.
  Native scenario: tools/scenarios/fight-voices.mjs, High and Performance.
- Kyle's listening check remains a separate human gate; no listening approval
  is inferred from decoded bytes or waveform measurements.

## Removed

None. This adds the kept takes to fights; no existing voice or cue is replaced.
