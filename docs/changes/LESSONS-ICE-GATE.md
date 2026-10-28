# LESSONS-ICE-GATE

Status: built; ready for handoff. Kind: UI. Flag: `driving-lessons`.

## Design

Keep WATCH FOR ICE before the ice, but place it on the inside verge, opposite
the course's outside braking boards. Use the sign material's opaque default.
Keep the existing engine-curve gate: lesson 3 says "Opens later: waiting for
the new engines", cannot start, and lesson 4 follows lesson 2 while it is off.
The board, host and access tests already cover this gate; no duplicate logic.

## Checks

Passed `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 30 passed,
0 failed, 0 not run (312.70 s). Replay fingerprints: 225 unchanged checks;
combat replays: 12 unchanged checks; world composition: 47 checks passed.
The lesson board/host suite passed all 14 checks, including engine-curve off.

Passed `npm run build` (540 modules; existing chunk-size/dynamic-import warnings).
Passed the memory-only private scenarios `drive-lesson-run` and
`drive-lessons-view-2`, with zero console warnings/errors. The latter's
look-only capture now starts 26 m earlier so the inside-verge sign fits in view;
game code and assertions stayed unchanged after the passing lane/build.

Picture: `.evidence/2026-10-25/LESSONS-ICE-GATE/drive-lessons-view-2/lesson-4-look-sign-and-cone.png`.
Independent reviewer: no defects in sign placement/material or the existing gate.
Changed assertions: none. No save or reward changes.

Tool notes: the first QA build needed sandbox access to the shared Vite cache;
one browser attempt was stopped for the laptop's two-job limit. Reused its
completed QA bundle and the passing lesson 1 result. No extra suites run.
Cockpit sync: 0 tasks changed; LESSONS-ICE-GATE has no linked task (Director
follow-up). Session status refreshed. No merge or push.

## Removed

Removed the ice sign's transparent material override and its placement among
the outside course boards. No assets, saves or race rules changed.
Recycled scratch builds and consumed captures; retained the requested sign picture.
