# QA-AUDIO-UNDER-LOAD - round 3
Stopped under the round 3 rule: Skyline solo runs 1-4 passed; run 5 was disturbed at startup. P4 solos/four-job stage not run.
P4 uses full interval witness identity for continuity; disagreeing callback/chunk labels are clock notes, not sound faults.
Skyline now records through P4's shared AudioWorklet; its witness remains on a separate input from the measured stereo.
Claude's 27 November rule 18 approval and both method decisions are repeated on the card; sound checks/limits unchanged.
All five launches counted zero competing heavy jobs; private ports, memory-only saves, no browser warnings/errors.
Skyline clock notes by run: 0, 0, 0, 146, 0. Run 4 labels stay +256 frames ahead while witness samples stay intact.
Run 5: two silent startup blocks; callback 2 has no first-sample identity; callback 3 starts at source 1792, intact for 2048 samples.
Raw startup witness was not retained; missing samples versus excess startup silence cannot be proved from this report. Both blowoffs present.
Next proposal only: explicit worklet/source startup handshake, retain witness prefix, start stimulus after source frame 0 is confirmed.
Focused: 28 passed; all existing damaged fixtures still fail; added clean wrong-label and disturbed wrong-label/witness cases.
Lane on round 3 working tree over 15024b2b5: all 26 passed, 0 failed; arena-shove/first-person-polish deferred to night. Build passed (existing import/chunk warnings).
Race fingerprints/world signatures unchanged by code; no game source or sound cues added. Detailed measurements are on the card.
Board: review, waiting on Claude; no push/merge. STATUS refreshed locally; external cockpit sync omitted to respect this lane-only instruction.
**Removed:** Skyline ScriptProcessor recorder/splitter/merger; clock labels as P4 continuity verdicts. Evidence/build output recycled after recording.
