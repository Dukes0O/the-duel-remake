# P4-DAYNIGHT: final round three

Claude's final art verdict passes: lighting, road readability, grounding and
consistency each score 4 (overnight inbox, 11 October, 22:25 PT). [The final sheet](round-3.jpg)
uses the eight unchanged native captures from frozen source
`555d9f3b69892c0572e51448001faacbba87cff9`. It is 447,115 bytes. The existing
recipe resizes each full 1280 x 800 image to 640 x 400, without cropping,
relighting, substitution or rerender. High is above Performance; columns are
day, golden, dusk and night. The native Harbor camera, eight cars and seed
match the earlier rounds.

The one functional run on private port 46547 passed all eight views with zero
warnings or errors. The authored path was present when the native stage was
created. Readiness, exact legacy/material restoration, and unchanged race
state/profile checks passed with memory-only storage. Both presets recorded
22 paired fixture poles, arms, heads and road pools; eight complete stations
per side project into view. All eight cars show two soft rear-glow meshes at
dusk and night. Direct inspection shows supported fixtures, continuous centre
and edge lines, cat's-eye glints, and readable night car bodies and road edges.

Shader inventories were High 148 after warmup and 151 after initial scene
preparation; Performance 238 and 243. Those initial additions are +3 and +5.
No further program was added through the first dusk or night transition.
This is preparation evidence, not proof that shader compilation caused any
previous timing failure. No compile cause is established.

The same-capture pixel audit records native markings 50 m ahead beside nearby
tarmac. At night, peak 3 x 3 paint luminance exceeds adjacent tarmac by
157.7-170.6 for High centre lines and 211.8-216.2 for its edges; Performance
is 197.2-199.0 and 214.4-218.3, on a 0-255 scale. Rounded single-pixel probes
miss one Performance centre line and one edge; both raw values and nearby
peaks are preserved. The actual images show those narrow lines continuously.
Pixel values support visual review and do not replace it.

Changes submitted in this final round: supported lamps on both sides at
40 m spacing, bounded native road-marking reflection, cool night fill, and
preparation of real night variants within the existing structural warmup.
Focused checks passed: lighting 544, warmup 304, pass parity 143 and preparation
keys 39. Build passed. Frame measurement was off for these captures. The one
standard quiet frame watch on the same frozen runtime passed both pairs and
orders in both qualities, with every original 10% limit unchanged. Delivered
p95 is at most 18.2 ms (Claude allows 18.5 ms for High); no fallback or
exception is needed. CPU rises at most 5.43%, GPU 2.16%, delivered 0.55%.
All eight legs retain 360 CPU and 359 GPU/delivered samples. Earlier failures
remain recorded. No new timing run, fourth art round or runtime change.

## Retained earlier verdicts

Round one was HOLD: lighting 2, road readability 4, grounding 4, consistency 2.
Its original High CPU +16.49% failed the 10% limit (9.7/11.3 ms); Kyle relayed
Claude's scoped acceptance on 11 October at 00:20 UTC. GPU rose 8.85%; delivered
p95 stayed 16.8 ms. That old-source exception did not apply to round two.
Round-two source 0f3cf576 retained a failed original High pair two: CPU
9.6/18.7 ms (+94.79%), GPU 11.132928/17.587200 ms (+57.97%), delivered
16.8/18.2 ms (+8.33%). Other comparisons met the unchanged 10% limit.
No cause, retry pass or tolerance change was inferred from those failures.
Detailed old-source timings and native findings remain in the DAY change note.

## Removed

The sparse one-side path fixture batches and late-injected QA path were
replaced in this change. No additional sheet, raw capture or timing log is
committed. Consumed round-one/two sheets (876,493 bytes) and superseded
reviews are deleted after retaining needed verdicts and failures here. The
final round-three sheet retains its reviewed 447,115 bytes exactly.
