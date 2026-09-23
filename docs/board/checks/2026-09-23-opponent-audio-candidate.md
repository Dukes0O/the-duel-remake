# Opponent and audio release check — 23 September 2026

Candidate source: integration commit `2c6583d`, followed only by this check
record, the play-test note, and the frame-scenario viewport correction. The
Release Manager must repeat the full tier on the final exact commit before
installing the live build.

| Gate | Result |
| --- | --- |
| Combined merge tier | 168/168 passed in 232.68 seconds; 162 unchanged replay fingerprints |
| Full code tier on `2c6583d` | 176/176 passed in 454.33 seconds, including campaign shards and three-opponent completions |
| Combat balance | Passed: Easy/Medium/Hard wins 8/6/4 of 10; largest measured UFO gain 1.57 seconds; CPU hits 1/2/9 |
| Production build and private smoke | Passed; four High/Performance menu and race screenshots, zero warnings or errors; existing large render-chunk advisory |
| Full browser matrix | 19/19 passed; memory-only saves, zero warnings or errors; archived at `C:\Users\kyleb\AppData\Local\Temp\duel-browser-suite-enaNsz` |
| Spatial audio on combined source | Ten analyzer targets passed on 841-frame, seven-stem race; 14/14 timed cues within 30 ms; engine/rev correlation 0.982; no clipping or clicks |
| Frame pacing | 1280 × 720, 30 settling + 120 measured intervals: High and Performance both p50/p95 16.7/16.8 ms, zero >33 ms; same p95 as previous live release |
| Art intake | Passed; direction board present, six planned textures/flipbooks still absent |
| Save budget | Passed: 3.45 MB of 4.00 MB modeled origin budget; oversized career migration preserves data |

The browser matrix's earlier 1280 × 800 High frame sample had six intervals
over 33 ms at p95 33.3 ms. A repeat at that size returned to p95 16.8 ms
with one long interval. The fixed 1280 × 720 comparison had no long interval.
These are short runs on one RTX A1000 laptop; long-session pacing remains a
play-test point.

Feature switches reviewed: `roadside-destruction` stays `beta` and needs
Experimental; `career-backup` stays `dev`. The normal menu starts one rival.
The three-opponent combat effects and remaining new weapon/on-foot sounds
are future cards, so the released runtime makes no claim that they are done.
