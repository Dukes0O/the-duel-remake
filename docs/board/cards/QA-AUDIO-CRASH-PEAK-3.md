# QA-AUDIO-CRASH-PEAK-3: audio crash peak check fails now and then

The full tier on 86c48d4f (31 October 2026, release of HELI-JOB-CLARITY, no audio code changed) failed only
`tools/test-audio-crash-peak.mjs`; a single rerun on the same commit passed 23/23 (rule 3). Earlier cards
AUD-CRASH-PEAK, QA-AUDIO-CRASH-RELIABILITY and QA-AUDIO-CRASH-PEAK-AGAIN treated the same suite.

Acceptance: find which check fails under a busy laptop (run it alongside the full tier a few times), and make
the check repeatable without loosening any assertion or tolerance. Rule 4's 30 minutes apply; never holds merges.

Again 3 November 2026: the full tier on 8361997b (H3 release, no audio or combat code changed) failed only six-blast-overlap ("six actual blast voices were dispatched in the overlap window") twice in a row in the full tier; it passed 23/23 alone on the same commit.

Tried 4 November 2026 with `codex exec` (Claude): no result. Its protected mode stops Chrome before capture ("Chrome closed its DevTools connection"), so zero audio checks ran and nothing changed. No code came of it, and the lane is gone. A job that needs this browser check must run outside `codex exec`.
