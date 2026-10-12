# QA-LANE-NATIVE-RELIEF

DEEP-ART-SRC catalog changes select test-rustwall-p2-relief.mjs, which actually invokes native Blender exports/renders at107–120,174 and404. The26-suite canonical plan is honest; it is deferred intact rather than filtered or reported green. Existing FAC-03 night-only list missed this proven native suite.

Own only tools/run-tests.mjs NIGHT_ONLY_SUITES, the corresponding existing selector assertion in tools/test-test-runner.mjs, and docs/changes/QA-LANE-NATIVE-RELIEF.md. Add only this proven suite to lane/changed night exclusion; default/full coverage and every renderer assertion remain exact. Explain the additive expected-list change. No broader native detection, new harness, machinery, weak tolerance or source/render recipe change. One nearby lane/build and required code review before merge. Do not run native Blender during daytime. Thirty minutes maximum one problem; preserve observed omission and move on if blocked.
