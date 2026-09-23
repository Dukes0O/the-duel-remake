---
task: AUD-02
status: review
kind: audio-qa
flag: none
player_facing: no
---

This historical `AUD-02` note describes audio measurement tooling for the
current combat slice. It does not implement the spec's `AUD-02 On-foot and new
weapon sounds` card. Footsteps, doors, plate clangs, turrets, and the other
new cues remain open. Measured onset and pitch checks do not establish how
the mix sounds on headphones or speakers.

## What changed

The private race recorder now captures shift one-shots on a seventh, shift-only
WAV stem. They remain in the engine and final mix too. The analyzer checks
shift onset against that isolated stem, because the intended engine cut makes
the full engine stem quieter at a shift. It matches the first 60 ms of the
credited shift recording against the stem. This identifies a rapid new accent
while rejecting the prior accent's loud tail. The existing 30 ms event-sync
limit is unchanged.

The engine pitch estimator now chooses the nearest plausible octave to its
previous **audio** reading. It does not use revs to make that choice. It omits
the 180 ms around a shift, when the one-shot and engine cut obscure the steady
loop, and drops audio windows whose autocorrelation peak is too weak to seed
a reliable octave. The existing requirement for at least 12 samples, rev
correlation 0.9, and lag under 50 ms is unchanged. Historical six-stem
recordings can still be opened, but their shift events fail the sync check
because they lack the
isolated evidence.

No game sound, simulation, save, race event, asset, or runtime dependency
changed in this commit.

## Evidence

Before this change, the corrected AUD-01 recording missed eight of ten shift
onsets, and its raw pitch/revs correlation was 0.273. Matching the authored
shift sample to the recorded engine stem found all ten accents within −1 to
+3 ms, while the full engine stem dipped to 16–57% of its pre-shift RMS.
On 75 of 90 steady readings, the raw pitch estimator chose about half of the
expected tonal frequency; those readings alone correlated 0.962 with revs.
This showed why the full-stem onset and octave-switching pitch estimates gave
false failures. It did not prove how loud the accents sound to a player.

Two new private real-time Chrome races used memory-only saves and free ports:

| Recording | Shift onset | Engine/revs | Whole `--check` |
| --- | --- | --- | --- |
| `audio-race-2026-09-23T08-44-17-443Z` | 10/10 within 30 ms | 0.978 correlation, 0 ms lag, 54 samples | Passed all checks |
| `audio-race-2026-09-23T08-46-55-263Z` | 10/10 within 30 ms (−1 to +3 ms) | 0.969 correlation, 0 ms lag, 58 samples | Passed all checks |

Each run captured seven WAV stems, 23 events, and zero browser warnings or
errors. The second run had zero measured clicks, zero clipped samples, a
−1.654 dBFS peak, and all AUD-01 combat contrast, panning, distance, variety,
and six-blast stress checks passed.

The analyzer fixture keeps negative controls: a missing or 100 ms late shift
fails, including a missing retrigger while a prior shift accent still plays.
A separate check inserted six fake shift events 110 ms after real shifts into
the real browser recording; all six failed. A local-RMS-only prototype had
incorrectly passed those fake events, so it was replaced before this commit.
A separate browser run initially gave 0.457 rev correlation when a weak tonal
window seeded the wrong octave. Requiring a clear autocorrelation peak raised
that run to 0.978 with 54 independent audio windows still measured.
A flat-pitch engine fails the unchanged 0.9 rev correlation gate. The existing
late explosion and buried combat-hit controls still fail their respective
gates.

## Remaining risk

The recordings and waveform checks show when the accent occurs and how the
engine pitch follows revs. They do not settle whether shifts sound clear on
headphones and speakers. A matched-filter estimate put the shift one-shot
roughly 7 dB below the pre-shift engine in one loaded segment, although the
engine is intentionally cut during the cue. A listening pass is still needed
before calling broader sound polish complete. The audio input tool did not
accept the WAV for model listening, so no listening judgment is claimed here.

The shift template is calibrated to the recorder's fixed Falcone F42 race;
another QA car voice would need its playback pitch applied to the template.

## Verification

- `node --test tools/test-audio-analysis.mjs`: five tests passed, including
  the missing, late, and rapid-retrigger shift controls and flat engine pitch.
- `node tools/test-browser-harness.mjs`: three tests passed.
- `node tools/audio-analysis.mjs <recording> --check`: all checks passed for
  both final private seven-stem recordings above.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 157/157 suites
  passed in 390.65 seconds; 162 replay fingerprints passed across 18 cases,
  three frame rates, and three runs.
- `npm run build`: passed with the existing large rendering chunk warning.
- `git diff --check`: passed.

On the forward port based on integration commit `5d00eeb`, the focused audio
analyzer tests pass 6/6 and the production build passes. The older browser
recordings above were made before this port; at that point a new recording
and the lane and merge gates were still needed on the current branch.

On clean forward-port source `898835f`, the lane and full code tiers both
passed 176/176. The new private seven-stem Chrome recording passed the
unchanged 30 ms cue limit and 0.90 engine/rev correlation target: 14/14
timed cues, 0.983 correlation over 66 readings, and 0 ms lag. It reported
no browser warnings or errors. The older Falcone-only shift-template and
subjective listening limits above still apply.
