# PERF-GROUND-ROWS

The short board entry controls current state, ownership, dependencies and locks.

Claude, 24 October. FIX-GRASS-GROUND put grass on the drawn ground and made some
course builds slower: best of five, whole `buildEnvironment`, old to new, ms:
(after the road rule) Tremblant Woods 1136 to 1320, Tremblant Snow 1170 to 1390, High Country
663 to 812, Pacific Canyon 607 to 687, Alpine Serpent 666 to 747, Midnight Chase 1045 to 1152,
Summit Run 1733 to 1935, Ridge Rally 771 to 833, Azure Riviera 699 to 752, Red Mesa 541 to 585,
Timberline Rush 896 to 952, Cloudbreak 772 to 819. One more cost is the nearest-road query per
placed grass piece (about 15,000 per course): a cached cell grid of "road within 8 m" would skip it.

**Goal:** bring every course within 5% of its old build time without changing a
single height. Ideas: keep the drawn ground rows as typed arrays (one Float32Array
per row) instead of an object per vertex; one lookup per terrain cell, cached,
instead of one per grass piece; build the quad index only for the columns scenery
uses. Terrain geometry and ground lookups must stay bit-identical (compare against
the code before the change: terrain and far-terrain geometry hashes plus lookup
values at fixed points on every course). No signatures should move.
