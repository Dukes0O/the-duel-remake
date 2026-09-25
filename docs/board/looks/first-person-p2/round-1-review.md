# First-person Rook P2, round 1 review

**Verdict:** The sewn sleeve construction is sound, but the actual game view still falls short of the four-point visual target. The production hands remain selected.

| Reviewer | Likeness | Readability | Grounding | Consistency | Frame |
| --- | ---: | ---: | ---: | ---: | --- |
| Independent Crew | 3 | 4 | 3 | 3 | Unmeasured |
| Director | 3 | 4 | 3 | 3 | Unmeasured |

I viewed the immutable [round 1 sheet](round-1.jpg), native High idle and reload, and the P1 round 3 sheet. The wider outer elbow is visible in High and Performance, especially on the left arm. It improves the previous narrow tube, while the long forearm still tapers smoothly toward the wrist and the pinch reads regular. The reference has a heavier, less even cloth mass. The same glove, wraps, skin and tool treatment remains easy to read across actions and qualities.

The five largest remaining visual gaps are:

1. The left sleeve is still a long tapered form. Its new broad elbow does not yet give the irregular cut-and-sewn cloth silhouette seen in the reference.
2. Teal weave is enlarged and high contrast at game scale. It dominates the new panel shape instead of reading as worn fabric.
3. Beige wraps form pale even bands, with little visible overlap or varied thickness.
4. The exposed right wrist has a bright, assembled-looking skin-to-wrap-to-sleeve transition.
5. The gloves retain broad smooth surfaces and bulbous finger shapes; their dark leather panels and articulation are weak.

The scored candidate is `art-build/first-person-p2/candidate/hands/rook.glb`, SHA-256 `22c7a44255c8bb63c64a40e809e2270472eb2db4f47417d95bd621b0a140f028`. Its P2 source JSON SHA-256 is `f978431ef47a641ad3c1c4bf47eec8ca3b38b7afbc812f889715f5822de2cc26`. The capture records observation commit `7ddd4560de200b29e752f71585ae210872f1adab`; private port 18557 produced 28 images with zero reported issues, exactly one candidate fetch in each quality, and unchanged eight production hand and RPG/wrench hashes. The sheet labels Blender source-module views separately from game-course views.

The independent construction tests pass 8/8: welded connected cloth, no interior sleeve holes or overfull seam edges, broad radial controls against a fresh P1 export, frozen hand/UV/skin/rig/clip/socket data, and byte-identical embedded color, surface and normal maps when P1 and P2 use the same paint input. These are structural results, not a likeness score. Continuous grip and penetration across the 14 production poses remain unsupported by evidence. This round has no frame-cost measurement; the earlier P1 idle frame score does not transfer to P2.

**Next method:** Use the same captured camera to judge a genuinely less regular cloth contour and smaller-scale weave before another scored round. Keep the fixed hand and tool identities, then measure contact and frame cost separately before considering runtime promotion.
