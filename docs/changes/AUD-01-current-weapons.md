# AUD-01: current weapon fire cues

status: integrated

## Change

- Replaced the shared falling fire tone for the four currently playable Wasteland2 weapons. UFO has an uneven rising warble; bomb has a low launcher thump and air push; crossbow has a short snap and falling string; Star has an ascending shield ring.
- Cues use the existing Web Audio oscillators and shared noise buffer. They add no recording, asset, dependency or network request. All begin at the fire event with 5–9 ms gain attacks and end within half a second.
- Flag-off Wasteland and ordinary modes retain their original one-tone weapon path. The new path is selected only when the Wasteland armor state exists.

## Checks

- `node tools/test-weapon-audio.mjs`: pass. Checks four distinct source/pitch/duration patterns, bounded envelopes, event onset, legacy flag-off/ordinary routing, mute and pause.
- `npm run build`: pass.
- `node tools/browser-harness.mjs scenario weapon-audio`: private memory-only offline Web Audio render, pass with zero warnings and errors. Four playable mono WAV files and `weapon-waveforms.json` are in `.qa-dist/browser-output/weapon-audio-2026-09-24T02-02-47-436Z/` in this worktree.

| Cue | Peak | RMS | Audible tail | Zero crossings |
| --- | ---: | ---: | ---: | ---: |
| UFO | 0.057 | 0.009 | 252 ms | 476 |
| Bomb | 0.087 | 0.010 | 138 ms | 40 |
| Crossbow | 0.061 | 0.006 | 106 ms | 270 |
| Star | 0.065 | 0.015 | 344 ms | 732 |

The new offline scenario initially applied a generic 110 ms minimum tail to all weapons. Its first complete render measured the intentionally brief crossbow snap at 106 ms, so the new scenario uses an 80 ms minimum for crossbow only. No existing test assertion changed or was weakened. The earlier recorder setup also had to schedule directly into `OfflineAudioContext` because that context reports suspended until rendering starts; the production event routing is covered by the focused test.

## Remaining AUD-01 work

- Listen to these WAVs against the engine in a real race and tune relative levels if needed. This slice measured isolated waveforms, not the full mix.
- The expanded arsenal still needs its own fire/flight/impact cues as each weapon lands: rockets, harpoon/chain, flamer, oil and others. Three varied explosion sounds and broader in-race listening remain on the full AUD-01 card. On-foot items and new weapon cues remain AUD-02.
