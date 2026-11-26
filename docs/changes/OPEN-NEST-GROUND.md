# OPEN-NEST-GROUND

- Open Scablands jobs install the Rats’ Nest before the car or walker is placed. The edit mesh draws 18 touched 32 m squares. At their edges the near and coarse meshes split and pass below the cut.
- `src/world/open/site-ground.js` declares each site's radius and depth function and looks up its seeded position. Work orders survive job cleanup. Player `story-choices` stays dev.
- **Removed** the stand’s private cutting loop, 80-square picture patch and per-render vertex sinking. For the OPEN-LOOK-2 join in `tools/open-look-stand.js`, keep this install/restore path and that card’s look rows, shots and imagery.
- Tested game commit `e3fe7afd8` with Node 22.18.0. `test-site-ground` passed at the floor, ramp, rim, gully and hollow, across two near-window positions, overlapping work, job exit, restart and switch off.
- Lane since `5269a4dc5`, four workers, 100 selected. Four laptop suites deferred. Cloud returned 95 passes and one timing failure in 391.16 s. `test-scablands-drawn-feet` passed alone on the same commit (12 river actors 0.187137 ms under load, 0.078471 ms alone, limit 0.15 ms).
- All 46 older suites naming the terrain passed including the solo rerun. Outside the lane, `test-everburn-easy --job hot-delivery` finished 10/10 seeds. `test-lab-classroom-altitude`, `test-town-apprentices`, `test-wasteland-gate-road-look` and `test-rats-nest-look` passed (21 scenario strings parsed).
- Core 804/804, replay 306/306, combat replay 12/12, world composition 65/65. All fingerprints unchanged. `npm run build` passed in 4.75 s.
- `look-rats-nest` timed out at yard entry alongside the lane. Solo Chromium/SwiftShader passed on Performance with memory-only saves, seven pictures, zero warnings or issues. Compared to round 1, the floor, drain and night road are clear of crossing land.
- Handoff docs passed the board check (693) and repository placement. The board’s Windows line-stamp fixtures are due on the laptop.
- **Changed assertions** none. **Sound cues** none.
- **For Claude to run** independent terrain review before merge, memory-only `look-rats-nest` and round-1 comparison on the laptop, `test-course-kit`, `test-earned-cars-ui`, `test-full-check`, `test-medals`, and the merged build. No frame check while player access is off.
