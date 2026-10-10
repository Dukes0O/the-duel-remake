# P4-DAYNIGHT: round one

Awaiting Claude's art verdict. [The original sheet](round-1.jpg), prepared in
`13a094a6`, shows native Harbor & Highlands in High and Performance at day,
golden, dusk and night. Its private capture run on port 11053 passed all eight
views with no warnings or errors. Eight native models, including both licensed
GLBs, share the same course, camera and positions in a memory-only fixture.
No released course lighting definition changes.

Night shows native headlamps, tail lamps, reflectors, moon/stars and city
parallax windows. Day removes night-only details. Each mirror capture uses a
refreshed frame. Leaving the path restores material and sky identity; race
state and profile remain exact.

The latest confirmed quiet FIELD-synced run at `42b9b5f7` passed the native
views but **failed the frame-cost gate** on private port 45114:

| Quality / pair | Added CPU p95 | Added GPU p95 | Delivered p95 |
| --- | ---: | ---: | ---: |
| High / 1 | -7.27% | -2.65% | 16.8 ms |
| High / 2 | +13.40% | +6.58% | 16.8 ms |
| Performance / 1 | +49.33% | +21.88% | 16.8 ms |
| Performance / 2 | -1.37% | +1.00% | 16.8 ms |

The earlier source's passing repeat is historical evidence, not a pass for
this source. Detailed results and adverse samples are retained in the
[change note](../../../changes/P4-DAYNIGHT.md) and its cited ignored reports.
The cause remains unproved; this sheet grants no art or merge approval.

Kyle/Claude authorized one bounded diagnostic OFF-to-ON pair in each quality.
It keeps the original sample counts and 10% cost gate, adding native renderer
update time and per-frame update-plus-submit time. A 20 ms delivered-p95 limit
routes this diagnosis only; it neither replaces the 10% gate nor sets a new
release floor. Source review and a coordinated quiet slot precede the run.

Please score resemblance/lighting, road readability, grounding, consistency and
frame cost where measured. Name the most useful fixes. At most three rounds.

## Removed

Duplicate timing history was removed from this art request; its facts remain
in the current change note. No runtime asset or legacy lighting path was
removed. Raw captures are deleted after their verdict; the script rebuilds
the sheet.
