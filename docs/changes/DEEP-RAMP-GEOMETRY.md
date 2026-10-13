# DEEP-RAMP-GEOMETRY

## Settled design before source

buildDeepRamp(course, options) returns readonly geometry or null. It scans the real coast section in ascending 8 m Course sample distance. Each candidate starts 4.5 m beyond the local road half-width. The 6 m strip follows actual ground queried through worldAt/nearest/groundAt; it crosses the real descending sea level and ends at -23. A bounded outward heading fit (0 to 60 degrees toward ascending coast distance) solves the sampled three-dimensional length to 120 m. There is no fabricated location, shorter length, scenery move or Course RNG draw.

The descriptor contains world-space points with cumulative 3D progress, heading, full strip footprint, actual shoreline intersection and both edge crossings, and a 6 by 12 m submerged cove at the bottom. The strip excludes roads, shortcuts, original generated obstacles and actual sea-stack bounds. It rejects dry land returning after the shore on every 1 m cross-strip terrain sample. The cove uses the existing offshoreClearance disk enclosing its entire footprint; its 78 m road recovery rule cannot apply to a boat ramp's intended landward approach. Horizontal obstacle exclusion uses the existing continuous sweep without vertical clipping, using conservative box bounds and explicitly copying the original non-enumerable modelMinY/modelMaxY values. The original records remain unchanged. Clearance covers generated obstacle bounds and sea-stack footprints; decorative foam is water.

Options inject the existing shoreOffset, buildPacificRockLayout and offshoreClearance functions and original obstacle records for bounded obstruction/null acceptance cases. Normal calls use the real exported implementations and SEA_LEVEL=-15. Source is not installed into Course/Game/renderer. DEEP-ZONE owns the later gated journey and scene wiring; this card does not claim a playable coast.

## Acceptance and validation

Actual Pacific Course A/B/C fixtures and the existing collision sweeps check 120 m/-23 geometry, finite readonly metadata, footprint/cove clearance, deterministic independent output, blocked first candidate selection, null shoreline/no-clear cases, original generated features/model metadata, and unchanged Course RNG progression. Acceptance was authored before implementation while all shared check slots were occupied; no executed red is claimed. One focused acceptance run when capacity permits, one original unfiltered nearby lane/build and one independent review. Full/native/browser/balance/frames remain night work.

## Changed assertions

Only the literal tools/test-deep-ramp.mjs|../src/deep/deep-ramp.js is added to test-deep-look's approved import set under the card's explicit grant. Its complete rejection guard and every prior assertion/pair remain intact.

## Removed

Nothing replaced. No test zone, generator copy, new dependency, runtime installation or extra test machinery. Root owns the created lane and its post-merge cleanup.
