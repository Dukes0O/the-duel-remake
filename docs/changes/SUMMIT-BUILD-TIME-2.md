---
task: SUMMIT-BUILD-TIME-2
status: built; official timing pending
player_facing: no
---

# SUMMIT-BUILD-TIME-2

## Design

Keep every drawn value, triangle and scene signature exact. The Node profile
puts far terrain at about 283 ms and near terrain at 191 ms in a 1,043 ms
snow-enabled world build. Use sized Float32 buffers for the rectangular far
mesh instead of growing JavaScript arrays and copying them afterwards. Reuse
near-ribbon edge points when closing the continuous ground. Build the grouped
index buffer directly, with Three's unchanged Uint16/Uint32 threshold. No finish kit,
art, collision, race, save or snow-rule changes. Existing summit-run switch.

Checks: unchanged world-composition signatures and exact ground-row checks;
Summit ground-gap regression; lane tier (jobs 4), production build and one
independent review. Compare Node build timers with real approved kits and
snow, using a canvas/texture stub and no graphics or storage. These are local
comparisons only; Claude owns official High/Performance timing. No frame run.

## Evidence

Checked source: `b8daac8c`; the final commit adds this evidence and STATUS only.

- Lane gate: **45 passed, 0 failed, 0 not run**, jobs 4, 691.22 s.
  Includes all 47 complete-scene/immutable-feature checks across 20 events;
  both Summit signatures remain exact. Ground rows: 35,076 exact comparisons.
  World-build exactness: 156,726 checks. Summit ground-gap/headroom regression
  and real High/LOD kit placement checks pass.
- Replay fingerprints: 225 checks, 25 cases, 23 events, nine categories,
  three frame rates and three repeats; all pins unchanged. Combat: 12 checks.
- Production build: **PASS**, 845 ms (Vite), 549 modules. PowerShell with
  System32 first on PATH. `npm.ps1` was blocked by execution policy; used
  `npm.cmd run build`. The sandbox blocked Vite's config cache through the
  integration dependency junction; the same command passed with cache access.
  Existing chunk-size and ineffective-dynamic-import warnings only.
- Independent code review: **CLEAR**, no defects or follow-up fixes.
- Simple Node timer, fresh process per build: **894.7 -> 862.9 ms** with no
  competing heavy jobs. Earlier, with two other heavy roots: 1,214.8 ->
  1,021.6 ms. Load variation is large; these comparisons do not certify the
  official one-second limit in High and Performance.
- Timer recipe: Node 22, seed 1989, `new Course(SUMMIT_RUN,1989)`, real approved
  GLBs parsed with GLTFLoader and a headless texture plugin, await
  `createTrackKits(...).ready`, then `performance.now()` around
  `buildEnvironment(course,{trackKits:kits,snow:true})`. Canvas calls use
  no-op stubs. The baseline loads the original world-surfaces module from
  parent `70fca664`, with all other modules unchanged. No renderer, window,
  browser storage, saves or frame timing. Both qualities share this world
  construction path; quality timing belongs to Claude.
- Session-end Cockpit sync: PASS, zero task changes. No merge or push.

Open: Claude's official High/Performance timing. This lane claims a local
construction improvement and exact output, not a frame or release pass.

Changed assertions: **none**. No fixtures, tolerances or replay pins changed.
Pictures: no new pictures required for identical drawn output.

## Removed

Removed grow-and-copy far-mesh attribute/index intermediates and repeated
ribbon edge sampling. Owned timer scratch and the production build output
were recycled after recording the results. No superseded asset or code path
is retained.

## Claude review (26 October 2026)

Approved and merged: no assertion changed and Summit signatures stay exact; terrain, map, ground, world and replay suites and the build pass on integration. Official Summit timing comes with the finish area before release.
