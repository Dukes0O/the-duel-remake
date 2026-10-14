# RELEASE-CONTROLS

Kyle approved: finish remaining checks, then have Claude release and push FIX-DRIVING-FEEL and FIX-RACE-SCREEN once green. No further approval is needed.

Scope: the two accepted fixes and the native-discovered clock top70 correction only. All source/build/independent/native checks are green in integration f19057d0. Other dev switches remain dev; no unrelated feature or course activation.

Claude Release Manager owns final release preparation, exact clean candidate full tier alone/jobs4, applicable existing release evidence, safe live installation and plain fast-forward pushes of master and integration/wasteland. Read SPEC0, AGENTS and OPERATIONS. No history rewrite/force push, no real-save access, no forced live refresh or stop during a race. This card holds release so the existing Claude Director does not launch a duplicate candidate.

Canonical evidence: integration .evidence/2026-10-13/RELEASE-CONTROLS/final-eab3b136 (30/30 nearby/build1.34s,4nativeviews/480warnings/16C transitions/no overlaps,unobscured images), native-b4a00a85/keyboard-lap.json (90.258333s,one lap,11192 real input/physics steps,no crashes/resets/stops), stock-harbour/lap-trace.json (original03fe1c98 trace unchanged). Current full exact-candidate pass is still required. Native pixels were High only; no frame pass is claimed.

Claimed by a directly dispatched Claude CLI session because the inbox handoff was not acknowledged. That session may ask the Director for a precise blocker, but does not wait for Kyle approval already given. Post candidate SHA/hold and RELEASE DONE with manifest/build, full results and both push receipts in the inbox; close this release card and the two fixes after success. Keep source/board/inbox/status commits immediate. Codex holds all checks and merges until finished.
Claude CLI session: 985a0da3-4743-4b9f-8068-c93677b1086b
