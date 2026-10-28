---
task: SUMMIT-TERRAIN-PRELOAD
status: built; official frame check pending (Claude)
player_facing: no
---

# SUMMIT-TERRAIN-PRELOAD

Claude (side session), 27 October 2026. Card `docs/board/cards/SUMMIT-TERRAIN-PRELOAD.md`,
from the findings in `docs/changes/SUMMIT-BUILD-TIME-3.md`. Nothing that is
drawn changes.

## Design

Three-quarters of the timed world build is ground that depends only on the
course: the near ribbon, the far hills, and (on Summit) the winter coverage on
both. That maths now runs earlier, a little at a time, and the timed build takes
the finished result.

- **One code path.** `terrainGeometry`, `farTerrainGeometry` and
  `applySnowTerrain` became generators that pause after each row (near ground),
  each grid row (far hills) and each 1,024 vertices (winter coverage). The old
  names remain and run the generator straight through (`drain`), so the build
  without a preload does exactly what it did, with the same code.
- **`src/terrain-preload.js`.** `createTerrainPreload()` holds one job at a
  time (course plus winter setting). `request` starts it, `advance(ms)` runs
  it for about that long, a `schedule` function (the renderer gives it a
  message-channel task, which runs between frames) keeps it going, and `take`
  hands the finished geometry to the build, finishing straight through
  whatever is left. A request for another course drops the old work. A course
  the build does not draw ground for (the pit, salt flats) or whose ground is
  re-cut later (Deep ramp) is not preloaded. A failure inside the preload drops
  it silently; the build then does the work itself and meets the same error where
  it always did.
- **`buildEnvironment(course,{preload})`.** It asks the preload for the two
  meshes' geometry and otherwise builds them itself, as before.
- **`src/render3d.js`.** For a course that waits for kits (every course with
  kit placements, winter or snowmen) the frame starts the preload as soon as it
  knows the course, before the cars and kits finish loading. Right before the
  build it gives the preload up to 10 ms a frame and, if the ground is not yet
  finished, holds the frame the same way a still-loading kit does (canvas
  hidden, readiness held). So the page keeps drawing and answering while the
  rest finishes, instead of freezing for the whole build. Courses with no kits
  have nothing to wait for and build as they always did.

Why it is exact: the preload runs the same generators in the same order as the
build did (near ground, its winter coverage, far hills, its winter coverage), on
the same course object. Rows the ground keeps for the scenery's height reads
are seeded in the same order as before.

## Numbers

Same bundle, same laptop (busy with other helpers), headed Chrome, a fresh page
per run, memory-only saves, eight-car grid started the way the frame check
starts it, one switch inside the page (temporary, removed) turning the preload
off or on, runs alternated off/on/off/on so conditions match. The whole browser
was pinned with the Windows affinity setting to the fast cores (CPUs 0 to 11) or
the slow cores (CPUs 12 to 19). Medians; 8 runs per cell for Summit (4 High, 4
Performance), 6 for the others. Build is the game's own `data-world-build-ms`;
load is the full first-race load: from starting the race to the world drawn and
ready (`constructionMs` in the frame check).

| Course, cores | Build before | Build after | Load before | Load after |
| --- | --- | --- | --- | --- |
| Summit, fast | 1,150 ms | **289 ms** | 11,528 ms | 10,798 ms |
| Summit, slow | 1,899 ms | **495 ms** | 19,793 ms | 18,509 ms |
| Summit, fast (first set of 8) | 1,161 ms | 311 ms | 11,992 ms | 11,478 ms |
| Summit, slow (first set of 8) | 2,070 ms | 580 ms | 22,079 ms | 20,302 ms |
| Tremblant Woods, fast | 488 ms | 224 ms | 8,418 ms | 8,418 ms |
| Tremblant Woods, slow | 1,089 ms | 501 ms | 18,376 ms | 17,574 ms |
| Ardennes Forest, fast | 398 ms | 188 ms | 9,765 ms | 9,649 ms |
| Ardennes Forest, slow | 696 ms | 313 ms | 16,207 ms | 15,906 ms |

In the second set of 8 Summit runs every build after the change is under 600 ms
on either kind of core (fast 272 to 328 ms, slow 468 to 572 ms; before: fast
1,062 to 1,297 ms, slow 1,829 to 2,056 ms). In the first set one slow-core build
reached 689 ms (range 507 to 689; before: 1,843 to 2,239). The load is no slower
in any pairing and a few percent faster in most; the run-to-run noise on the load
is larger than that (it varies by 10% or more on identical code), so do not read
the gain as certain.

What the build number means now, plainly: the ground maths still costs the same,
but it is done in slices before the build instead of inside it. In the race
check the kits and cars take only about 0.4 s to load, so the preload does not
finish inside that window; the frame is held for the rest (about 1 s on a fast
core), drawing and answering between slices, and then the build runs. The
total load does not grow, and the one long freeze is gone. Longest single slice
was 17 to 23 ms (one dropped frame at worst), measured on the preload itself.

## Checks

- `tools/test-terrain-preload.mjs` (new, 326 checks): for nine course and winter
  settings (Summit with and without winter, Tremblant Woods, Midnight Chase,
  Pacific Canyon, Ridge Rally, Titan Arena, Titan Freestyle, Harbour Lights) the
  preloaded near and far ground equals the straight-through builders byte for
  byte (every attribute, the triangles and material groups, winter coverage
  present or absent); taking early; refusal for another course or winter setting;
  replacement and dispose; the pit is not preloaded; a failing preload drops
  quietly; the schedule drives it to the end; and the whole Summit world with the
  real approved kits and snow hashes the same with a preload, without one, and
  with an idle one. A deliberate break (leaving the winter coverage off the far
  hills in the preload) failed it.
- A separate hash of every drawn attribute, index, group, material and instance
  matrix over the whole built world (Node, real kits) was identical before and
  after, with a sliced preload, for 13 courses: Summit, Summit Time Attack,
  Tremblant Snow, Tremblant Woods, Harbour Lights, Pacific Canyon, Midnight
  Chase, Ridge Rally, Titan Arena, Titan Freestyle, Ardennes Forest, Panorama
  Ridge, High Country.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`): **109
  passed, 0 failed, 0 not run**, including the reviewed world signatures
  (`test-world-composition`, 47 checks, all unchanged), the replay fingerprint
  suites (`test-replays`, `test-combat-replays`), `test-snow-world`, and the new
  suite. `npm run build`: built (chunk warnings as before).

## Official timing (Claude, alone, laptop screen off, GPU idle)

Unchanged recipe:

    $env:PATH="C:\Windows\System32;$env:PATH"
    $env:SUMMIT_FRAMES_ONLY='1'; $env:DUEL_NIGHT_FRAMES='1'; $env:DUEL_NIGHT_IDLE_AWAKE='1'
    node tools/run-browser-scenarios.mjs --scenarios frame-pacing --timing-only --headed --jobs 1

Expected: world build about 0.3 s (fast cores) and about 0.5 s (slow cores);
frames unchanged (nothing changes once the race is drawn). Report the full first
load too (`constructionMs` in `frame-pacing.json`).

## Open points

- The preload gives the timed step a large margin, but it does that by doing the
  maths before the timed step, not by making it cheaper. The cost still lands
  between "race started" and "world drawn", just in slices.
- On the menu, picking a stage whose course has kits now hides the 3D backdrop
  for a moment while the ground prepares (as it already does while kits load),
  instead of freezing the frame. Courses without kits behave as before.
- Courses with a Deep ramp are not preloaded (their ground is cut after
  construction); they build as before.
- A fast preload could be started even earlier, from the menu, if a later
  change makes the race course reuse the menu's course. Today the race builds
  its own `Course`, so the menu's work cannot be reused.

## Changed assertions

None. No test, fixture, tolerance or pin changed; one test added.

## Removed

Nothing. The straight-through builders are the same code, run to the end, so
there is no old path to remove. The temporary timing switch, the browser
scenario, the Node timer and all browser output were removed before this commit.
