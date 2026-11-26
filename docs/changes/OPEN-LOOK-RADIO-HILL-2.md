# OPEN-LOOK-RADIO-HILL-2: Radio Hill at night and from the road

**Changed** (`src/world/open/looks/radio-hill-look.js`, behind `story-choices`). The lamps' glow draw now carries three shapes, each with a size in metres and a least size in pixels: the red lamp (at least 16 px; it covers the sky a little, so it stays red at dusk), the mast's far outline (strokes at least 1.5 px wide, one for each 2.5 m, seen beyond 320 m) and Hetty's rag, a new strip of faded red cloth under the head (at least 4.5 px from far off; dark at night). At night the hut's light fills the doorway and the window and falls in a widening amber wedge out of the door and under the window. Still 11 draws (12 allowed); 27,644 to 28,092 triangles a stage. Layout, spots and solids unchanged.

**From how far.** The far view on the East Road is 1,318 m off, the nearest the open road comes within 1,400 m. There the lamp reads at night as a red light about 16 px across, and at dusk as a red-orange point on the mast; by day the mast is a dark stroke about 14 px tall with the red rag at its top.

**Pictures.** Claude took and looked at a baseline and five rounds on the laptop (`look-radio-hill`, Performance, memory-only); sheet `docs/board/looks/open-radio-hill/round-2.jpg`. New pictures: `camp-far-day` and `camp-night-door`.

**Checks** on `1b7cf3ebf` plus this change: rule 23's set (core, test-replays, test-combat-replays, test-world-composition, test-radio-hill-look) 5 passed, 0 failed; `npm run build` passed; test-board and test-repo-hygiene passed.

**Changed assertions** in `tools/test-radio-hill-look.mjs`: the scenario's list of views and of named pictures gains `far-day` / `camp-far-day` and `night-door` (added pictures, nothing loosened); new assertions for the lamp's least size, the outline, the rag and the night colour.

**Removed.** `docs/board/looks/open-radio-hill/round-1.jpg` (replaced by `round-2.jpg`); the old glow sizes.
