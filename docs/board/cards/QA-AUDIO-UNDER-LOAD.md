# QA-AUDIO-UNDER-LOAD

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Sol), small; Claude's until 27 November 2026. In the night of 26 November 2026, `p4-audio` (a native sample frame 128 frames out, segment 7)
and `skyline-audio` (integrated loudness -12.8 LUFS against an advisory -16) failed in the browser stage, which runs
four jobs at once; both passed rerun alone on the same code. Find what the load changes (a dropped or doubled audio
callback under four browsers, the loudness measure on a clipped capture) and make each check say plainly when its
capture was disturbed, rather than fail as a sound fault. Never widen a tolerance. Checks: each scenario five times
alone and once inside a four-job browser stage.

## Claude answers

27 November 2026, round 3 verdict and round 4 method (Claude): a clear improvement. Skyline passed 4 of 5 alone through the worklet; run 4's wrong labels were correctly noted without failing, and run 5 failed honestly as a disturbed startup. Not merged: P4 has not run in the browser since its continuity rule changed.

Round 4 decision: confirm the worklet is running, then capture witness source frame 0 before starting Skyline's throttle timeline or P4's segments. Retain the first witness blocks. Trim any silence before frame 0; missing or repeated samples after frame 0 still fail. Keep all sound checks and limits unchanged. Count heavy jobs before each launch and wait for zero; run all five solos per scenario even after failures, then the four-job stage once. At least 4 of 5 per scenario must pass; record exact disturbed-capture reasons. If P4 falls below 4 of 5, stop with the reasons and do not try another idea.

27 November 2026, round 2 verdict and round 3 method (Claude, rule 18 assertion review): good work, not merged yet. Quiet runs prove unchanged P4 also fails alone; its 26 November pass was luck. Its failing clock labels disagree with an intact independent witness. Skyline loses real 128-sample blocks even alone because ScriptProcessor records on the busy main thread.

1. P4 continuity is decided by the independent sample witness, not callback frame labels. When every sample is present once and in order across the chunk and its neighbours, a disagreeing label is a reported clock note and does not fail. Missing, repeated or changed witness samples still fail as "capture disturbed, rerun alone". This is not a loosening: the label is not the sound, and the witness is stronger proof. Keep every damaged-capture fixture failing; add intact-witness/wrong-label (clean) and damaged-witness/wrong-label (disturbed) fixtures.
2. Skyline records off the main thread with AudioWorklet, reusing P4's recorderWorkletSource and capture-witness helpers, with the witness on its own channel. Remove ScriptProcessor in the same change. Sound checks and limits stay exactly as they are.
3. Count run-tests, run-browser-scenarios, vite build and Blender processes before each run; wait for zero. Five solo runs per scenario, then the named four-job stage once. If either still cannot pass clean alone, stop and record measurements and the next method; no fourth idea this round.

27 November 2026, round 1 verdict: not merged. The diagnosis is right in principle, but P4 and Skyline each reported disturbed captures on all five solo runs, with no clean capture. Both passed alone on 26 November on the same game code. A check that cannot pass on a quiet laptop would add two nightly failures. Recheck with no other heavy jobs; correct detector false alarms without changing sound tolerances or loudness limits, and keep damaged captures failing. Round 2 needs five clean solo passes per scenario and an exact diagnosis for any four-job disturbance.

## Capture decision and checks
Keep all sound assertions and limits. Reject disturbed captures with a rerun-alone diagnosis, never a pass.
P4 uses its independent sample witness for continuity; disagreeing callback labels are clock notes when the witness is intact.
Skyline carries that witness on a separate recorder channel (never in the measured stereo mix);
sample identity proves repeats/gaps. Late delivery alone is not damage. Missed throttle lifts identify an invalid stimulus.
Run `tools/test-audio-under-load.mjs`, importing suites, the lane tier and build;
run each audio scenario five times alone, then both with arsenal-core-audio and arsenal-wave1-audio at four jobs.
Claude review owed: only capture classification changes; clean-capture sound assertions and tolerances are unchanged.

## Round 2 measurements - 27 November 2026

Not ready to merge. Clean solo acceptance remains unmet; stopped under Kyle's round 2 instruction.
Before every browser launch, the outermost node/Blender heavy-job count was zero; P4 mid-run checks found only its own job (or zero after it finished). No holds were open. All reports used private ports and memory-only saves, with zero browser warnings/errors.

| Run, alone | Result and exact diagnosis |
| --- | --- |
| Unchanged P4, sandbox launch | Tool failure: Chrome DevTools connection closed; no capture verdict. Reran with normal laptop browser access. |
| Unchanged P4, normal access | Disturbed: mix callback frame 2,427,776 at chunk offset 256; left/right/witness each 128 frames. Old report omitted the expected frame and raw callback packet. |
| Unchanged Skyline | Disturbed: gaps/repeats at callbacks 2, 4, 6, 8, 10, 12, 133; mismatches at 3, 5, 7, 9, 11. Callback 2 source frame 24,576, expected 4,096; callback 3 matches 640 samples then changes. Blowoffs at 2 and 4 s. |
| Boundary/startup fixes, Skyline | Disturbed: mismatches at callbacks 2, 4, 6, 8, 10, 12; gaps/repeats at 2, 3, 5, 7, 9, 11, 13. Callback 2 starts at source frame 28,672, expected 4,096, and changes after 640 samples. No startup silence; blowoffs at 2 and 4 s. |
| Boundary fix, P4 | Disturbed: 16/16 callbacks; mix callback frame 584,576 at offset 640, expected 584,704. Full 128-frame inputs. |
| Menu-ready Skyline | Disturbed: callback 43 source frame 88,192, expected 88,064; callback 114 source frame 233,728, expected 233,600. Every individual buffer matched its witness. No startup silence; blowoffs at 2.021333 and 4 s. |
| P4 with raw witness diagnosis | Disturbed: segment 1, all three stems repeat frame 1,233,024 at offset 128, expected 1,233,152; 16/16 callbacks, full inputs. Disputed block's independent witness is intact: source frame 212,992, all 2,048 samples match. Concatenating all four neighboring chunks also matches exactly across all three stems: source frame 208,896, all 8,192 samples. |

Waiting for menu readiness removed Skyline's initial half-second overwrite burst in that run, but not later source gaps. Awaiting cue decoding alone did not remove it. Playback timestamps never decide Skyline's sample continuity. Startup trimming and cue-clock lift evidence did not excuse any measured damaged capture. P4's failure is not a short boundary chunk: it is a native clock-label inconsistency inside a full block, with intact witness samples in the retained case. Its timestamp check cannot be assumed to prove damaged samples.

Round 1's raw output was already removed, so its ten individual failures cannot be reassigned to a cause after the fact. Today's quiet runs rule out competing heavy jobs, 16-callback boundary counts, pre-source silence and missed lifts as the sole explanation. The lower-level browser/audio clock cause remains unresolved. No sound tolerance, loudness limit or existing failing fixture was loosened. The added valid fixtures cover partial boundaries, startup silence and a lift row straddling the cue clock boundary. Claude's assertion review is still owed.

No five-clean-pass claim; four-job stage not run because clean solo acceptance failed. Follow-up needs a decision on P4's native clock labels versus its intact sample witness and a recorder that preserves Skyline samples on this laptop. Raw round 2 evidence is removed after this verdict is recorded.

## Round 3 measurements - 27 November 2026

Stopped under the round 3 rule. Skyline passed four solo runs but did not deliver five clean runs. No fourth method was tried. P4 solo runs and the four-job stage were not run after Skyline's fifth run failed. Each of the five launches counted zero outermost Node/Blender heavy jobs immediately before starting; the inbox had no holds. Every run used private ports and memory-only saves, with zero browser warnings/errors.

P4 now decides continuity from the independent witness across the retained interval and its chunks; callback and chunk frame labels that disagree are retained as clock notes. Missing/changed/repeated witness samples, absent callbacks and short inputs still fail. Skyline uses the shared recorderWorkletSource with stereo on input 0 and the witness alone on input 1; its ScriptProcessor recorder, splitter and merger are removed. All sound checks and limits remain unchanged.

| Run, alone | Result | Clock notes | Integrated LUFS / true peak dBTP |
| --- | --- | --- | --- |
| Skyline 1 | PASS, intact witness | 0 | -13.10 / -8.72 |
| Skyline 2 | PASS, intact witness | 0 | -13.03 / -8.67 |
| Skyline 3 | PASS, intact witness | 0 | -12.99 / -9.39 |
| Skyline 4 | PASS, intact witness | 146 chunk labels: callbacks 1..146 stay 256 frames ahead of the first block's progression; first expected 6,144, got 6,400; last expected 303,104, got 303,360 | -13.01 / -9.05 |
| Skyline 5 | FAIL: capture disturbed, rerun alone | 0 | -13.08 / -9.33 |

Skyline 5's callbacks 0 and 1 each contain 2,048 startup frames and no measured samples. Callback 2 reports 2,048 frames, no trimmed startup, and "first measured sample has no source identity". Callback 3 is internally intact, starts at source frame 1,792 and checks all 2,048 samples; callback 4 starts at 3,840. The report also emits an undefined-identity follow-on gap diagnostic (expected NaN). Both blowoffs occurred; the sound-level checks were not the failure. Raw witness samples are not retained by Skyline, so this report alone does not prove whether callback 2 is startup silence followed by intact samples or a damaged block. No clean verdict is claimed for it.

Next method for Claude to decide: add an explicit worklet/source startup handshake, retain the startup witness prefix for diagnosis, and begin the measured stimulus only after source frame 0 is confirmed. Prove every sample after that boundary in order; do not allow a fixed number of startup callbacks to decide validity. This is a proposal only, not implemented in this round. P4's revised method still needs its five solo measurements, followed by the four-job stage once both scenarios meet solo acceptance.

Round 3 focused fixtures: all 28 pass, including every existing damaged-capture case and new wrong-label/intact-witness and wrong-label/damaged-witness cases. Round 3 check results are in the change note. No game code, sound limits, race rules or world signatures changed; no sound cue was added. Generated evidence is removed after recording these verdicts.

## Round 4 measurements - 27 November 2026

Not ready to merge: Skyline passed 5/5 alone; P4 passed 0/5 alone. All ten requested solos ran. The four-job stage was not started under the explicit P4-below-4/5 stop rule. No new method was started after the failed acceptance.

The recorder first waits for a delivered worklet block, then starts the witness and verifies source frame 0 before starting the stimulus. P4 repeats the handshake for each segment and verifies three complete source blocks. Reports retain the actual first witness blocks, including leading silence. Skyline trims any number of silent startup blocks; missing, repeated or changed witness samples after frame 0 still fail. No sound assertion or limit changed.

Each of the ten launches counted zero outermost Node/Blender heavy jobs; the inbox had no holds. A mid-run P4 check found only its own heavy job. All ten reports confirm memory-only saves and zero browser warnings/errors. Browser profiles, QA bundles and raw reports stayed in this lane.

| Solo run | Result and exact capture diagnosis | Clock notes | First-segment startup silence (frames) |
| --- | --- | --- | --- |
| Skyline 1 | PASS | 1 | 4,736 |
| Skyline 2 | PASS | 0 | 5,376 |
| Skyline 3 | PASS | 147 | 4,864 |
| Skyline 4 | PASS | 0 | 4,736 |
| Skyline 5 | PASS | 0 | 5,248 |
| P4 1 | FAIL: capture disturbed, rerun alone; startup time map +24,448 frames (0.509333 s) | 8,094 per stem | 2,816 |
| P4 2 | FAIL: capture disturbed, rerun alone; startup time map +23,424 frames (0.488000 s) | 8,117 per stem | 2,176 |
| P4 3 | FAIL: capture disturbed, rerun alone; startup time map +19,968 frames (0.416000 s) | 8,073 per stem | 2,816 |
| P4 4 | FAIL: capture disturbed, rerun alone; startup time map +18,688 frames (0.389333 s) | 8,086 per stem | 2,944 |
| P4 5 | FAIL: capture disturbed, rerun alone; startup time map +20,608 frames (0.429333 s) | 8,067 per stem | 2,432 |
| Four-job stage | NOT RUN: P4 passed fewer than 4/5; stopped as instructed | - | - |

Skyline 1's only clock note is callback 26: label 54,656, expected 54,784. Skyline 3's 147 notes are callbacks 1..147, each +384 frames. Their witnesses are intact. Skyline LUFS / dBTP by run: -13.02 / -9.38, -13.03 / -9.35, -13.04 / -9.34, -13.09 / -9.08, -13.08 / -9.33. Both blowoffs occurred in every run; all five startup reports prove frame 0.

Every P4 run reached a genuine three-lap finish and passed functional replay/lifecycle checks. Each scenario still throws the unchanged sound-check error `Native race cue absent from recorded interface stem: light`. The table's disturbed-capture diagnosis comes from inspecting the retained data; the tool does not yet emit that diagnosis automatically, so this acceptance requirement remains unmet. The independent witnesses prove intact samples, not a correct mapping to absolute cue times. The first pre-source silent block has an unreliable clock label; normalizing later blocks from it misaligns the measurement windows. The light is present in the raw interface PCM at the offset-adjusted time, with silence in the nominal window. No sound check was loosened to pass these recordings.

P4 1: first silent block label 34,176; next block label 60,672, expected 36,224. Source frame 0 is 768 samples into that next block. First-light 0.3-second interface RMS is 0.000000 at the nominal window and 0.101858 after subtracting the startup label offset. All 10 segment handshakes and all retained witnesses pass. Segment startup silence counts: 2816, 2432, 2432, 2432, 2432, 2304, 2304, 2432, 2432, 2432 frames.

P4 2: first silent block label 18,816; next block label 44,288, expected 20,864. Source frame 0 is 128 samples into that next block. First-light 0.3-second interface RMS is 0.000000 at the nominal window and 0.101827 after subtracting the startup label offset. All 10 segment handshakes and all retained witnesses pass. Segment startup silence counts: 2176, 2816, 2432, 2432, 2432, 2944, 2816, 2816, 2944, 2432 frames.

P4 3: first silent block label 19,968; next block label 41,984, expected 22,016. Source frame 0 is 768 samples into that next block. First-light 0.3-second interface RMS is 0.000000 at the nominal window and 0.101858 after subtracting the startup label offset. All 10 segment handshakes and all retained witnesses pass. Segment startup silence counts: 2816, 2176, 2816, 2304, 2432, 2432, 2816, 2432, 2432, 2304 frames.

P4 4: first silent block label 25,472; next block label 46,208, expected 27,520. Source frame 0 is 896 samples into that next block. First-light 0.3-second interface RMS is 0.000000 at the nominal window and 0.101858 after subtracting the startup label offset. All 10 segment handshakes and all retained witnesses pass. Segment startup silence counts: 2944, 2944, 2816, 2432, 2432, 2432, 2432, 2816, 2816, 2432 frames.

P4 5: first silent block label 28,416; next block label 51,072, expected 30,464. Source frame 0 is 384 samples into that next block. First-light 0.3-second interface RMS is 0.000000 at the nominal window and 0.101858 after subtracting the startup label offset. All 10 segment handshakes and all retained witnesses pass. Segment startup silence counts: 2432, 2688, 2816, 2432, 2304, 2432, 2944, 2432, 2304, 2304 frames.

Round 4 focused fixtures: 30 pass, including all damaged-capture cases. Added proof of arbitrary leading silence, retained frame-0 blocks, and missing/repeated/changed samples after frame 0. Final lane/build results are in the change note. Game code, sound limits, race rules and world signatures are unchanged; no sound cue was added. Raw evidence is removed after recording these measurements. Handed back for Claude's review, without a push or merge.
