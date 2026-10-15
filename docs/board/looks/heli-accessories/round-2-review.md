# HELI accessories: round 2

Status: ACCEPT. Actual image-only Claude review accepted the corrected hook
and the unchanged pad and pump. This uses two of three accessory rounds;
Kestrel One's separate three closed rounds are unchanged. No further art
correction or optional polish is added.

## Actual verdict

| Prop | Shape | Material | Readability | Verdict |
|---|---:|---:|---:|---|
| Cargo hook | 4 | 4 | 4 | Accepted; no required correction |
| Helipad | 5 | 4 | 5 | Accepted; unchanged |
| Aviation pump | 4 | 4 | 4 | Accepted; unchanged |

Claude identified the attachment eye, open J throat, grey flat hinged flap
seated against the tip, and removal of the orange rod. The oblique image
shows an actual plate latch. The pivot looks slightly thick from the front;
Claude explicitly called that optional and nonblocking. The white H/yellow
ring, thin pad edge, 0000.0 meter, JET A label and pump hose/nozzle/base were
also observed. No native placement or frame performance is inferred.

The single review used claude-opus-4-8[1m], exit 0 in 22710.862 ms, with zero
tool calls. Only this actual JPEG and a short visual brief were sent. No
repository instructions, card, source or manifest were sent. Raw verdict,
receipt and image-only transcript remain under the owned evidence root's
claude-image-only/ directory until the merger consumes them.

## Source and measured output

The reviewed recipe source is 971dbb74. One selected-hook export at CPU four
threads passed in 886.7909 ms. Hook: 1496 triangles, 50440 bytes, actual size
0.221702360 x 0.400000006 x 0.070119821 m; top attachment y=0. Required eye,
swivel, forged_hook, safety_latch and latch_pivot nodes are present. No image
textures. Importing the actual GLB passed the original bounds, part and
texture guards.

Hook SHA256: 13ed385c3849d33e3885685435944fb3ff7c105f34cf1dae2a7e9eddfe0c1f6e.
Accepted pad SHA256 remains e2fba42ee52fa5b1922c825aa7f4fb9f44b22d6ada5da4b63c45d7881276685c;
pump remains d50c46cf94dafeeca9993def01ac344c1b5371fc16612a628554f806dd5757f7.
Both match before and after the hook-only export and six-view import render.

The same six cameras/light/AgX/48-sample CPU-four recipe produced actual
imported-GLB views in 44273.2477 ms, exit 0. All three source hashes before
and after rendering match. The existing serial compositor preserved full
frames and wrote round-2.jpg in 600.0582 ms: 154597 bytes, SHA256
9fc6fd688098bd6826ad86e4e2ccc65a7ba48b8937f0f1da69435d59db18e70d.
The builder viewed the full sheet and confirmed complete framing. Round 1
remained byte-exact through this capture; its consumed record follows.

Raw frames/manifest: .qa-dist/heli-accessories-round-2/.
Receipts: .evidence/2026-10-14/HELI-ART-SRC/round2-971dbb74/.
Fresh final nearby/build follows current integration sync in this lane;
its receipts, rather than the earlier 79769594 greens, certify this change.
Root records the final test result in the integration merge.

## Consumed round 1

The actual first image-only Claude verdict required only the hook correction:
hook shape/material/readability 3/2/2; pad 5/4/5 accepted; pump 4/4/5 accepted.
The old hook looked like a near-circular split ring with an orange/copper rod.
Claude required an open lifting-hook throat, tapered tip and grey flat hinged
flap seated against the tip. The single claude-opus-4-8[1m] image-only call
exited 0 in 31271.5544 ms with no tools. The reviewed recipe was db6f04d1;
the old hook bytes were 0d9b8524390d901aff67d35f945a03a713a0e3bd7709beb1411a39ead157e3df.
The later 79769594 mechanical pass did not certify the R2 change.

Consumed R1 sheet: 156226 bytes, SHA256
ac9f430bf139076117da400c4c025b16d7649a8ca0da905f0cbe03b2a0246e06.
Consumed R1 review note SHA256:
ae9691157fb996dce64315b6064164b6bb163d4f711a59010420ac9d17acec4a.
After verifying those exact hashes and retaining these facts, only our own
used R1 JPEG and note are recycled. Current R2, Kestrel images, licensed
originals and raw actual review proof stay available to the merger.

## Removed

The runtime hook replaces the earlier circular C/ring and orange rod. Their
superseded recipe path and unused orange material were removed in 971dbb74.
The consumed own R1 sheet/note are recycled after the fold above.
No accepted pad/pump geometry, licensed original, donor or helicopter is
changed. No new runtime renderer, source helper or general test machinery.
