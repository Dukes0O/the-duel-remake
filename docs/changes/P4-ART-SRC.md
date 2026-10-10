# P4-ART-SRC

## Decision before work

Use one HTML sourcing sheet with two numbered donor mixes for each of
CIRCUITS section 8's six groups. A mix may share named support assets.
Every requested item is marked Found, Reuse, Adapt or Gap. A pack title
alone does not prove coverage. Kyle picks before construction.

Show unmodified official previews, creator links and license evidence.
Prefer existing licensed assets, then CC0, then CC-BY. State publisher
AI authorship and the work needed to reach a gritty, believable look.

## Result

`docs/board/looks/p4-src/index.html` has 12 choices and 13 sources.
Kyle explicitly selected mixes 1, 3, 5, 8, 9 and 11 on 10 October 2026. The existing Quaternius Nature
library is reused in the recommended forest/snow mixes.

All 13 chosen preview URLs loaded and were visually inspected in Chrome.
The five-light gantry, snowy pines/rocks, autumn trees, wooden docks and
full-body yeti are visible. The concrete barrier is listed by its creator
at 284 triangles. Rare lift components are supported by named publisher
items: Chairlift Tower, Cable Span 12 m and Chairlift Chair 4 Seat.

Open work is explicit: the Lantern Tower is a proposed donor assembly;
the avalanche gallery needs a 10 m clear road and structural adaptation;
required yeti gestures are unverified. Cute Monsters' head-only yeti was
excluded. Ultimate Monsters' full-body yeti and THE CUBE GUY's CC-BY yeti
are separate alternatives. No rig, clip, runtime performance or finished
visual acceptance is claimed from a preview.

No source archive/model download, import, runtime change, asset
construction or art round took place. Existing library provenance stays
intact. External images are used only by the review document.

## Catalog preservation and reviewed assertion change

All 24 existing catalog records compare deeply equal with pre-card base `125a6115`.
Append 13 source records. Kyle's dated choice marks 11 as selected; the
kart pack and THE CUBE GUY yeti remain unselected candidates. Every new
record retains `downloaded: false` and `sha256: null`. The Nature record
references its already selected catalog entry and says no new download
occurred. Selection approves donors only; adaptations and gaps stay open.

The Director approved the extra hook in
`tools/test-tanker-valve-source.mjs`: update only the aggregate
non-Factory catalog digest because new candidates enter that aggregate.

- Old: `1fc90b2e83474de392bd1825bed6407e879b712170d3e9fdbae8020951c8bd1e`
- New: `cb98201e7daf38aaea010a2b18a34deaa661d0416c4403f92daf427974226b0f`

The equality assertion remains strict. Its candidate scope, all other
assertions and the separate Factory provenance pin remain unchanged.

## Checks

Source-page/license and preview checks completed on 10 October 2026.
Catalog preservation and unique-ID assertions passed during append.
Local HTML layout inspection was blocked by the browser URL policy
because file URLs are disallowed; no workaround was attempted. The sheet
has not been visually accepted as a rendered local page.

Focused checks passed: art-sourcing; tanker-valve-source (30/30);
diff --check. Static HTML checks passed for 12 choices, six groups,
13 registered previews, unique/resolving anchors, LF text and no scripts
or iframes. A first scratch check caught trailing class-name spaces in
six cards; those spaces were removed and the same assertion passed.
All existing records and the exact single-digest test diff were rechecked.

Final selection rerun passed: art-sourcing, tanker-valve-source (30/30),
static sheet/catalog preservation checks and diff --check.
Required gates passed on selected-source candidate `388956a1`:
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 8/8 suites,
  zero failures, 93.39 s (core 510/0; race integrity 605 checks).
- `npm run build`: passed, 296 modules, 1.34 s; existing chunk-size
  warnings only. No source or code changes followed these gates.
No race state or replay code changed; no new race fingerprint is claimed
by this sourcing-only card.

## Removed

None. This card replaces no runtime asset or existing source record.

