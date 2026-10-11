# P4-DAYNIGHT: round one

Claude round-one verdict: HOLD — lighting 2, road readability 4, grounding 4,
scene consistency 2. [The original sheet](round-1.jpg), prepared in
`13a094a6`, shows native Harbor & Highlands in High and Performance at day,
golden, dusk and night. Its private capture run on port 11053 passed all eight
views with no warnings or errors. Eight native models, including both licensed
GLBs, share the course, camera and positions in a memory-only fixture.
No released course lighting definition changes.

Night shows native headlamps, tail lamps, reflectors, moon/stars and city
parallax windows. Day removes night-only details. Each mirror capture uses a
refreshed frame. Leaving the path restores material and sky identity; race
state and profile remain exact. The latest run at `f6b591f3` also passed these
native view checks on private port 15625 with no warnings or errors.

| Quality | CPU p95 off/on | GPU p95 off/on | Delivered p95 off/on |
| --- | ---: | ---: | ---: |
| High | 9.7 / 11.3 ms | 11.102208 / 12.085248 ms | 16.8 / 16.8 ms |
| Performance | 8.4 / 7.2 ms | 8.119296 / 7.856128 ms | 16.8 / 16.8 ms |

The original 10% gate **failed** High CPU +16.49%; GPU rose 8.85% and
Performance was cheaper. At 00:20 UTC on 11 October, Kyle relayed Claude's
explicit scoped acceptance of this exception. Delivered p95 stayed 16.8 ms;
this does not establish that every frame met a deadline. Neither branch
exceeded the diagnostic-only 20 ms decision threshold.

Round two must resolve the recorded lighting/scene corrections before merge.
The interrupted DAY lane gate has no verdict; current gates still follow. Panorama Night and Harbour Lights must each measure delivered
p95 with eight cars at night in their own cards and trim lighting if it slips.
The exception does not grant the art verdict or replace those track checks.
Earlier failures and the older source's historical passing repeat remain in
the [change note](../../../changes/P4-DAYNIGHT.md) with evidence references.

Please score resemblance/lighting, road readability, grounding, consistency and
frame cost with the accepted exception. Name the most useful fixes. At most
three rounds.

## Removed

Duplicate status and timing history were removed from this art request; needed
facts remain in the current change note. No runtime asset or legacy lighting
path was removed. Raw captures are deleted after their verdict; the script
rebuilds the sheet.
