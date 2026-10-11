# P4-AUDIO

## Settled foundation

Prepare the 17 CIRCUITS section9 cues and three track beds from licensed CC0
or CC BY recordings. All20 definitions use the grand-prix switch. Source
catalog/credits/checksums and all pre-P4 records remain unchanged. Runtime
assets total1,185,427bytes; largest decoded peak0.71836. Repeatable Vorbis
builds are exact. No paid generation, runtime dependency or network request.

FIELD cues use actual startLight, lightsOut/go, positionGain, finalLap and
completed GP stageResult events. Five lights, go, final lap and finish play
once per actual field; real position regains can play later. Duplicate events,
late decode, mute/pause/locked audio never replay missed cues. Stage/menu
replacement stops voices; the finish flourish may end naturally on results.
Ordinary countdown/win/loss and GP failure fallback keep their old cues.
Fifteen prepared cues await their real owner events; do not invent events.

Foundation c331f6db passed376/376 lane suites and build668ms. Native eight-car,
three-lap finish154.73s, real recorded cues, source/lifecycle and independent
replay controls pass. Seeded12-second audio/duplicate-event race fingerprint
is e3d4a72558781ba5c6c00e74a9199cac2348a6357eb10bd666776c91e63c711a.
Final state value equality covers every key, with zero adapter
save calls and an unchanged cloned profile. Raw JSON hashes differ only from
App metadata insertion order; no comparison field is removed or copied.

Kyle accepted the earlier full mix(-22.42LUFS/-4.25dBTP) on11October. Its native
cue onset advisory ranges-3..107ms; repetition flags five identical ticks and
four gains. That approval does not cover the louder mastering below.
Four source reels remain recipes; native complete-race listening is separate.

## Recording rules

Actual App autopilot/controls run a real-time eight-car three-lap GP. No lap,
position or finish injection. Existing worklet and independent witness meter
actual final output, engine and interface. Establish all three meters before
stage load; rotate about20s and join exact native sample boundaries. Never
fill/resample/trim missing samples. Preserve every cue and full finish tail.
Bound the race at10minutes and any recorder diagnosis at30minutes.

Keep exact replay values through a disposable native App callback adapter,
with cloned starting profile, zero saves and no final-state copy. Native event
and source times, revs/throttle/speed/status remain recorded. Functional,
recorder identity, measured mix and human listening have separate verdicts.
The offline --recorded-mix builder checks WAV/native PCM equality and full
rate/channels/frame count before encoding an unedited, unnormalized MP3.
Seekable MP3 decoding applies native padding metadata without trimming or
changed tolerances; listening.json retains exact recipes/hashes/cue times.

## Louder mix and bounded repair: decision before code

Kyle requests about-16LUFS and peaks<=-1dBTP, listening tomorrow. Initial
post-compressor+6.4dB follows the measured-22.42LUFS race. Original quiet-tone
reference expects exact+6.4 peak/RMS with its unchanged0.1dB tolerance.
Every ceiling/contrast/onset/continuity/lifecycle assertion remains unchanged.

c665 native whole mix passes-16.08LUFS/-1.21dBTP,188.232s/9,035,136frames at
48kHz, ten segments, exact replay/lifecycle/identity. The unnormalized MP3
is2,402,685bytes and-16.08LUFS/-0.58dBTP; original runtime WAV certifies peaks.
Keep .evidence/2026-10-11/P4-AUDIO/native-c665 until a verified replacement.

Canonical52348cc2 stress fails14/23: pre-hit peaks0.5428-.5511 require onset
1.0855-1.1022, impossible below-1dB peak.8913. The.8 curve produces actual
1.00283 (+.025dBFS) after4x resampling; truepeak reaches+.03dBTP.
Approved trial1(-22threshold/.012attack, curve.50/.70) reaches19/23: ceilings
and contrast pass, but native automatic makeup adds1.801dB to quiet, with
floor.616-.648. Original quiet/onset checks reject it; no waiver.

Approved trial2 restores compressor-18/attack.003, ratio4/knee16 and native
release, with+6.4 gain/4x. Monotone C1 curve: unity<=.25, quadratic taper to
.33 by.41, plateau through.65, smoothstep to.70 at1. Quiet stays unchanged;
medium crests leave room for genuinely large hits. All original limits stay.
MockContext gains actual native attack.003/release.25 AudioParams only.
New actual-node finite/odd/monotone/quiet/headroom/endpoints test fails first
on medium crest headroom, then469checks pass (original460 retained).

Trial2 native canonical23/23,98checks pass: sample peaks-2.035/-2.210/-1.599,
true peaks-1.93/-2.01/-1.60dBTP. All three distinguishable onsets are<=30ms;
engine contrast, finite continuous blocks, cleanup and actual recorder pass.
First whole attempt rejected one128-frame discontinuity at segment6. Valid
partial121.347s is-16.20LUFS/-2.49dBTP, explicitly not a whole-race pass.
Identical-source retry rejects the same128-frame clock anomaly at segment2.
It advances1920 then2176 frames between2048-frame chunks, with one256-frame
callback gap. Both attempts remain; no third run, clock repair or waiver.
Whole verdict is held for Claude; partial loudness never certifies completion.
No human listening or frame claim. Current lane/build and review remain due.

## Removed

Direct compressor-to-ceiling routing becomes the gain/crest-aware ceiling.
Rejected threshold/attack trial is removed; no alternate mastering branch.
Bare-Duel replay uses the native callback adapter; no state fields removed.
Source assets/cues/reels stay exact. Consumed inspection output is deleted
when its verdict is recorded; keep current whole PCM until verified replacement.
