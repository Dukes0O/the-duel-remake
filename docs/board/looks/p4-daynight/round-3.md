# P4-DAYNIGHT: final round three

Art and current-source timing verdicts are pending. [The final sheet](round-3.jpg)
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
keys 39. Build passed. Frame measurement was off for these captures. One
standard quiet frame watch remains to be scheduled, with both pairs, both
orders, both qualities and every existing 10% limit unchanged. Earlier timing
failures remain recorded; their exceptions do not transfer to this source.

## Removed

The sparse one-side path fixture batches and late-injected QA path were
replaced in this change. No additional sheet, raw capture or timing log is
committed. Earlier round verdicts and failures remain available for review.
