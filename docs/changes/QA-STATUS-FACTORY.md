# QA-STATUS-FACTORY

Status: merged after passing source acceptance. No runtime, save, release or push change.

## Settled design before code

Read declarative source text only. Extend the existing feature catalog reader for its one actual FAC-04 manifest spread. Read authored manifest flag, state and releaseOrder literals from src/circuits, sorted by releaseOrder; helper modules are skipped. Unknown catalog expressions, malformed manifest metadata and duplicate manifest identities stay visible as issues. Do not import or execute game modules or storage.

Use the existing read-only parseBoard for current card identities. It does not expose branch, so read only the raw branch scalar in each recognized card block locally. Exact current board branch association wins; unmatched legacy branches retain the existing letter-number fallback. Ambiguous branch assignments report an issue and remain unknown. Do not change branch-removal safety, live/skip-lane checks, source/full-tier evidence, sizes, network behavior or output destinations.

## Tests and review

Add meaningful cases to the existing test-build-status suite before implementation: actual manifest spread with data-only poison source and helper skip; unsupported/malformed inputs; exact Leanboard P4/Deep/QA branch associations, authoritative mapping and ambiguity. The original source produced a real RED: 301 checks and three failing scenarios (manifest table, exact current branch mapping, ambiguous branch issue). Before implementation, tighten only the newly added malformed-manifest issue matcher to the explicit Circuit manifest category; the old generic catalog error contained CIRCUIT_MANIFESTS and otherwise falsely satisfied its broad matcher. Every old assertion stays exact. The existing pure suite then passed: 308 checks, 0 failing scenarios. The Director cleared the unchanged implementation and old assertions. Synced accepted integration a273615e before freezing. Source freeze and canonical plan go to the Director before one nearby lane/build/review; no canonical or build until granted.

## Removed

Replace the literal-only catalog limitation and name-only card association. Keep the legacy fallback for unmapped branches. No dependency, framework, test harness, game asset or save behavior is added or removed.

## Accepted source

Exact ebf1713e79e8c39fc8260013d675c8750103fb43: original nearby lane17/17, zero failures/unrun, exit0, jobs4,279866.0348ms; all result rows passed. Build exit0,Vite1.02s, measured1958.2478ms. Pure status fixtures308 checks/0 failures and one independent exact-source review CLEAR. Conflict-free merge, no rerun. The status reader parses only authored text; no game code or storage executes. Whole card completed, status-tool released; Root cleans only its newly created lane after drain. No native/full/release/push pass claimed.
