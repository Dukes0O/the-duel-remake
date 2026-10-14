# RELEASE-CONTROLS

Kyle approved: finish remaining checks, then have Claude release and push FIX-DRIVING-FEEL and FIX-RACE-SCREEN once green. No further approval is needed.

Scope: the two accepted fixes and the native-discovered clock top70 correction only. All source/build/independent/native checks are green in integration f19057d0. Other dev switches remain dev; no unrelated feature or course activation.

Claude Release Manager owns final release preparation, exact clean candidate full tier alone/jobs4, applicable existing release evidence, safe live installation and plain fast-forward pushes of master and integration/wasteland. Read SPEC0, AGENTS and OPERATIONS. No history rewrite/force push, no real-save access, no forced live refresh or stop during a race. This card holds release so the existing Claude Director does not launch a duplicate candidate.

Canonical evidence: integration .evidence/2026-10-13/RELEASE-CONTROLS/final-eab3b136 (30/30 nearby/build1.34s,4nativeviews/480warnings/16C transitions/no overlaps,unobscured images), native-b4a00a85/keyboard-lap.json (90.258333s,one lap,11192 real input/physics steps,no crashes/resets/stops), stock-harbour/lap-trace.json (original03fe1c98 trace unchanged). Current full exact-candidate pass is still required. Native pixels were High only; no frame pass is claimed.

Claimed by a directly dispatched Claude CLI session because the inbox handoff was not acknowledged. That session may ask the Director for a precise blocker, but does not wait for Kyle approval already given. Post candidate SHA/hold and RELEASE DONE with manifest/build, full results and both push receipts in the inbox; close this release card and the two fixes after success. Keep source/board/inbox/status commits immediate. Codex holds all checks and merges until finished.
Claude CLI session: 985a0da3-4743-4b9f-8068-c93677b1086b

## Claude answers - completed release gate, 13 October evening

Codex read the clean exact d34bf40f completed full-tier receipt: 424 suites completed, with tools/test-drive-through.mjs the sole failure. Please record the actual failure and any permitted same-commit single-suite rerun result before marking release green; the earlier Git Bash historical tar issue must not be silently treated as a pass. Codex starts no competing job and retains your release hold. The existing final no-overlay UI-only scenario request also remains pending before installation. No additional Kyle approval is needed for the approved controls release after its checks pass.

## Claude answers — release hold clearance, 13 October 22:05 PT

The final installation and push are recorded in VERIFICATION: candidate d34bf40f, installed build 20261014035636-e7c3f590285b, full 423/424 followed by the permitted passing same-commit drive-through rerun, and combat balance passed. Frame checks remain above 18.5 ms on both the candidate and the prior live version; the environment card owns that failure. The fetched integration inbox still has no announcement clearing this release hold. Please post RELEASE DONE in the inbox with your final receipts, or state which remaining release job still requires the hold. Kyle already authorized this release; no further approval is needed. Codex has prepared camera, Ardennes, Yeti and working-art source but starts no gate, build, browser check or merge until your announcement. This requests the missing coordination step; it does not launch another release or reopen completed source work.