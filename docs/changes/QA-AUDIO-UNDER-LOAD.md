# QA-AUDIO-UNDER-LOAD
Cause: callback scheduling breaks P4's native frame clock; Skyline's main-thread recorder receives repeated/corrupt buffers under load.
Evidence: night P4 callbacks jump 7327104 to 7327360; four-job Skyline witness breaks at source frame 162816 after 1024 intact samples.
P4 now reports exact callback/frame or witness damage as "capture disturbed, rerun alone"; no gap is filled or tolerated.
Skyline adds an independent recorder-only witness and missed-lift evidence; measures loudness before classifying damage.
The four-job Skyline measured -12.8 LUFS/-7.57 dBTP with two blowoffs; advisory loudness was never its failing assertion.
The historical Skyline failing predicate was not retained; the new report names wiring/level facts as well as capture evidence.
Solo: P4 5/5 disturbed; Skyline 5/5 disturbed (one fifth run with company replaced by a solo run); no clean browser pass claimed.
Four jobs: P4 and Skyline disturbed; arsenal-core-audio and arsenal-wave1-audio passed; zero browser warnings/errors, memory-only saves.
Focused checks: 20 passed, including clean-capture rejection of clipping, missing/doubled/close blowoffs, inaudible/surviving turbo and failed isolation.
Lane: 26/26 passed, including importing suites; replay fingerprints (306 checks), combat replays and world signatures (65 checks) unchanged. Build passed.
Commit: this change's final working tree on base 54fab2ed0; no game source or replay fixtures changed. Two long suites deferred by the lane runner.
Assertions: capture damage now gets its own failing diagnosis; all existing clean-capture sound assertions and limits remain. Claude review owed.
Sound cues: none added. Solo disturbance remains a laptop capture limitation; rerunning alone did not clear it today.
**Removed:** ambiguous capture-as-sound-fault reporting; no game behavior, sound measurement or tolerance removed.
