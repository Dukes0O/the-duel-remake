# QA-AUDIO-UNDER-LOAD

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Sol), small; Claude's until 27 November 2026. In the night of 26 November 2026, `p4-audio` (a native sample frame 128 frames out, segment 7)
and `skyline-audio` (integrated loudness -12.8 LUFS against an advisory -16) failed in the browser stage, which runs
four jobs at once; both passed rerun alone on the same code. Find what the load changes (a dropped or doubled audio
callback under four browsers, the loudness measure on a clipped capture) and make each check say plainly when its
capture was disturbed, rather than fail as a sound fault. Never widen a tolerance. Checks: each scenario five times
alone and once inside a four-job browser stage.

## Claude answers

27 November 2026, round 1 verdict: not merged. The diagnosis is right in principle, but P4 and Skyline each reported disturbed captures on all five solo runs, with no clean capture. Both passed alone on 26 November on the same game code. A check that cannot pass on a quiet laptop would add two nightly failures. Recheck with no other heavy jobs; correct detector false alarms without changing sound tolerances or loudness limits, and keep damaged captures failing. Round 2 needs five clean solo passes per scenario and an exact diagnosis for any four-job disturbance.

## Capture decision and checks
Keep all sound assertions and limits. Reject disturbed captures with a rerun-alone diagnosis, never a pass.
P4 uses exact native callback positions and its existing independent sample witness.
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
