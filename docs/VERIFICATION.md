# Remake verification

Checked 19 September 2026 UTC in the local Windows workspace.

## Automated checks

- `npm test`: 292 gameplay assertions, nine progression check groups, and 13 App integration assertions passed.
- Includes 60 six-stage campaigns across seeds, base cars, difficulties and 30/60/144 simulated display frames per second. All completed with matching outcomes across frame rates. The route-aware demo driver won 360 of 360 stages.
- Six extra runs using the actually unlocked Aurora GTR also completed at all three frame rates in Casual and Pro, earning credits.
- Regression coverage includes responsive drift, throttle-only road departure, dirt without damage, swept static and vehicle collision, pushing the rival, CPU braking for cut-ins, harmless late CPU rear contact, boundary and coastal water recovery, flock collection/deduplication, five-hit catastrophe, directional damage, stage selection, upgrade physics and upgrade-scoped best times.
- The final terrain audit adds 1,130 checks across six scenes and two seeds: station foundations match yard height, coastal towers/trees remain above water, water recovery works, and sampled mountain rims stay at least 1.98 m below terrain.
- Profile checks cover corrupt/blocked storage, persistent win deduplication, win-only rewards, affordability, level caps, car unlocks, and fixed upgrade snapshots during races.
- `npm run build` passes. The renderer/Three.js chunk is approximately 694 KB minified / 186 KB gzip. Vite reports its existing large-chunk advisory.
- `git diff --check` is clean apart from routine LF/CRLF notices.

## Browser checks

Separate hidden development and production tabs were used. The user's race tab was not used for test interactions. Production testing used port 5175 so test credits did not change the profile on port 5174.

An actual production demo race completed and awarded 750 credits. Engine and tire upgrades each cost 350 credits, leaving 50. The displayed top speed increased from 201 to 208 mph. Reloading preserved both upgrade levels and the remaining credits; unaffordable next purchases were disabled. The garage, locked Aurora entry, and scene selector were visually inspected at the browser's 1280 by 720 viewport. The prior mobile layout check predates this garage expansion; no new mobile driving mode is claimed.

Alpine, coast and harbor scenes were inspected in the browser, including meadow terrain, alpha-cutout vegetation, unobstructed roads, detailed buildings and the driver. The fifth major hit still reported catastrophic game over. A boundary test reset safely with zero major crashes; a flock hit restored nitro from 0.1 to 1.0 and recorded one collected flock. No shader errors appeared in the final scene checks. The development log retained a temporary syntax error from an earlier edit that was immediately corrected; the rebuilt production page loaded without errors.

Steady samples reported 60 FPS on this host. Representative scenes ranged from roughly 1.7 to 2.2 million rendered triangles and 250 to 340 draws, including shadows. First loads and scene changes were slower while assets and shaders initialized. These are point samples, not a broad hardware benchmark.

AudioContext ran and all 11 runtime audio assets decoded. The revised high-speed mix passed 1,200 variable driving frames and 660 steady full-speed mock frames, including mute, pause, and fallback. Waveform checks verified the steadier high-rev loop. Browser decoding and mathematical checks do not constitute an independent listening review.

## Assets and limits

Generated scene reference, granite, pine bough, meadow turf and verge grass assets are used in the game or its modeling references. Full prompts are in `IMAGE_PROMPTS.md`. Licensed car, scanned ground, HDR and real audio sources are documented in the asset credits.

All three player choices share the licensed concept-car body, with distinct tuning and trim. Aurora adds carbon aero and gold wheels. The rival also uses the detailed body; traffic and loading fallbacks use procedural geometry. Driver and directional damage geometry were checked on the actual GLB, including exact reset and independent instances.

No new runtime dependencies were installed. Three.js and Web Audio supply this iteration. Blender can import the GLB and reference assets; no Blender render is claimed. Handling remains arcade drift, visual deformation is not soft-body physics, and explosion debris uses lightweight effects.
