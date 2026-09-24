# EGG-03 arrival — round 2

Production source: `a7f6aac`. Private memory-only browser port 28790.
The completed scenario reported 11 screenshots, zero warnings and zero errors.
The durable `captures.json` retains actual simulation snapshots, audio metrics
and every ordered performance frame. The harness report was cleared by the
later supplement before it was copied; the original tool completion reported
the results above. No real saves or live server were used.

Changes from round 1: lower-left desktop and compact phone dialog; aspect-aware
framing; actual-world-position camera follow through the opening and an inside
orbit; brighter bounded sparks; selective cinematic vehicle-bus ducking;
stronger chain/drum transients; corrected legacy `.weapon-hud` selector and
change-only DOM text/visibility writes. Presentation 10/10 and existing audio
459 checks passed. No independent assertions changed.

## Measured limits

Each stationary pair uses 120 ordered frames after 12 warm-up frames, with the
same stopped opening snapshot and camera. The disabled condition removes spark
update/draw and HUD update. CPU includes presentation plus render submission;
it is not GPU time or a whole-course performance claim.

| Quality | CPU p95 disabled → enabled | RAF p95 | Draws | Triangles |
| --- | --- | --- | --- | --- |
| High | 2.3 → 2.4 ms (+4.3%) | 18.3 → 18.1 ms | 207 → 208 | 438,165 |
| Performance | 1.4 → 1.6 ms (+14.3%) | 18.2 → 18.4 ms | 122 → 123 | 280,817 |

Performance exceeds the 10% CPU threshold. Stable RAF does not remove this
failure. A scoped follow-up will address confirmed repeated selector work.

Actual PCM peaks were -12.47 dBFS High and -13.34 dBFS Performance, without
clipping. Gate RMS was .00970/.01221; the ducked vehicle bus was .00686/.00905.
Round 2 taps the real vehicle bus, including engine, tires and vehicle accents;
round 1 tapped engine layers before this bus, so those stems are not directly
comparable. Audio plots and PCM are retained. No subjective listening or
whole-race sound acceptance is claimed.

## Preserved capture defects

The first R2 scenario checked an absent `app.graphicsQuality` field and skipped
the video branch. Its legacy HUD opacity assertion passed, but the image shows
the camera below terrain. Both original results are retained unchanged.

Fixture correction `bc187ed` ran only a continuous High gate/Enter capture and
one settled legacy view, private port 57704, zero browser warnings/errors.
`motion-supplement/` retains the WebM, browser report, timestamped camera data,
and contact strip. The WebM is canvas-only and excludes DOM dialog controls.
Inspection found the strip images blank: asynchronous reads occurred after the
WebGL buffer was cleared. The subsequent correction must render immediately
before each thumbnail. The settled legacy image still intersects wash scenery,
revealing a real exploration-camera issue rather than merely a stale frame.
These failures remain evidence and are not presented as successful visual QA.

The root-level `round-1.png` and `round-2.png` contact sheets combine the actual
retained PNGs; they do not alter their source captures. Independent Director
scoring remains separate from this builder's observations.
