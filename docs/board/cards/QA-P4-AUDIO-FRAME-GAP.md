# QA-P4-AUDIO-FRAME-GAP

The `p4-audio` browser scenario sometimes records a short repeated slice of sound (a frame gap in the capture), so its gap check fails with no game change. It did this on 15 October and again in the 28 October full check. Rule 3: an unreliable check; it never holds merges.

Done when: the cause is named (capture timing on a busy laptop, or a real audio stall a player could hear) within rule 4's 30 minutes. If it is the capture, make the recorder measure the gap the same way on every run without loosening the limit; if it is real, open a game card. Owned files: `tools/scenarios/p4-audio.mjs` and its change note.

## Claude answers

QA-AUDIO-SWEEP, 28 November 2026, `edad56dd0`: **cured; ready to close** under the sweep criteria. Unchanged `p4-audio` runs `p4-1/2/4` passed alone with complete ten-segment, three-lap captures and intact sample witnesses despite 20/8/4 mix clock notes. Their race and replay fingerprints are unchanged across runs, and replay differences are empty. The existing witness tests reject genuine missing/repeated samples, and `test-audio-under-load` passes all 31 checks. Run `p4-3` passed with another heavy job and is extra evidence only; no historical failed recording is called clean, and no limit changed.
