# QA-FRAME-ENVIRONMENT

Kyle decided that the 1 s construction limit covers the actual world build, not the fresh browser's first-race file load. The official frame validator now requires finite, nonnegative worldBuildMs strictly below 1000 ms. Delivered p95 stays at most 18.5 ms. Full-load constructionMs must still be finite and nonnegative; above 5000 ms produces a warning rather than a failed frame verdict.

The original scenario records the measured world build and full load, retains failed native or validation packets, and records slow-load warnings. Missing or blank world-build dataset text cannot become a false zero through numeric conversion. The full check keeps the actual p95, world-build and full-load numbers and warnings in its reports. Before starting its frame child it prints and logs the laptop-panel-off reminder: Win+P, Second screen only. It does not change display settings or certify that the display was switched.

Changed assertions: Kyle explicitly replaced constructionMs <1000 with worldBuildMs <1000. The existing rejection fixture now rejects worldBuildMs at exactly 1000. Additive cases cover both qualities, 999.999 ms world builds, full loads at exactly 5000 and just above it, missing and malformed metrics, warning retention and the pre-child reminder. All original p95, eight-car, 120-frame, native quality, visible/headed, memory-only storage, running countdown, isolation, admission and same-leaf reuse assertions remain unchanged. No race, save, renderer, quality, timer, sample, display or refresh-rate behavior changed.

Checks: source preparation only. Existing focused, nearby, build and actual frame measurements are UNRUN pending Root's independent review and scheduling. No executed RED or GREEN is claimed. PERF-HIGH-NIGHT remains open; this tools correction does not claim a High or Performance frame pass.

## Removed

Removed the cold file load from the 1 s failure operand. Full loading remains measured and reported with Kyle's separate 5 s warning. No old timing, quality, quiet-laptop, isolation or save guard was removed. No assets, dependencies, storage keys or files outside the granted tools and this note changed.
