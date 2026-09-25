---
task: AUD-10
status: in-progress
kind: refactor
flag: wasteland2
player_facing: yes
---

# Sound bank and mixer

## Design

Keep existing synthesis envelopes and engine automation unchanged. Put cue
recipes, bus routing and sample declarations in sound-bank.js. Unity-gain
buses feed the existing limiter. The engine and vehicle buses share the
existing perspective and tunnel return. FLAC compresses the current runtime
PCM losslessly, preserving loop boundaries and the baseline mix. New ducking
and moving-source processing use wasteland2. Cue limits retire old voices
with short fades. These choices can be reversed by changing bank entries.

Work alone as Kyle requested; tests precede implementation. The requested
scope covers audio modules, audio QA/build tools, runtime audio and source
placement checks. No board, status, run log or simulation edits.

## Evidence

Before code: private browser baseline recorded 841 frames, 23 events and seven
PCM tracks on port 36196, zero warnings/errors, memory-only saves. Temporary
recording: .evidence/2026-09-25/audio-race-2026-09-25T05-21-25-666Z/.

## Removed

Pending: raw public sources and uncompressed runtime WAVs, once recipes and
lossless compression checks pass.

## Behavior and test changes

No simulation change intended. No existing assertion changed yet.

## Assertion review

Source-preservation assertions now require the exact catalog hash and external-cache recipe instead of raw downloads in public/. The original loop, headroom, seam, pitch, envelope and missing-file assertions remain. Graph assertions follow named unity buses to the same reflection bus. No existing audio quality target is relaxed. A new strict waveform comparator currently fails; its threshold is unchanged. Investigation and review are pending.
