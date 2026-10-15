# Helicopter accessories: round 1

Status: CHANGES REQUIRED. Claude's actual image-only review after quota reset accepts the pad and pump, but requires a clearer hook shape and metal flap latch. This is the accessories' first round; Kestrel One's three closed rounds remain separate.

The sheet contains six actual Blender imports of the current runtime GLBs: hook front/oblique, pad top/edge, pump front/side. These are asset views, with no game-renderer or frame claim. No model was rebuilt, exported, repositioned or repainted for this review.

Source: db6f04d18f86b14a09e9b04394e8567e8b7710b1. The existing recipe ran once with CPU Cycles, 48 samples and four threads: exit 0 in 37643.3489 ms. The serial compositor passed and produced 156226 bytes, SHA256 ac9f430bf139076117da400c4c025b16d7649a8ca0da905f0cbe03b2a0246e06. All six frames are included in full, resized without cropping or retouching.

Measured dimensions from actual imported meshes: hook 0.210 x 0.400 x 0.050 m, pad 14.000 x 0.121 x 14.000 m, pump 1.239 x 1.870 x 0.922 m. The source GLB SHA256 values before and after all six renders agree exactly. The export's original node, origin, triangle and texture guards also passed on import.

The second Codex lead viewed the whole sheet and full-size hook-oblique, pad-edge and pump-front frames. All objects are fully framed; the orange latch and attachment eye, H/ring and thin pad edge, and meter/hose/nozzle/base are visible. This checks the packet's usefulness, not Claude's art scores or acceptance.

## Claude verdict

The actual reviewer was claude-opus-4-8[1m], called once after the quota reset with only this JPEG and a short visual brief. Tools were disabled. The call completed successfully in 31271.5544 ms. The larger proposed packet was blocked before execution; repository instructions, card documents and manifests were not sent in the successful review.

| Prop | Shape | Material | Readability | Verdict |
|---|---:|---:|---:|---|
| Cargo hook | 3 | 2 | 2 | Changes required |
| Helipad | 5 | 4 | 5 | Accepted; no required change |
| Aviation pump | 4 | 4 | 5 | Accepted; no required change |

Claude saw the orange/copper rod, the nearly circular C-body, the yellow pad ring and the pump's actual 0000.0 display and JET A label. The hook reads as a split ring or carabiner. Required fixes: match the latch to the grey hook metal, make it a hinged flat spring flap seated against the hook tip, and define an open lifting-hook body and tapered tip. Optional pad-ring/access-panel polish was explicitly not required and is not added.

Round 2 changes only the hook. Keep the pad and pump bytes exact. The 0.4 m top-origin fit, triangle/texture limits and three-round cap remain. No native game placement, loading, timing or physics result is inferred from these pictures.

Raw verdict and successful image-only transcript: .evidence/2026-10-14/HELI-ART-SRC/claude-image-only-round1-79769594/.

Raw frames/manifest: .qa-dist/heli-accessories-round-1/. Receipts: .evidence/2026-10-14/HELI-ART-SRC/review-db6f04d1/. The lane gate and build are pending. Keep raw frames until Claude has judged the round; recycle them after the verdict is recorded.

## Removed

None. This review changes no runtime asset. The superseded helicopter download plan is cancelled in the source packet; its licensed originals and provenance remain.
