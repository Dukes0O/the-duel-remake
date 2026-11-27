# QA-AUDIO-UNDER-LOAD - round 4
Not ready: Skyline passed 5/5 solos; P4 passed 0/5. All ten ran; four-job stage skipped under the explicit P4 stop rule.
Added delivered-worklet/source-frame-0 handshakes before stimuli and P4 segment starts; reports retain the first raw witness blocks.
Skyline trims arbitrary silence before frame 0; missing/repeated/changed samples still fail. Removed its NaN follow-on gap diagnosis.
All ten launches counted zero competing heavy jobs; private ports, lane-local profiles/temp, memory-only saves, zero browser warnings/errors.
Skyline clock-note counts: 1, 0, 147, 0, 0; all witnesses intact. Run 1 label -128 frames once; run 3 labels +384 frames.
P4 startup label offsets: +24448, +23424, +19968, +18688, +20608 frames. Clock notes per stem: 8094, 8117, 8073, 8086, 8067.
P4 samples/frame-0 handshakes are intact; cue windows are misaligned. Light PCM exists at offset-adjusted time; nominal windows are silent.
Unchanged P4 error: Native race cue absent from recorded interface stem: light. Automatic rerun-alone diagnosis remains unmet; no new method tried.
Checked round 4 tool edits over 3e02c850d: focused 30 pass. Lane command --tier lane --changed --since 3e02c850d --jobs 2: 21 pass, 1 environment failure, 4 unstarted.
Hygiene rerun unchanged: 165 checks pass with lane-local TEMP and GIT_CEILING_DIRECTORIES to prevent inherited ignored Git listings; remaining 4 suites pass at jobs 2.
Replays: 306 checks/34 cases; combat: 12/4 encounters; world: 65/32 events, all pass. arena-shove and first-person-polish left to night.
Build passed (existing import/chunk warnings). Assertions: arbitrary pre-frame-0 silence accepted as directed; no sound limit or damaged fixture loosened.
Board: review/waiting_on claude. STATUS refreshed; read-only audit, other lane inspections skipped; external cockpit sync omitted under lane-only instruction.
**Removed:** fixed two-callback startup cutoff and NaN follow-on diagnostic; generated evidence/build/temp recycled. Game code, saves, race fingerprints and sound cues unchanged.
