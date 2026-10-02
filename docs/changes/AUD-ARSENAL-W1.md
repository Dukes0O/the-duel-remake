# AUD-ARSENAL-W1 tests first

Source has not started. Only three released Oil/Smoke cues are tested:
weapon.oil.deploy, weapon.oil.slip and weapon.smoke.deploy.

## Coverage

The native fixture starts a genuine discovered Wasteland race with memory-only
flags, fires Oil and Smoke through Duel.fireWeapon, and puts the actual rival
body on the real Oil hazard. It captures genuine emitted events. Oil contact
repeats do not repeat the slip event.

Each cue must have a recorded bank entry, a free CC0 catalog source with a
committed processing recipe, and actual playback through EngineAudio.event.
A small Web Audio context records started sources; the real EngineAudio and
SoundMixer perform routing and playback. Only the three new runtime recordings
are decoded when present. Existing recordings and voice files are never read.

Concise hashes pin all existing SOUND_BANK entries, other bank exports and
catalog records. Adding exactly the three new cue records preserves the old
hashes. No existing assertions, race pins, world signatures or Source changed.

## Validation

2 October 2026:
- node --check tools/test-arsenal-core-audio.mjs passes.
- node tools/test-arsenal-core-audio.mjs: 14 checks, 5 PASS, 9 RED.
- Three genuine native event checks and both existing-data controls pass.
- Each cue reports "missing runtime bank cue" and "missing catalog source
  recipe". Actual EngineAudio.event starts zero sources rather than one for
  each cue. These are the nine failures; no missing-module failure is used.
- State purity after successful playback remains downstream of the genuine
  missing-consumption failure; no listening or audio quality verdict is claimed.
- No broad gate, build, balance, browser or protected-audio job ran.

The Director also granted a small preservation record under tools/replays.
Automatic approval review rejected its creation as an unreviewed fingerprint
baseline and required trusted user approval. A read-only check proved all
existing replay files unchanged; the reviewer rejected that narrowed retry too.
No preservation file was created. Inline bank/catalog checks remain usable.
The existing three replay files are unchanged; replay suites were not rerun.
This blocked addition must not be routed through another owner as a workaround.

## Removed

None. Tests add coverage and replace no runtime cue, recording or recipe.
