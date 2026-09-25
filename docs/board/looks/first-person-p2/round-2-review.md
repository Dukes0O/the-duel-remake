# First-person Rook P2, round 2 review

**Verdict:** The finer cloth paint is calmer at game scale, but the hand and sleeve construction still falls short of the four-point likeness target. Keep this cloth treatment as the baseline for a different construction pass. The production hands remain selected.

| Reviewer | Likeness | Readability | Grounding | Consistency | Frame |
| --- | ---: | ---: | ---: | ---: | --- |
| Independent Crew | 3 | 4 | 3 | 3 | Unmeasured |
| Director | 3 | 4 | 3 | 3 | Unmeasured |

I viewed the immutable [round 2 sheet](round-2.jpg), native High idle and reload, and native Performance repair against round 1 and the RPG reference. The teal cloth no longer has the oversized, high-contrast weave from round 1. Both qualities show the same quieter material and the broader elbow shape survives. Material scale improved; the long, smoothly tapering sleeve and evenly spaced wrist layers still read as assembled tubes rather than cut and gathered clothing. The Blender column is a source-module view; the High and Performance columns show the real game course, so lighting is not a direct match.

The five largest remaining visual gaps are:

1. The left forearm remains long and smoothly tapered. Its broad elbow lacks the irregular folds and overlapping sewn surfaces in the RPG reference.
2. Beige wraps form rigid, pale bands with regular spacing and little visible layering.
3. The right wrist retains a bright, partly exposed skin transition between teal sleeve, wrap and glove. Static exported inspection attributes this to deliberately exposed and partially overlapped skin, not a broken mesh or wrong UV tag.
4. Both gloves are smooth and bulbous, with weak finger articulation and few visible leather seams.
5. Tool fittings and worn surfaces remain simplified next to the reference, especially around the grips.

The scored candidate is `art-build/first-person-p2/candidate/hands/rook.glb`, SHA-256 `d567b345bb780f20cca0c07f8e6bd56cb3414f8060c8f1fb6f9e62b15fe7e779`. P2 source JSON SHA-256 is `e4ae800f83f40d0b73ae8c1213402c4d543eec5c3076ae6a5f9dbd928b3a5d62`. Selected base paint SHA-256 is `785c80bb03380c6454607e5fba687b633e47642cac0a1b58d7176afdf9a64b3b`; selected round 2 cloth source SHA-256 is `e4a286ebc7a4b07f0645c63f0eb0a66db93fd9bfcec0f213a0671f5e56bca3ac`. Capture observation commit `316c66a9adc90255c59345810ef7ec78051185eb`, private port 48503, produced 28 screenshots with zero reported issues, one candidate swap per quality, and unchanged production hand and RPG/wrench hashes.

The independent P2 test suite passed 10/10. It verifies the exported sleeve shape and protected anatomy, actual cloth-face sampling of the selected atlas, unchanged pixels outside the cloth region across all three maps, exact geometry/UV/skin preservation from round 1, and quarter-strength normal slopes derived from the same cloth source. Those checks prove the material and construction contract; they do not establish likeness four. Continuous tool contact and penetration across the production action sequence remain unsupported. No P2 frame-cost measurement was made.

**Next method:** Change the visible sleeve and cuff construction, including its gathered silhouette and layered wrist contact. Retain the quieter cloth material. Further paint tuning alone is unlikely to resolve the two-round likeness plateau.
