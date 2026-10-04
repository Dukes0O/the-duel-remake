# AUD-18: kept fight voices

Status: base update review needed. Lane: codex/audio/fight-voices.

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
- Prior source checks: feature switches, Preview and 8 combat HUD cases pass.
- Gatekeeper: 8 cases; combat audio: 11 cases; sound bank and file placement
  pass. Production build passes. No source receipt or hash changed.
- Changed assertion: feature catalog grows from seven to eight switches.
  Released five-switch on values remain; Fight Voices alone is added as dev.
  Its production-off and explicit-QA checks and released explicit-off fixtures
  remain. No existing replay pin, refusal or isolation assertion is weakened.
- Three ordinary replay fingerprints remain exact in the native event listener.
- Laptop browser/native audio recheck passes: High and Performance, private port 17976,
  memory-only saves, two screenshots, no warnings or errors. Eight crew HUD
  captions and pause/menu/no-stale-resume checks pass. No HUD overlap or
  caption DOM writes across five unchanged snapshots.
- Independent source review clears 23e625e: native actor/enemy attribution
  and guarded subtitle DOM writes; all 26 cases / 358 checks pass.
- Independent audio QA passes all nine native/offline takes and actual live
  Rook/Bill events in both qualities, at 1366x768 with memory-only saves.
  Native speech contrast: 6.289-13.492 dB; true peak: -2.58/-2.54 dBTP.
  Live High: 11.792 dB contrast, -3.46 dBTP; Performance: 10.686 dB,
  -3.57 dBTP. Zero clipping; take durations, captions, no speech overlap,
  mute, pause and menu checks pass. Kept sources and receipts stay exact.
- Human clarity and live onset within 30 ms remain unmeasured. Captions can
  linger when simulation slows. The separate old engine -50 ms boundary
  observation is not a Voice regression. No new voice or source choice.
- Merge base: complete released integration 3eb740d, preserving automatic
  incoming files, including README and VERIFICATION; five switches stay on.
  Current checks pass: Voice 26 cases / 358 checks, sound bank/mixer,
  gatekeeper 8 cases, flags 36 checks, Preview 22 checks and HUD 8 cases.
  Production build passes. Broad lane gate waits for the Director's baseline
  full run. Earlier 107/1/240 run is not a pass.
- Recipe: node tools/build-fight-voices.mjs copies and hash-checks all nine takes.
  Native scenario: tools/scenarios/fight-voices.mjs, High and Performance.
- Kyle's listening check remains a separate human gate; no listening approval
  is inferred from decoded bytes or waveform measurements.

## Removed

None. This adds the kept takes to fights; no existing voice or cue is replaced.
