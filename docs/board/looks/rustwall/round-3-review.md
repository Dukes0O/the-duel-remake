# Rustwall round 3: Director review

Final initial assets and browser observation: `8889a4a`. Reviewed the full
contact sheet and full-size game wash and depth views against the reference
and earlier rounds. All required images are present and readable.

Accept the initial three-round card for development integration after its
final independent checks, lane tier and build. Keep `hidden-road` in dev.
The asset family has not reached the required beta fidelity.

| Item | Resemblance | Readability | Grounding | Scene fit | Frame cost |
| --- | --- | --- | --- | --- | --- |
| Wall, gate and salvage detail | 3 | 3 | 4 | 3 | 4, measured scope only |
| Wash rock scenery | 2 | 3 | 2 | 3 | 4, measured scope only |

The bank orientations and eroded faces break some repetition, but large facets
and repeated ledges remain obvious. Exposed wedges of underlying terrain at
the bank feet make the contact less convincing. The wall gains machinery and
edge detail without yet matching the reference's material richness or density.
Both resemblance scores are unchanged from round 2: one stagnant round each.

## Five priorities for the next polish card

1. Replace the visibly repeated rock columns with a more natural continuous
   bank treatment, using authored variation and a suitable rock reference.
   Preserve the tested collision and ground-support envelopes.
2. Resolve the exposed terrain wedges and inconsistent foot contact along
   the wash. A material seam or intersecting facet should not resemble a gap.
3. Improve the wall's material response at the actual game exposure. Steel,
   corroded edges, soot and crushed car surfaces still merge into dark panels
   with bright frame outlines. Avoid another uniform noise-only texture pass.
4. Add denser and more varied architectural detail around the gate and towers,
   with convincing salvage contact and cable/support connections. Preserve
   the physical dimensions, opening and geometry budget.
5. Review a short continuous approach and gate motion when EGG-03 exists.
   Stills cannot establish motion readability, invitation pacing or effects.

## Cost and evidence

Private port 32153, memory-only storage, 20 retained game images, zero browser
warnings or errors. Visible-pixel checks and all six route/quality placement
checks pass. Original failed round-1 images remain retained and documented.

Wall: 53,634 triangles and 13 material draws. Wash: 144 triangles per bank,
25,776 triangles for the observed 179 banks, one instanced draw. Human scale,
gate clearance and all-route support remain covered by structural checks.

Each of the four comparisons retains 120 ordered RAF, CPU and count samples.
RAF p95 baseline/loaded pairs are 18.1/18.2, 18.2/18.2, 18.3/18.1 and
18.2/18.2 ms; no interval exceeds 33 ms. CPU p95 pairs are 2.7/2.8, 2.5/2.4,
2.0/2.1 and 1.7/1.8 ms. All current measured ratios are within ten percent.

Retain round 2's 2.5/2.8 ms High wash result. The loaded p95 is still 2.8 ms;
the different baseline does not prove an optimization from 12% to 3.7%.
The results support the limit within the recorded views, not all machines or
the worst race. The model comparison uses the widened ground in both cases;
the separate ground change adds 832 prepared-patch triangles. CPU submission
is not GPU time. No beta or complete performance claim is granted.
