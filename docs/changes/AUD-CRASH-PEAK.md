# AUD-CRASH-PEAK: output repair

The output repair and existing recorder routing pass all **23 frozen
native tests and 98 checks**. All three measured sample peaks and true peaks
stay below -1 dB. Quiet output, contact onset, engine/impact contrast,
pause/dispose and actual final-output recorder routing pass. This is a
source handoff; independent review, controlled whole-race audio review and
fresh exact lane/build gates remain required before merge. Human listening
is still unmeasured.

## Tests-first baseline (8494081)

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

## Source repair

Only production `src/audio.js`, new `src/audio-output.js` and this note
are owned by this implementation. The compressor retains the released
-18 dB threshold, 16 dB knee, ratio four and native attack/release defaults.
The master remains 0.42. The existing buses, cue dispatch, engine layers,
sound bank, recordings and voice cleanup remain intact.

A synchronous native WaveShaper follows that compressor. Its symmetric
transfer is exactly linear through magnitude 0.65, bends smoothly to a
zero slope at magnitude 0.95, and caps the curve at 0.8 (nominal -1.94 dBFS).
Its 4x native oversampling filters the extra harmonics. The curve ceiling
leaves room for native resampling overshoot: acceptance measures the actual
final node for sample and intersample peaks, rather than treating the curve
bound as the final signal bound. This changes only loud peaks; it does not
reduce the blanket master/engine gain. It adds no asynchronous graph setup,
extra output branch, recording normalization, dependency or sound asset.

`EngineAudio.output` is now that final native ceiling node. All five
frozen native graph controls pass: real AudioNode, master reaches final,
final reaches destination, no unmetered master bypass, real AudioContext.
No fake-context production fallback was added.

## GREEN measurement and controls

Reproduce with the unchanged command:

`node tools/test-audio-crash-peak.mjs`

Exit 0: **22/22 tests, 90 checks**, 21.320 seconds. Native Chrome used
private port **39183**, 48 kHz stereo and memory-only saves. Browser errors
and warnings were both zero. The actual final Float32 captures and FFmpeg
EBU R128 measurements are ignored at:

`.evidence/2026-10-01/AUD-CRASH-PEAK/native-2026-10-01T05-55-57-439Z/`

| Case | Final sample peak, dBFS | Final true peak, dBTP | Final onset, ms | Impact/engine stem, dB | Final mix/engine, dB |
| --- | ---: | ---: | ---: | ---: | ---: |
| Non-Fuel contact | -1.486 | -1.38 | 18.46 | 14.28 | 12.31 |
| Fuel contact | -1.520 | -1.52 | 14.75 | 13.39 | 12.23 |
| Six-blast overlap | -1.542 | -1.32 | 13.58 | 24.36 | 15.69 |

Each real swept contact still removes 38.624256 armor and dispatches the
existing impact cue. Actual carried Fuel still drops from that contact.
The overlap still has six real blast voices and actual native weapon fire.
The final quiet 997 Hz signal differs from the same-context released
compressor reference by **-0.000004 dB peak / +0.005000 dB RMS** (limit
0.1 dB). Pause clears the actual projectile, mixer and hidden-road voices;
its measured output is zero in the checked post-fade window. Actual App
disposal closes the native context. All capture streams are finite and
continuous; no clipping or gain is added to the recorder.

The following unchanged nearby suites also exit 0:

- `tools/test-crash-hollow-audio.mjs`: 31 checks.
- `tools/test-combat-audio.mjs`: 11/11 tests.
- `tools/test-weapon-audio.mjs`: existing foot/raider/car signatures,
  ordinary, mute and pause controls.
- `tools/test-gatekeeper-audio.mjs`: 8/8 tests.
- `tools/test-sound-bank.mjs`: bank and mixer acceptance.
- `tools/test-audio-listening.mjs`: 10/10 analysis/booth controls;
  these are not a human listening verdict.
- `tools/test-audio-analysis.mjs`: 6/6 analysis controls.
- `tools/test-audio-compression.mjs`: all 14 recorded PCM and loop sample
  counts exactly preserved.
- `tools/test-crash-slide.mjs`: 4/4 tests.
- `tools/test-crash-presentation.mjs`: 17/17 tests.
- `tools/test-traffic-shield.mjs`: 2/2 tests.
- `tools/test-crash-switch-remove.mjs`: 17/17 checks.
- `tools/test-replays.mjs`: all **162 retained fingerprint checks** pass;
  no pin was edited or regenerated.

The unchanged `tools/test-audio.mjs` initially stops at
`src/audio-output.js:22` with
`TypeError: context.createWaveShaper is not a function`, through
`EngineAudio._build` and its existing `makeAudio` fixture. This is missing
mock support for a real native API; the real browser suite passes. The
Director assigned independent helper-only adaptation, retaining every old
assertion. No production workaround or implementation test edit was made.
Independent test-author commit `c3323cf24e21545b270370ff2e2b0c71a32cb379`
adds only six mock helper lines to `tools/test-audio.mjs`: a normal Node
with native `curve = null` and `oversample = 'none'` defaults. Every
existing assertion and pin stays intact; the helper models no DSP. A fresh
implementation-side rerun exits 0: **460 checks**, **617,062 finite
automation commands**, maximum existing engine blend swing 6.68 dB. This
mock control proves the old graph/cue/PCM controls, while the frozen native
suite supplies the actual output-limiting measurement. The initial missing
method was at line 22 before the later explanatory source comment.

## Source evidence and limits

Source SHA-256:

- `src/audio.js`: `0ce6602c798a4326da9436219f24b232d16019727f6f1c71b796b32c2f17f56f`
- `src/audio-output.js`: `f2f4955a673d47cd84e320402e598adb64e96ef4501ba56e69cdd1e99cada15c`

The frozen native suite and scenario remain byte-exact to `8494081`:

- `tools/test-audio-crash-peak.mjs`: `81e51f9e69a8a62e95f0efe6bceaf27b1a811e474ba21a59b10703a990a0d173`
- `tools/scenarios/audio-crash-peak.mjs`: `2e8fad75a2c23b705445b399bf1efbf198955637b185c8529fa89b4dd40c8337`

No cue, asset, bank/catalog, recorder, replay fingerprint, simulation or
save hook changed. No native/full gate or build pass is claimed for this
source freeze. The Director owns fresh exact lane/build evidence,
independent code review and audio QA before merge.

The Director identified one remaining existing recorder issue:
`tools/audio-race-check.js:134-135` still taps `qa.limiter`, the captured
DynamicsCompressor, now upstream of the final ceiling. This implementation
has no ownership of that recorder and did not inspect or edit it. Whole
race audio clearance needs an independently frozen native RED and the
Director's separate hook grant so that recorder captures the real final
output. The scoped native suite already reads `EngineAudio.output` and
passes its actual no-bypass/final-node controls. Its pass does not clear the
older upstream recorder.

Human ratings, perceived timbre of the new peak ceiling, pan/distance,
loop seams, take variety, continuous engine/revs correlation and a complete
race's loudness remain outside this scoped measurement. Short authored
stress captures report -12.73/-12.94/-9.60 LUFS; their advisory -16 LUFS
readings are not a whole-race loudness verdict. Kyle listening remains
flagged under SPEC 0.9. The measured contacts and overlap meet both peak
targets; this handoff does not infer that every possible future mix has
already been measured.

## Removed

Removed the previous compressor-to-destination connection and its role as
the measured final output. Its released compression settings and behavior
remain in the single output chain before the new ceiling. No old cue,
recording, licensed source, bank entry, catalog recipe, assertion, recorder
or replay pin was removed or rewritten. Raw evidence stays ignored until
the independent verdict; the merge janitor removes it after that verdict.
The frozen recipes reproduce the measurement.


## Independent actual-recorder routing RED

The repaired final audio passes all 22 native peak/preservation tests, but
the existing race recorder still taps upstream of the final output. A new
default native regression proves this against unchanged clean source
`c0bb9b18f33ea3a9f8377a06db74f2bb3c6d0884`.

Command: `node tools/test-audio-crash-peak.mjs`.

Result: **23 tests, 22 pass, one fail, 98 checks**, 22.529 seconds, exit 1.
All original 22 acceptance tests and their 90 checks remain unchanged and
pass. Their fresh sample/true peaks are -1.472/-1.41 dBFS/dBTP for non-Fuel,
-1.468/-1.47 for Fuel, and -1.186/-1.19 for overlap.

The new failing message is:

> actual existing race recorder mix bypasses the final runtime audio.output;
> an upstream compressor tap cannot certify final peaks

The actual observed result is
`{fromFinal:false,bypass:true}`, expected
`{fromFinal:true,bypass:false}`.

### Actual source probe

A QA-only entry is generated under the test's unique ignored evidence
directory and bundled alongside the existing menu entry. It imports the
real EngineAudio class and unchanged `tools/audio-race-check.js` into the
same native page. A read-only wrapper retains the actual instance after
its original `_build` method runs. Native connect and ScriptProcessor
creation wrappers retain their original calls, return values and routing;
they only collect node references and actual connection edges.

The real `__audioQaStart` builds and starts the existing recorder. The test
follows its actual mix processor through the native graph, using that
instance's actual `audio.output` reference. It does not infer a compressor,
WaveShaper, curve, threshold or limiter API from source text. The new test
requires the actual final output to reach the real destination and recorder
mix, with no master-to-mix path that avoids final output.

The probe used a genuine AudioContext, 48 kHz stereo, seven actual recorder
processors and **53,248 recorded mix frames**. Memory-only storage was
installed by the existing recorder before App import. The native context
closed after `__audioQaFinish` stopped the runtime. Every positive setup
and cleanup control passed.

The existing recorder's integer/clamped capture is left unchanged here.
Its data is not used to claim a peak/DSP pass. The original 22 peak tests
still meter final output with native Float32 AudioWorklets. This appended
regression checks the actual recorder routing that invalidates an upstream
peak verdict; it never manufactures a graph or substitutes runtime methods.

The test build and generated wrapper stay below:

`.evidence/2026-10-01/AUD-CRASH-PEAK/native-2026-10-01T06-17-17-021Z/`

Private port **23952**, zero browser errors and warnings. The generated
harness admits only its own evidence prefix alongside existing tools pages.
No shared QA output, Preview, live port, system/microphone audio, real saves,
network dependency, sound source, bank, catalog or asset was changed.
No mandatory generated artifact is added to the repository.

Only the assigned peak test, its scenario recipe and this note changed.
Recorder/helper/runtime source remain byte-identical. No previous acceptance,
assertion or replay pin was altered. The minimal recorder fix and fresh
required gates remain pending; this test freeze is not merge clearance.

### Removed — actual-recorder routing test freeze

Nothing replaced or removed. Added one independent native routing regression
and its ignored wrapper recipe. Original tests, runtime methods, recorder
data format, audio nodes, source assets and fingerprints remain unchanged.
Raw probe output is deleted after the card's before/after verdict is retained.


## Actual recorder repair (frozen RED 3a22afc)

The existing recorder now validates `audio.output instanceof AudioNode`
and taps that actual output into `recorder.buses.mix` using the original
native connect method. It no longer captures the upstream compressor as
`qa.limiter`. This implementation owns only `tools/audio-race-check.js`
and this change-note update. Production `src/audio.js` and
`src/audio-output.js` remain byte-exact to `c0bb9b1`; the independent
old-audio mock helper remains byte-exact to `c3323cf`.

No category or stem mapping, bus gain, event/frame/timestamp field, sample
rate, integer/clamped recording format, start/finish behavior or playback
behavior changed. The removed capture was unused after the mix tap was
corrected. The actual game output still has its original destination path;
the existing silent recorder branch records it without changing device
playback. All frozen tests and recipes remain unchanged.

### Native RED to GREEN

Before: unchanged `c0bb9b1` production with tests frozen at `3a22afc`
reports **23 tests: 22 pass, one actual routing failure; 98 checks**. The
real recorder graph was `{fromFinal:false,bypass:true}`; final output still
reached the real destination. All original 22 peak/preservation controls
passed. The native RED recipe and detailed witness above are retained.

After: unchanged command `node tools/test-audio-crash-peak.mjs` exits 0:
**23/23 tests, 98 checks**, 22.811 seconds. The real graph is now
`{fromFinal:true,bypass:false}`, with final-to-destination also true.
The actual recorder probe uses native context, isolated memory-only saves,
7 existing processors and **53,248 real mix frames**;
it stops and closes its native context. Private port **6543**, 48 kHz
stereo, zero browser errors and warnings.

Ignored before/after evidence is reproducible from the frozen recipe:

`.evidence/2026-10-01/AUD-CRASH-PEAK/native-2026-10-01T06-21-32-062Z/`

| Case | Final sample peak, dBFS | Final true peak, dBTP | Final onset, ms | Impact/engine stem, dB | Final mix/engine, dB |
| --- | ---: | ---: | ---: | ---: | ---: |
| non-fuel-contact | -1.451 | -1.40 | 18.46 | 13.20 | 11.40 |
| fuel-contact | -1.534 | -1.53 | 12.23 | 12.39 | 11.41 |
| six-blast-overlap | -1.074 | -1.07 | 13.58 | 25.03 | 16.51 |

Quiet output differs from the retained native compressor reference by
**-0.000004 dB peak / 0.005000 dB RMS**; all original event,
engine contrast, actual carried-Fuel drop, Float32 continuity and native
pause/dispose assertions still pass. The overlap true peak leaves only
**0.07 dB measured headroom** to the target in this capture. Peak variation
between native schedules is recorded rather than treated as a guarantee
for every future mix. This narrow margin is an unresolved robustness concern
for the Director's independent repeated native stress checks. All frozen
peak assertions pass in this capture. No production ceiling or cue was
adjusted here.

A fresh unchanged old-audio rerun passes **460 checks / 617,062 finite
automation commands**, maximum existing blend swing 6.68 dB. Relevant
unchanged controls also pass: audio analysis 6/6, listening/booth controls
10/10, combat audio 11/11 and existing weapon audio signatures/lifecycle.
The native routing test exercises the actual recorder; it does not infer
correctness from source text or substitute a fake graph. The existing
integer recorder is not used to prove peak limiting: those original 22
controls continue to use the actual final Float32 AudioWorklet captures.

### Recorder freeze evidence and remaining review

SHA-256:

- `tools/audio-race-check.js`: `31de66feca4b5138f9cb403ddd4c762e28325f02f8be2b70d3469f7b1b3422ff`
- unchanged `src/audio.js`: `0ce6602c798a4326da9436219f24b232d16019727f6f1c71b796b32c2f17f56f`
- unchanged `src/audio-output.js`: `f2f4955a673d47cd84e320402e598adb64e96ef4501ba56e69cdd1e99cada15c`
- unchanged `tools/test-audio.mjs`: `4c9ebd49594a91b64b010d35a0218e6328f52047cf35d167d873a38a6ba6febb`
- frozen `tools/test-audio-crash-peak.mjs`: `47c8972fd86bf209af0081a7f1bd85523aff9f41b92bd6fd9e01e014e0f3c3a5`
- frozen `tools/scenarios/audio-crash-peak.mjs`: `76fd0325e396368d159abda83238857ba5242d2830631b01b3c9316f288337b8`

The upstream recorder routing debt identified in the prior source freeze
is resolved. Whole-audio clearance is still pending. The Director's prior
actual-race capture reported engine/revs correlation **0.870** and lag
**-50 ms**. This recorder-only change neither rechecks nor resolves that
finding; an independent controlled actual-race capture must do so after
this routing correction. Human listening and the previously named space,
variety, loop and whole-race loudness limits also remain. The Director owns
independent code review, final Audio QA and fresh exact lane/build gates.
No merge or release pass is claimed.

### Removed — recorder repair

Removed the unused `qa.limiter` member and its compressor-detection hook,
and replaced the recorder's upstream compressor guard/tap with a validated
actual-final-output guard/tap. No category/stem, timestamp, recording format,
audio source, asset, bank/catalog, protected licensed file, old assertion,
recorder processor, runtime dependency or replay pin was removed or changed.
Raw evidence remains ignored until its independent verdict, then the merge
janitor removes it; the frozen recipes reproduce the measurement.

## Independent final measurements and source verdict

The output source and faithful mock support clear independent review at
c0bb9b1. The recorder-only change clears review atd96f1f2; every category,
stem, event, frame, timestamp, PCM format and cleanup path stays exact.
The recorder now reads the actual final node and rejects missing/non-native
outputs. No compressor or pre-output mix tap remains.

Independent Audio QA ran three fresh default native suites,23/23 each. All
nine contact/Fuel/stress sample and true peaks meet-1 individually. Stress
sample/true peaks are-1.497/-1.36,-1.576/-1.34 and-1.478/-1.47dB. Quiet
reference, event onset, contrast and pause/disposal controls all pass. The
earlier narrow0.07dB margin remains recorded; no new margin or averaged
acceptance target was introduced.

The actual final-recorded scripted race measures engine correlation0.971
with0ms lag, final samplepeak-2.144dBFS, no detected clips/clicks/loop gaps,
14 measured sync checks, weapon contrast6.697–10.479dB, correct spatial
probes, blast variety and six-blast stress. The earlier0.870/-50ms engine
miss remains an observation and did not reproduce in this controlled fresh
capture; engine mapping/source stayed unchanged. Graph review finds no
additional proven defect. Unplayed footsteps/bolts and absent landing cues
are not coverage passes. Human timbre and Fuel cue masking remain listening
flags under SPEC0.9, with no invented ear ratings.

The ignored final recipe/verdict is
.evidence/2026-10-01/AUD-CRASH-PEAK/independent-final-d96f1f2/VERDICT.md.
Current integration was then merged normally into the lane ate68f03f so the
final gate includes merged steering and donor records. Raw-byte comparison
confirms all six audio source/helper/native suite/scenario/recorder files
remain exact tod96f1f2. Fresh Fuel browser and current exact lane/build are
next; this note does not inherit an earlier gate or release clearance.

### Removed: independent final measurements

No asset or player data was removed. Superseded compressor tap and its
unused detector were removed in the recorded recorder change. Pending
review evidence stays until its final verdict and merge cleanup.
