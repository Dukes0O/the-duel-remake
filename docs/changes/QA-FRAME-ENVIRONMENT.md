# QA-FRAME-ENVIRONMENT

Kyle decided that the 1 s construction limit covers the actual world build, not the fresh browser's first-race file load. The official frame validator now requires finite, nonnegative worldBuildMs strictly below 1000 ms. Delivered p95 stays at most 18.5 ms. Full-load constructionMs must still be finite and nonnegative; above 5000 ms produces a warning rather than a failed frame verdict.

The original scenario records the measured world build and full load, retains failed native or validation packets, and records slow-load warnings. Missing or blank world-build dataset text cannot become a false zero through numeric conversion. The full check keeps the actual p95, world-build and full-load numbers and warnings in its reports. Before starting its frame child it prints and logs the laptop-panel-off reminder: Win+P, Second screen only. It does not change display settings or certify that the display was switched.

Changed assertions: Kyle explicitly replaced constructionMs <1000 with worldBuildMs <1000. The existing rejection fixture now rejects worldBuildMs at exactly 1000. Additive cases cover both qualities, 999.999 ms world builds, full loads at exactly 5000 and just above it, missing and malformed metrics, warning retention and the pre-child reminder. All original p95, eight-car, 120-frame, native quality, visible/headed, memory-only storage, running countdown, isolation, admission and same-leaf reuse assertions remain unchanged. No race, save, renderer, quality, timer, sample, display or refresh-rate behavior changed.

Checks: source preparation only. Existing focused, nearby, build and actual frame measurements are UNRUN pending Root's independent review and scheduling. No executed RED or GREEN is claimed. PERF-HIGH-NIGHT remains open; this tools correction does not claim a High or Performance frame pass.

## Removed

Removed the cold file load from the 1 s failure operand. Full loading remains measured and reported with Kyle's separate 5 s warning. No old timing, quality, quiet-laptop, isolation or save guard was removed. No assets, dependencies, storage keys or files outside the granted tools and this note changed.

## Failed-frame reporting correction

Root's independent review found a real reporting fault in 7df8e78c: the full check rejected a nonzero frame child before reading its actual packet. A genuine High p95 failure therefore lost the new numeric summaries and cold-load warnings from the morning report. The validator also threw at High p95 before collecting load warnings.

Frame diagnostics are now read before the existing child-exit failure. Only actual finite, nonnegative measured values from the named quality rows are copied, with a positive p95. Validation remains mandatory; nonzero exits, invalid packets and failed frame limits still fail. A missing or malformed packet records its report error while preserving the original child stderr and failure. Load warnings are collected before the frame-limit verdict, so the scenario's retained failed packet still describes an actual load over 5 s.

Additive existing fixtures cover High 33.3 ms with a real 610 ms world build and 5300 ms full load, both nonzero child and failed validation, missing/malformed packets without invented High values, and the scenario's retained warnings on a genuine failed frame predicate. Every previous assertion remains unchanged. Source correction only; no checks or actual frames ran. Root's confirmation and execution remain pending.

Removed: early exit-before-diagnostics and warning-after-success ordering. No failure, frame limit, admission or storage guard was removed.


## Integrated verification

Independent review found and corrected a real report fault: failed frame child exits originally bypassed metric collection. Root confirmed aea43b4c preserves actual numbers/warnings even when High fails, while keeping nonzero exits, malformed packets and strict timing failures failed with original errors intact. Existing focused43/43 passed; one unfiltered canonical lane21/21/notRun0/jobs4 in235729.1157ms; build746ms, exit0. No actual frame or display run was performed, and PERF-HIGH-NIGHT stays open. Conflict-free merge consumes this evidence without another gate. Own lane/used receipts are cleared; no release or push.
