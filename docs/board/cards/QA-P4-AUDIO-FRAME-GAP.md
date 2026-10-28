# QA-P4-AUDIO-FRAME-GAP

The `p4-audio` browser scenario sometimes records a short repeated slice of sound (a frame gap in the capture), so its gap check fails with no game change. It did this on 15 October and again in the 28 October full check. Rule 3: an unreliable check; it never holds merges.

Done when: the cause is named (capture timing on a busy laptop, or a real audio stall a player could hear) within rule 4's 30 minutes. If it is the capture, make the recorder measure the gap the same way on every run without loosening the limit; if it is real, open a game card. Owned files: `tools/scenarios/p4-audio.mjs` and its change note.