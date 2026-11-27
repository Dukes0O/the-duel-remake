# QA-TALK-SCENARIOS
Cause: Dry Pump exhausted its click loop on stale rendered screens; Apprentice moved away before Cinder's queued answer was applied.
Players: neither talk was blocked; these were scripted timing races. Game rules and player text are unchanged.
Fix: poll Dry Pump's matching scene between advances, and apply Apprentice's choice before moving away.
Diagnostics: timeouts report the talk box, button visibility/enabled state, active talk and storyline/routine state.
Validated source: base `ecc4f2298` plus this patch; no game code changed.
Browser: both original failures reproduced with diagnostics, then 2/2 fixed runs and all 11/11 storylines passed (memory-only, zero warnings/errors).
Suites: test-open-threads, test-open-dry-pump, test-open-apprentice-run, test-burned-camp and test-open-somebody-elses-flag passed; the filter also passed test-burned-camp-pen.
Guards: core 804/804, replays 306/306, combat replays 12/12, world composition 65/65; fingerprints unchanged.
Build: npm run build passed (existing chunk-size and ineffective-dynamic-import warnings).
Housekeeping: status snapshot regenerated; board (670 checks), repository placement and git diff checks passed.
Assertions: none loosened; existing story endings, learner, delivery and saved-settlement checks remain.
Sound: no game events added.
**Removed**: the fixed 16-click talk loop; generated browser evidence and build output are removed after review.
