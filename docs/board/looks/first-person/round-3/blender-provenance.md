# GFX-02 round 3: Blender evidence

This is the final round of the initial three-round card. Rounds 1 and 2 are
unchanged. Independent game captures, scores and measured frame cost still
decide whether the family meets the beta threshold.

## Changes from round 2

- Shortened the wrist-to-palm section, rounded fingertips and thumb ends,
  added thumb-root volume and blended finger-joint weights. Jax and Cinder
  use full gloves; the other crews retain exposed fingerless tips.
- Added asymmetric cloth folds within the existing sleeve topology. Hems
  now use the crew's cloth color and a thinner uneven roll, replacing the
  bright uniform cuff ring.
- Shaped the wrench shank into a narrower waist and throat. Added small worn
  steel edges around the jaw, with more subdued ochre paint.
- Added localized rubbed highlights on RPG collar edges, rivets and sight
  fittings. The recessed bore remains dark; no emissive material or global
  brightness correction is used.
- Retained the shared hand/tool grasp path during reload and repair. The
  support fingers open for retrieval/release and hold during insertion.
  Wrist rotation uses the adjusted anatomical pivot while keeping the grasp
  point fixed on the prop.
- Material UV height now spans each contiguous part's own island. Added
  authored 1024-square normal maps for restrained cloth/leather surface detail
  within the existing texture sets. These use the same single material slot.

## Rebuild and budget

```powershell
blender -b --python-exit-code 1 --python tools/blender/first-person-gear.py -- --root REPO --round 3
```

The complete export and **23 matched Blender views** took **82.98 seconds**.
The manifest records hashes for every source, GLB, texture and render, plus
camera settings and action times. All eight sources and both tool sources
remain in the repository. Original reference sheets remain untouched.

Hands use **3,656 triangles**, except Tusk at **3,536**. The RPG uses **3,276**
and the wrench **2,260**. Hidden cap geometry on thin leather wraps was removed
to pay for hand detail and localized tool highlights. The largest combination
is **6,932 triangles and three material draws**, below the 8,000/three limit.
Each asset has one 1024-square color, surface and normal texture set.

`node tools/test-first-person-gear.mjs`: **26/26 passed** after the final export.
`git diff --check`: passed. No test or runtime source was changed by the asset
builder. The camera and 23-sample contract remain the same as round 2.

## Inspection and limits

The builder inspected Rook idle, wrench, both reload phases, Odessa's later
repair pose, and Cinder's full glove. The shorter glove, cloth hems, tool
contours and grip contact are visible in those samples. This inspection is
not an independent art score. Further differences in glove tailoring, hand
anatomy, wear placement and small fittings may remain in actual game views;
the Director's review records them as polish work where needed.

No browser, broad gate, frame-cost run, live-port access or save access was
performed by the asset builder. All Blender work stopped after this freeze
so the runtime builder could measure the actual game without render load.
