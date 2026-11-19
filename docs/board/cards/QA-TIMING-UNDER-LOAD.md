# QA-TIMING-UNDER-LOAD

From the night check of 7 November 2026 on b9f58aed. `test-town-core` failed in the full tier and passed alone; `soak-town.mjs` finished all ten 30-year towns correctly, then failed its last check (a day for 10,000 people and 5,000 buildings took 60.85 ms against 30 ms) while Codex art jobs and Blender ran beside it. Both are timing limits measured on a busy laptop. Make each timing limit measure only what it means to (for example the best of several runs, or a limit that scales with a measured reference), without loosening what a quiet laptop must reach. Claude reviews any changed assertion.

## Seen again, 13 November 2026 (Claude)

`tools/test-town-people.mjs` failed the same kind of limit in a full tier on the Everburn go-live branch: its day for 10,000 people took 37.49 ms against 30 ms while other work ran, and 29.38 ms alone. Include this suite in the fix. Alone it has almost no room, so measure it the same way as the others.
