# QA-SUMMIT-WARMUP-EXCEPTION

Actual candidate65fbac29 Summit headed packet records TWO uncaught TypeErrors reading currentProgram.isReady inside Three compileAsync; timing numbers alone do not pass the browser harness. Evidence: retained perf-high-night .evidence/2026-10-15/PERF-HIGH-NIGHT/summit-snow-after-65fbac29/{report.json,frame-pacing.json}; actual bundled three.module-Bs9qarRg.js:3824:26787 maps to node_modules/three/src/renderers/WebGLRenderer.js:1048-1051. Existing call is src/render-warmup.js:22-25 via render3d.js:893-897. This proves the polling site, NOT which material or lifetime caused it. Harness discarded CDP timestamp/context, so neither quality can be assigned the exceptions.

Original Summit baseline6384ec48 harness passed with issues[]/warnings[]; Harbour65fb candidate also issues[]/warnings[]. Keep all original reports. No generated source, tolerance or issue filtering changes.

No lane or code is claimed. Proposed source ownership, once admitted after current locks/cleanup, is render-warmup plus its existing tests; any render3d hook requires busy-game-files handback. First investigate bounded actual lifecycle/reproduce with existing private memory-only harness, then meaningful regression for real cause and smallest default-preserving fix. Never ignore/relabel exceptions, vendor-patch Three, add dependencies, relax original frame/native guards or create new harness. Independent review and nearby/jobs4/build required. Quiet only if timing; max30min for one failure then note/otherwork. Claude must decide how this candidate fault affects PERF carry-forward; no acceptance inferred. No release/push/live/saves.

## Removed

Nothing; no implementation or job started.
