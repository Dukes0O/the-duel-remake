# NISSAN-SKYLINE-GTR-R34-V5: Skyline sound

## Changed

Added the approved .96 pitch, 1.03 brightness, .98 gain voice with .16 exhaust
and .13 intake. Existing engine and shift recordings remain the donors.
Only this car has a turbo setting. Both new cues require `nissan-skyline`.
`vehicle.turbo-whistle` is a continuous sine oscillator following revs from
4 to 7 kHz above .35 load. `vehicle.blowoff` is a .34-second filtered-noise
hiss with delayed flutter pulses. High throttle arms the release, including
analog release over several frames; lifting below .2 above .55 revs consumes
it once, with a 1.2-second cooldown. Gear events do not fire it.

The sound bank owns both recipes and mixer routing. Catalog entries retain
the synthesis recipes. No new runtime asset, dependency, API, or source take.
Pause, mute, impact, menu, stage change, car change and flag-off stop the loop.

## Checks and measurements

Audio/PCM: 588 checks pass. At full load, six-second dry engine RMS is
-16.20 dBFS for Skyline. The roster ranges from -16.56 to -15.69 dBFS;
the largest difference from Skyline is .52 dB (limit 1 dB).
The worst six-second adjacent-band 100 ms envelope swing, including Skyline,
is 6.68 dB (limit 7 dB). Steady voice rates remain distinct except the approved
Falcone pair. The P4 native FIELD audio fingerprint stays
`797e1c5a53423d2cacf2317b084aa4fffb9785a1dee353d828a1a4624823f038`.
The P4 historical bank/catalog pins and the sound-bank/mixer checks pass.
Replay guards: 270 checks pass across 30 cases, 28 events, nine categories,
three FPS values and three runs, with unchanged fingerprints.

Whistle at full load: -41.43 dBFS RMS, 25.22 dB below Skyline's dry bed;
-38.15 LUFS and -37.87 dBTP at 7 kHz. Blow-off: sample peak .07630,
-22.35 dBFS, 5.06 dB below the existing lift accent's -17.29 dBFS sample peak
(limit at least 3 dB below). The .39-second analysis includes the synthesis
tool's trailing silence; EBU integrated loudness is unavailable for this short
cue, so the reported blow-off value is sample peak, not measured true peak.

Lane: `node tools/run-tests.mjs --tier lane --changed --jobs 2` passes
76/76 suites, zero failures and zero unrun (527.80 seconds). This includes the
card's audio, sound-bank and P4 checks. World composition: 57 exact checks
across twenty events pass. The first lane attempt found the historical voice
snapshot extension noted below; the corrected complete lane passed.

Build: `npm run build` passes, 600 modules, 1.03 seconds. The linked Vite
package lacks its Windows `.bin` shortcut; the first attempt could not find
`vite`. A temporary `.qa-dist/skyline-build-bin/vite.cmd` invokes the existing
package for npm, without installing or editing dependencies. Existing mixed
import and large chunk warnings remain. The temporary shim and production
output are recycled after use.

Browser: `node tools/run-browser-scenarios.mjs --scenarios skyline-audio
--jobs 1 --output-dir .evidence/2026-10-28/NISSAN-SKYLINE-GTR-R34-V5`
passes 1/1, zero warnings/errors, private port 14498, memory-only saves.
The actual 48 kHz Web Audio capture has blow-offs at 2.000 and 4.008 seconds,
a rev-following whistle, and no turbo loop after pause. Controlled mix:
-12.97 LUFS, -8.12 dBTP, .2 LU loudness range. The generic -16 LUFS advisory
is outside its two-LU tolerance; it is not the packet's engine-to-roster
matching criterion. The packet's 1 dB match, 7 dB blend and cue peak checks
all pass. No frame measurement, drive verdict or human listening claim.
Recording, browser logs and QA bundle were recycled after recording these results.

## Changed assertions

- The existing steady-rate and six-second PCM blend loops now also cover
  Skyline while its roster switch remains dev. Existing tolerances stay exact.
- `test-p4-audio.mjs` leaves exactly the two new cue IDs out of the historical
  bank and catalog projections, as it already does for later cue families.
  Both historical hashes remain unchanged, so every old cue and recipe stays
  pinned. Claude's written assertion review is required before integration.
- `test-arsenal-wave1-audio.mjs` excludes only the newly added Skyline voice
  from its historical export snapshot. Its hash and every earlier voice stay
  exact. The new row is pinned separately in `test-audio.mjs`. The first lane
  attempt exposed this expected snapshot extension; no old value was changed.
- Added Skyline level, threshold, analog release, cooldown, gear-event and
  flat/grouped routing checks, plus lifecycle and cue peak checks.
- Initial sandbox audio run could not decode the existing recordings. The
  decoder needs an unsandboxed test run. Two subsequent runs exposed incomplete
  new impact fixture data (strength, then duration); the fixture now supplies
  both. No production guard or tolerance was changed to address these errors.

## Review

Independent code review found and fixed a flat-mixer routing fault and a
missed gradual analog release. The independent reviewer confirmed both fixes
and the exact historical cue exclusions, with no remaining code faults.

## Removed

Nothing replaced. No old engine, voice row, cue, recording or recipe removed.
Raw native recording evidence, QA bundle, production build output and the
temporary Vite command shim were recycled after their results were recorded.

## Claude's review (28 October 2026, night)

Approved (independent review; rule 18 written review). Engine row matched within 0.52 dB of the other cars; whistle -38.15 LUFS; blow-off peak 5.06 dB under the lift accent. The two changed pins keep their old hashes and only leave the new Skyline entries out, the same pattern as the medal cars; the new row and cues are checked exactly in test-audio. Nothing loosened.
