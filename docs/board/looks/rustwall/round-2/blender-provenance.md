# Rustwall Blender round 2

This round responds to the independent round-1 review at `f3479b5`. Round-1 assets remain recoverable at `bb31758`; all its evidence files are unchanged.

The wash now has a broad eroded base, narrower uneven summit and continuous texture coordinates across its height. One 1024-square map supplies coherent mineral strata rather than a separate checker patch on every face. It remains one 144-triangle prototype inside the original collision envelope.

The wall now uses directional rust flows, large paint patches and dark worn seams. Front-facing plate UVs align texture height with world height. Hulks lean and compress individually; short scrap profiles replace continuous shelf platforms. Banners have folded depth, irregular torn hems and reverse faces. The gate has stronger winch mounts and braces. Grounded scrap adds restrained base detail outside the opening.

Hidden end caps on narrow structural beams were removed to fund visible detail. Wall geometry is now 51,020 triangles in 13 draws, leaving 8,980 triangles under the limit. Wash remains 25,776 triangles at the observed 179 banks and one instanced draw. The gate, core, humans and material-set allocation retain their approved dimensions and limits.

Command: `blender -b --python-exit-code 1 --python tools/blender/rustwall.py -- --root . --round 2`.

The final complete export and six matched renders took 32.28 seconds. Exact source, asset, reference and render hashes and camera poses are in `blender-manifest.json`. Front, depth and wash images were inspected. `node tools/test-rustwall-assets.mjs` passes 8/8 on the final assets; no assertion changed.

This is a frozen second art round, not a visual approval. Repetition in the wash, simple car profiles, the broad plate pattern and remaining simplified props need judgment from actual game captures. Browser frame cost and independent fidelity scoring are separate follow-up evidence.
