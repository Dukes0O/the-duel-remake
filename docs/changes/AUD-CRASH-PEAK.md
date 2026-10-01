# AUD-CRASH-PEAK — native tests-first freeze

The existing output exceeds both peak targets without Fuel sounds. On unchanged
production source `a6523ea086c8354a236f942509a48871026fee08`, the new default
suite reports **22 tests: 16 pass, six fail; 90 acceptance checks**. All six
failures are actual final-output sample or true-peak overloads. This is a RED
test handoff, not a source fix, passing feature gate or release.

## Scope

Only these new files changed:

- `tools/test-audio-crash-peak.mjs`
- `tools/scenarios/audio-crash-peak.mjs`
- `docs/changes/AUD-CRASH-PEAK.md`

No production source, bank, recorder, catalog, sound asset, licensed source,
old assertion or replay pin changed. No runtime dependency was added.

The card was claimed by the Director at integration `cd42fa0`. It uses the
existing Fuel lane and branch. The source freeze here is `a6523ea`, whose
preceding lane gate passed 313/313 and build passed in 513 ms. Those earlier
gates do not cover an eventual audio fix. Fresh lane/build and independent
review remain mandatory before the whole card merges.

## Reproduce

Run the suite normally; it never skips native browser measurement:

`node tools/test-audio-crash-peak.mjs`

The test creates an ignored, card-specific copy of the existing browser
harness and a private Vite configuration. Its build stays below the unique
AUD-CRASH-PEAK evidence run, never shared `.qa-dist` or `.preview-dist`.
The unchanged harness chooses a private port and temporary Chrome profile,
installs memory-only localStorage and career backup storage before App import,
mutes device output, and removes its profile on exit.

Final RED command above: exit 1, 22 tests, 16 pass, six fail, 90 checks,
20.867 seconds. The final native run used port **25489**, 48 kHz stereo,
zero browser errors and zero warnings.

Evidence recipes and raw output are ignored at:

`.evidence/2026-10-01/AUD-CRASH-PEAK/native-2026-10-01T05-40-52-907Z/`

The date is UTC; this run took place on 30 September locally. The folder
contains the generated harness/config, final Float32 capture, three rebuilt
WAV files, measurement JSON, spectra, waveform plots and browser log/report.
The default suite rebuilds them from source; they are not committed.

## Native fixture and final-output meter

The fixture creates an actual App after storage isolation, enters the real
discovered yard with a disposable rank-six career, and starts real Last Car
Rolling or Fuel Run. Each case reenters the yard through its actual entry
path. The engine runs in real time through native App simulation/audio steps
under full throttle. CPU cars are temporarily held to isolate the cue mix.

The native swept contact is the existing `contactFixture` exported by
`warlord-reward.mjs`. Both cars sweep laterally inward using its authored
60 mph per-car setting. Contact causes real armor damage, real vehicleSmash
and the existing vehicle.crash-impact cue. Damage removes 38.624256 armor
from the controlled opponent. No car impact event is fabricated.

In Fuel, the native player actually picks up a canister before contact;
the same collision produces a real fuelDrop. No Fuel pickup/drop event is
fabricated. The non-Fuel case records no Fuel event at all.

Stress adds six marked QA combat-explosion audio dispatches at the real
contact, plus a real `duel.fireWeapon('crossbow')` launch, under the same
engine/vehicle bed. The suite proves at least six blast cue dispatches in
that window. Subsequent actual projectile consequences may add native hit,
wreck or blast cues; this is an overlapping-voice stress fixture, not a claim
that exactly six total voices play or a gameplay balance run.

Native AudioWorklet processors read **`audio.output`**, the final runtime
node. They also read engine and impact buses for contrast. The meter follows
the output property; it is not hard-wired to today's compressor. The graph
control proves master reaches that output, output reaches the real native
destination, and master has no path to destination that bypasses the meter's
final node. There is no fake AudioContext or fake compressor.

Samples remain Float32 throughout capture and WAV encoding. No clamp,
integer conversion or recording-time peak normalization hides overload.
Native block timestamps and contiguous-frame checks establish the sample
timeline. The final output's stress samples above full scale demonstrate
why the older clipped 16-bit recording is not a sufficient ceiling test.

## Final RED and each failure

| Case | Sample peak dBFS | Oversampled true peak dBTP |
| --- | ---: | ---: |
| Real non-Fuel contact | -0.171 | +0.32 |
| Real Fuel contact | -0.164 | -0.16 |
| Six-blast overlap and native weapon/contact | +2.460 | +2.48 |

Sample peaks are measured directly from final-output Float32 samples.
True peaks use the existing FFmpeg loudnorm/EBU R128 measurement on the
unclipped final-output WAV. SPEC 10.1 requires sample peak at or below
-1 dBFS; SPEC 0.9 sets advisory true peak at or below -1 dBTP. This card
explicitly requires both for its repair.

Every final failure message:

- non-fuel-contact: actual final sample peak -0.171 dBFS exceeds -1 dBFS
- non-fuel-contact: actual final true peak 0.32 dBTP exceeds -1 dBTP
- fuel-contact: actual final sample peak -0.164 dBFS exceeds -1 dBFS
- fuel-contact: actual final true peak -0.16 dBTP exceeds -1 dBTP
- six-blast-overlap: actual final sample peak 2.460 dBFS exceeds -1 dBFS
- six-blast-overlap: actual final true peak 2.48 dBTP exceeds -1 dBTP

Real-time schedules, native noise and cue variation can change individual
peak values. An earlier fresh native capture also reproduced all three
overloads (-0.095/+0.23, -0.467/-0.25, +2.683/+2.70 respectively).
These differences are not a deterministic estimate of Fuel landing's
contribution. The non-Fuel baseline independently proves the existing debt.

## Passing preservation controls

All sixteen non-peak tests pass. They check actual damage/event/cue mapping,
final graph routing, full-band native capture, private memory-only operation,
real full-throttle engine state, final timing, contrast, continuous samples,
safe-signal behavior and pause/dispose cleanup.

| Case | Final onset after event, ms | Impact/engine stem contrast, dB | Final mix/engine contrast, dB |
| --- | ---: | ---: | ---: |
| Non-Fuel | 14.73 | 15.28 | 13.44 |
| Fuel | 13.98 | 13.49 | 12.57 |
| Overlap | 9.58 | 26.06 | 17.71 |

The output rise must remain within 30 ms of native contact. Contrast uses
the same 250 ms after contact, with the engine measured at the same moment.
The final mix is also checked against that engine at its retained master
scale. These are objective signal/contrast controls, not human audibility
ratings.

For quiet preservation, a native 997 Hz, 0.01-peak sine runs through the
complete current EngineAudio graph without engine updates. In the same
native context, a separate reference reproduces the exact released
`a6523ea` output path: master gain 0.42 followed by the existing compressor
(-18 dB threshold, 16 dB knee, ratio four, native defaults). The tests compare
measured quiet peak and RMS, within 0.1 dB of that reference. They do not
assert the repaired node type, settings, transfer curve or a guessed limiter
API. Native compressor makeup gain is part of the existing safe-signal
baseline; treating its quiet gain as unity would impose a new sound rule.
Final differences are **-0.000019 dB peak and +0.004974 dB RMS**.

Actual pause clears projectile, hidden-road and all voices inside the
mixer's cue sets. Its final output falls below -60 dBFS after the fade.
Actual App disposal closes the native audio context. The meter's own
branches, ports, object URLs and quiet reference context are also closed.

## Graph inspection and limits

Inspected the generated non-Fuel and Fuel spectrograms and the non-Fuel
and overlap waveforms, plus the overlap spectrum. Both real contacts show
a broad high-frequency rise at about 1.01 seconds. The overlap adds a
stronger broadband rise; the recorded onset measurements locate it within
the timing target. These pictures support the measured overload and event
alignment. They do not supply an ear verdict or prove a loop, pitch,
repetition or space target.

No human listening or ratings are claimed. Pan/distance, loop seams,
variant variety, continuous engine/revs correlation and whole-race loudness
clearance are unmeasured in this scoped test. The prior Fuel verdict's
unmeasured findings remain unmeasured. Kyle listening remains flagged under
SPEC 0.9. The eventual repair needs fresh native capture and gates; this RED
freeze cannot be used as its after measurement.

## New fixture corrections

Four unfrozen assumptions were corrected before this freeze:

- A first setup tried launching the next arena from the menu. Each case now
  uses actual yard reentry. That setup error is not counted as source RED.
- The existing contact fixture reports zero new spark objects despite real
  armor damage and native vehicleSmash. The new witness checks actual damage
  and the real event/cue, without inventing a required visual spark outcome.
- `mixer.voices` counts cue groups, not live voices. Cleanup counts the
  actual voices inside its sets; empty retained groups are valid.
- Quiet output includes native compressor makeup gain. Preservation compares
  measured released behavior rather than a guessed raw 0.42 output ratio.

No frozen or preexisting assertion was changed. No output repair was made.

## Removed

Nothing replaced. No runtime sound, original licensed source, bank entry,
catalog recipe, old test, assertion, recorder or replay fingerprint was
removed or rewritten. Raw build/capture evidence stays ignored for the
before/after review and is removed by the merge janitor after its verdict.
The recipes in the two new tools reproduce it.
