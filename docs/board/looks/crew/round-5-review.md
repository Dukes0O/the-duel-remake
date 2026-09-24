# Crew round 5: Rook material study

Rook only changed. [Matched sheet](round-5.jpg) shows the approved reference, Blender and private memory-only game captures in both qualities, front, side and back. The seven other GLBs were unchanged. This round tried smaller source crops inside material UV cells; it does not approve beta.

| Rook score | Likeness | Readability | Grounding | Scene | Cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| Round 3 | 3 | 3 | 3 | 4 | 4 |
| Round 4 | 2 | 2 | 3 | 3 | 4 |
| Round 5 | 2 | 2 | 3 | 2 | 4 |

The smaller crops still map photographed height bands around the limbs. They add pale gloves, a pale leg and boot, and stripes on the sleeves and trousers. The reference detail is copied without its garment shape. Two trials did not improve likeness, so SPEC 0.3 requires another method: a connected anatomical core and deliberately painted material regions, with the clothing shape built in geometry.

Five largest differences: (1) pale source background on leg, boot and glove; (2) horizontal sleeve and trouser bands; (3) vest geometry remains flat and narrow; (4) face texture sits on a generic rounded head; (5) boot and knee silhouettes remain bulky. The browser scenario passed with 88 captures, 12 near draws and 66,568 near triangles. High 120-frame baseline/crowd p95 were 16.8/16.8 ms; the sample included isolated longer frames, so no worst-case claim is made. No runtime warnings or errors were reported.
