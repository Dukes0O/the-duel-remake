# QA-LANE-NATIVE-RELIEF: defer native relief work to night

## Design settled before code

Add only `tools/test-rustwall-p2-relief.mjs` to the existing explicit
`NIGHT_ONLY_SUITES` list. Lane and changed-only selection defer this native
suite; full and default selection retain it. No selection algorithm changes.

The existing suite invokes Blender for a relief probe at lines 107-120,
round-four exports and source renders at line 174, and a painted-steel export
at line 404. These are real native child workloads, not pure helper imports.
The DEEP-ART-SRC 26-suite plan that exposed this omission remains an observed,
deferred plan; this change does not grant it a passing result.

Extend the existing selector expectation by this one proven suite. Keep its
existence, lane exclusion, changed-only equivalence, pure-suite inclusion,
replay/world guards, full/default equality and complete full inclusion checks.
The exact omitted-count assertion still derives from the explicit expected
list; its description changes from five to six. No renderer assertions,
tolerances, recipes or runtime data change. No native workload runs by day.

## Verification

Pending one canonical nearby lane run with jobs 4, production build and
independent source review on the frozen candidate. Root owns integration
metadata, review, merge and cleanup. No native, browser, frame, balance or full
run is claimed here.

## Removed

Removed accidental daytime dispatch of the proven native relief suite.
Nothing is removed from the full/default inventory or the renderer suite.
