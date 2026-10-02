# ARENA-PIT: round 1, actual private comparison

Status: prepared for independent art review and Claude; no approval claimed.
Source checkpoint 51db5aa plus official preset metadata refresh. No new assets.
The comparison sheet uses eight actual 1280×720 native browser captures, reduced
to 640×360 without cropping, in High and Performance, full and racing views.
The existing HUD still names Scrapdome; future boss entry owns its presentation.
No public Pit picker or boss acceptance is implied by this private native entry.

Recipe: tools/scenarios/arena-pit.mjs exports buildComparisonSheet(python,
evidence, output). Use bundled Python/Pillow with the capture folder and
docs/board/looks/arena-pit/round-1.jpg. The JPEG is 308498 bytes.
Capture command: PIT_MEASURE_FRAMES=1 node tools/browser-harness.mjs scenario
arena-pit --output-dir .evidence/2026-10-02/ARENA-PIT (PowerShell sets the env).
The lane's ignored evidence junction targets integration's required .evidence.
Actual private port 53932; memory-only saves; zero errors/warnings. The initial
callout expires through 300 native steps; QA disclosure closes after onFrame.

The circular wall has 128 overlapping lower hulk instances. Two upper tiers
remain 64 each. Native wall-span bumper-height rays pass. The radius-8 central
pile, two opposed ramps and native movable floor junk are present. Existing
oval stands/lights/crowd share its centre; static scrap fills their long gaps.

Frame observations (RAF interval P95, 119 samples after warmup):

| Quality | Ring / Pit P95 ms | Ring / Pit draws | Ring / Pit triangles |
| --- | --- | --- | --- |
| High | 16.9 / 16.8 | 546 / 647 | 556442 / 1861324 |
| Performance | 16.8 / 16.8 | 341 / 361 | 355450 / 986832 |

The measured frame comparison passes the 10% limit on this laptop. Triangle
growth remains material and is reported, rather than described as cost-free.
Claude look verdict, Kyle feel and native pilot outer-goal repair are pending.
Raw captures/reports remain in integration .evidence until review, then removed.
