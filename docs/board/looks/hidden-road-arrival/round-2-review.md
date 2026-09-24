# Gate arrival: round 2 Director review

Source: `a7f6aac`. Private capture port: 28790. Reviewed the contact sheet,
full phone invitation, full inside-arrival image, loudness plot and paired
frame data. Eleven images and two real-time PCM sets are retained.

| Criterion | Score | Evidence |
| --- | --- | --- |
| Style | 4 | The smaller warm-metal dialog still fits the scene. |
| Readability | 4 | Car, threshold and choices are now distinct on desktop and phone. |
| Grounding | 4 | Parked car and raised opening agree in the actual inspected views. |
| Lighting and materials | 4 | No new presentation mismatch; underlying Rustwall polish debt remains separate. |
| Motion and timing | 3, pending | The inside endpoint is clear and source review checks camera clearance, but the requested recording did not run. |
| Obstruction | 4 | Dialog no longer covers the car or doorway in the valid choice views. |
| Frame cost | 3 | High passes the paired CPU comparison; Performance CPU p95 rises 14.3 percent. |

## Measured cost

Both conditions use the same real opening snapshot, camera and scene, with
120 ordered frames after warm-up. Disabled removes the gate spark update/draw
and HUD update. Simulation and audio recording are stopped for this sample.

| Quality | CPU p95, disabled to enabled | RAF p95 | Draws |
| --- | --- | --- | --- |
| High | 2.3 to 2.4 ms, +4.3% | 18.3 to 18.1 ms | 207 to 208 |
| Performance | 1.4 to 1.6 ms, +14.3% | 18.2 to 18.4 ms | 122 to 123 |

Triangle counts are unchanged. These are CPU submission and frame-interval
samples, not GPU measurements or whole-race evidence. Stable frame intervals
do not remove the unfavorable Performance CPU result. Inspect repeated gate
pose work and spark construction in consumers that only need HUD or camera
data before another sample; retain this result unchanged.

## Sound

The revised gate stem is visibly above the ducked vehicle bus during the
main drum and chain cues. Reported mix peaks are -12.47 dBFS High and
-13.34 dBFS Performance; sampled isolated onsets are within 3 to 11 ms of
dispatch. The plot shows discrete cues rather than a sustained masking tone.
The new vehicle stem taps the actual ducked bus, so it is not the same signal
as round 1's engine-only stem. This is useful gate-specific measured evidence,
not a subjective listening result or whole-race sound approval.

## Evidence defects and next step

- The motion branch checked a nonexistent App quality property, so the
  promised WebM and frame strip were not written. Correct the fixture and
  retain a real continuous Enter sequence before assessing its motion.
- The legacy Mad Max opacity assertion passes, but its actual image shows a
  stale camera below terrain after the stopped cost sample. Preserve it as a
  failed capture. A settled camera view must confirm the complete HUD fade.
- Source review closes both previous code findings: the correct weapon-strip
  class is faded, and identical dialog text is not rewritten each frame.

Round 3 is limited to a confirmed repeated-work optimization, the corresponding
small visual/cost sample, and the corrected motion and legacy-camera evidence.
Unchanged audio source may reuse the recorded round 2 sound evidence. No new
asset family round or broad race matrix is needed.

## Follow-up: the legacy camera failure is a production defect

A settled supplementary capture still places the legacy exploration camera
inside terrain after 600 ms. This supersedes the initial stale-fixture
explanation above. The normal driving camera uses main-road coordinates and
an unrelated tunnel constraint at this distant spur position. The Director
authorized a narrow helper using the car's real world heading and supported
height only while physically on the hidden road, including its return window.
Ordinary and flag-off views remain unchanged. Independent regression tests
must precede the fix, and round 3 must show the actual settled driving view.

The supplementary WebM exists, but its first thumbnail strip read a cleared
WebGL backbuffer. Preserve that failed strip; synchronously render before
reading each thumbnail. The continuous recording and still-frame extraction
have separate verification requirements.
