# PERF-GROUND-ROWS

The short board entry controls current state, ownership, dependencies and locks.

Claude, 24 October. FIX-GRASS-GROUND put grass on the drawn ground and made some
course builds slower: best of five, whole `buildEnvironment`, old to new, ms:
Tremblant Woods 1142 to 1351, Tremblant Snow 1279 to 1538, Alpine Serpent 646 to 743,
Timberline Rush 814 to 911, High Country 633 to 706, Ridge Rally 735 to 814,
Pacific Canyon 551 to 586, Harbor Highlands 835 to 885, Midnight Chase 949 to 1013,
Cloudbreak 802 to 854, Red Mesa 528 to 565. Summit Run 1800 to 1875.

**Goal:** bring every course within 5% of its old build time without changing a
single height. Ideas: keep the drawn ground rows as typed arrays (one Float32Array
per row) instead of an object per vertex; one lookup per terrain cell, cached,
instead of one per grass piece; build the quad index only for the columns scenery
uses. Terrain geometry and ground lookups must stay bit-identical (compare against
the code before the change: terrain and far-terrain geometry hashes plus lookup
values at fixed points on every course). No signatures should move.
