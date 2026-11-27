# QA-AUDIO-UNDER-LOAD - round 2
Stopped: neither scenario passed clean alone; not ready to merge. Five clean runs and the four-job stage were not claimed.
All browser starts had zero competing heavy jobs; no holds. Seven attempts, all memory-only, zero browser warnings/errors.
P4: sandbox DevTools closed; normal baseline callback frame 2427776/offset 256 failed. Fixed run expected 584704, got 584576 (16/16 callbacks).
P4 raw rerun: segment 1, all stems repeat 1233024 at offset 128, expected 1233152; independent witness matches all 2048 samples.
Skyline baseline: 12 witness reasons; fixed run: 13. Menu-ready run: source gaps of 128 at callbacks 43 and 114; both blowoffs present.
Round 1 raw captures are gone; today's quiet failures cannot be blamed solely on other heavy jobs or detector boundary/startup assumptions.
Fixes: validate only retained P4 callback coverage; trim Skyline pre-source silence; use lift cue time; await menu assets and cue decoding.
P4 now retains its existing raw failure packet for callback-clock mismatches too. Detailed run verdicts are on the card.
Focused: 24 passed; all original disturbed and clean-sound rejection cases unchanged. Sound limits and loudness tolerances unchanged; Claude review owed.
Lane on final working tree, base 632a4881b: all 26 passed (5 + corrected board + 20 unrun); two long suites deferred. Temporary null waiting field corrected, no test change.
Build: passed (existing dynamic-import and chunk-size warnings). No game source, race fingerprints or world signatures changed; sound cues: none added.
Remaining cause: native clock labels can disagree with intact P4 samples; Skyline loses real source samples even alone. Lower-level cause unresolved.
Board: review, waiting on Claude. No push or merge. Generated evidence and build output recycled after recording the verdict.
**Removed:** false boundary/startup/lift diagnoses; no sound assertion, game behavior or damaged-capture rejection removed.
