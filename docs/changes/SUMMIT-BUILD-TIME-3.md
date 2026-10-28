---
task: SUMMIT-BUILD-TIME-3
status: investigated; no code change; Director decision needed
player_facing: no
---

# SUMMIT-BUILD-TIME-3

Claude (side session), 27 October 2026. Card `docs/board/cards/SUMMIT-BUILD-TIME-3.md`.
No game file changed, so the Summit world signatures and the replay
fingerprints are untouched by construction.

## Result in one paragraph

The 2.6 s run was not caused by anything in the game's build code that I could
find or reproduce. The world build is pure processor work (terrain heights and
snow coverage), with no graphics, shader, texture or finish-kit cost inside the
timed step. It runs at the same speed from run to run, within about 7%. What
moves it by a factor of 1.5 or more is which processor core the browser's main
thread runs on: this laptop is a hybrid Intel Core i7-13700H with 6 fast cores
and 8 slow ones, and the same build is about 1.5 times slower on a slow core.
The build is already close to 1 s on a fast core, so a slow core, or a busy
laptop, pushes it well over. I did not find an exact (nothing drawn changes)
speedup large enough to make the build safe on a slow core, so I stopped
instead of shipping a small change that does not meet the card.

## What I measured

Method: the real game's own timer (`data-world-build-ms`, the same number the
frame check reads), Summit, seed 1989, eight-car grid started the way
`measureNight` does, on a private port, memory-only saves, a fresh page for each
run (Chrome driven through `tools/browser-harness.mjs` with a throwaway
scenario, deleted). Temporary timing marks were put inside `build()` in
`src/render3d.js` and inside `buildEnvironment` in `src/world.js` and removed
before this commit. The laptop was busy with other helpers all night, so
absolute times are about twice a quiet run; the shape is what matters.

Run to run, eight fresh pages each (alternating High and Performance):

| Setup | World build, ms (all runs) |
| --- | --- |
| Headless, busy laptop | 2264 to 2612 (spread about 7%) |
| Headed, busy laptop | 1614 to 1867 (spread about 7%) |

No first-run penalty (run 1 was not slower than run 4), no growth over the
session, High and Performance within noise of each other. I could not make a
single 2.5 times spike happen in 16 runs.

Where the time goes (headed, busy laptop, mean of 8 builds, ms):

| Step | ms | Share |
| --- | --- | --- |
| Near terrain ribbon (heights, tint, snow coverage) | 523 | 30% |
| Far terrain (heights, tint, snow coverage) | 798 | 46% |
| Road strips, markings and the track script scene | 133 | 8% |
| Grass, grit, stones and posts | 163 | 9% |
| Snow world (plough banks, poles) | 87 | 5% |
| Finish area and the other landmarks | 32 | 2% |
| Everything else | about 15 | 1% |
| Outside `buildEnvironment` (old world disposal, lighting, snowmen and avalanche views, chickens, ambient shading) | about 6 | under 1% |

Causes ruled out with these numbers:

- Shader compile and texture upload: they happen on the first drawn frame,
  after `build()` has finished. Nothing in the timed step touches the
  renderer. The five steps around `buildEnvironment` add up to about 6 ms.
- The finish kit and its extra geometries: the finish area and landmarks step is
  about 32 ms of 1,750 (2%). A Node CPU profile of the build put
  `addSummitFinish` at 98 ms of 2,075, but that includes the first-time cost of
  building the two parked cars, which the browser has already paid by the time
  the world is built. It cannot explain a 1.5 s swing.
- Garbage collection: 75 ms of a 2,240 ms profiled build in Node (3%), and 186
  ms over a whole 24 s page load in Chrome, including the build. No long
  collection appeared in any run.
- JIT warm-up: a second build in the same process was about 15 to 25% faster,
  but that is mostly the texture and material caches being warm, not code
  tiering. Calling the hot functions 20,000 to 60,000 times first (84 ms) did
  not reduce the first build beyond noise.

## The most likely cause of the 2.6 s run

The build is one long run on the browser's main thread. On this hybrid
processor Windows can place that thread on a slow core. I pinned the whole
headed browser (page, GPU and helper processes) to one kind of core and ran
the same Summit High build:

| Browser pinned to | World build, ms |
| --- | --- |
| Fast cores (CPUs 0 to 5) | 1511, 1438 |
| Slow cores (CPUs 12 to 19) | 2367, 2143 |
| Not pinned (earlier, same night) | 1614 to 1867 |

The Node copy of the build, pinned to one CPU at a time, gave 1555 to 1896 ms on
a fast core and 2280 to 2890 ms on a slow core. Slow cores cost a factor of 1.45
to 1.6 in both tests. Add the other work that was running in the background on
that laptop (a second quality's page load, Windows indexing, the GPU process)
and a factor of 2.5 on one run is believable, but I could not prove it was the
cause on the evening of 26 October. It is the one explanation that fits all the
evidence: a stable build, no GPU or collection cost, a spike of the size of the
fast to slow core gap, and 1,036 / 984 ms on the quiet runs sitting right at the
limit.

## Why I did not ship a speedup

The build already had a long exact speedup pass in SUMMIT-BUILD-TIME and
SUMMIT-BUILD-TIME-2. What is left is spread thin. A CPU profile of the build
alone (Node, High, with the real approved kits and snow) by inclusive time:

- Route nearest-point queries: about 515,000 per build (about 80,000 repeat the
  same point), at about 1 microsecond each, 24% of the build. Changing the tree's
  leaf size (8, 4, 2) made no difference.
- Snow coverage for all 298,000 terrain vertices (a nearest-point query and
  three refinement steps each): 15%.
- Far terrain per-vertex height, tint and colour: 24%. Near terrain ribbon: 17%.
- Grass and stone placement: 13%. Track script scene: 9%. Plough banks: 5%.

No single piece is above a quarter, and the snow coverage cannot reuse the
terrain's own route query (the far mesh uses a coarser route and the near ribbon
queries different, double-precision points), so a shortcut that keeps every
drawn value identical would have to prove a bound on the refinement step, which I
could not do safely. A pile of small exact speedups would give perhaps 5 to 10%,
which does not make a slow core safe (that needs about 650 ms on a fast core,
down from about 1,000, a 35% cut). So no code was changed.

## Options for the Director

1. Measure the build on fast cores and say so. Pin the official timing run to
   the fast cores so the number reflects the code and not core placement
   (command below). A slow-core player would still see a build of 1.5 s once in a
   while on this laptop, once at the start of loading Summit.
2. Cut the work, not the check. The only large exact saving I can see is to do the
   course-only terrain maths (near and far heights, tint and snow coverage, 76%
   of the build) while the approved kits are still loading, which already takes
   seconds of mostly waiting. That drops the timed step and also shortens the
   full load, but it moves work, which the SUMMIT-BUILD-TIME note chose not to do,
   and it needs the terrain functions split into slices so frames keep drawing.
   It is a new card with its own design question, not tonight's change.
3. Keep the warning. Both qualities pass on frames (p95 16.8 ms); the build is
   1.0 s on a quiet fast core.

## Official timing command (Claude, alone, laptop screen off, GPU idle)

Unchanged recipe, from `tools/scenarios/frame-pacing.mjs`:

    $env:PATH="C:\Windows\System32;$env:PATH"
    $env:SUMMIT_FRAMES_ONLY='1'; $env:DUEL_NIGHT_FRAMES='1'; $env:DUEL_NIGHT_IDLE_AWAKE='1'
    node tools/run-browser-scenarios.mjs --scenarios frame-pacing --timing-only --headed --jobs 1

To run it on fast cores only (children inherit the setting; I used this on the
browser harness directly, not on the full runner, so check the first run's
numbers look normal):

    $p = Start-Process node -ArgumentList 'tools/run-browser-scenarios.mjs --scenarios frame-pacing --timing-only --headed --jobs 1' -PassThru -NoNewWindow
    $p.ProcessorAffinity = [IntPtr]0xFFF   # CPUs 0 to 11 are the fast cores' threads
    $p.WaitForExit()

Run it twice and report both builds. A second run far above the first, with the
same code, is the slow-core case described above.

## Changed assertions

None. No test, fixture, tolerance or pin changed.

## Removed

Nothing in the game. The temporary timing marks in `src/render3d.js` and
`src/world.js`, the throwaway scenario, the Node timer and the browser output
folders were all removed or recycled before this commit.

## Checks

- No game file changed (`git diff` against `5dce6985` shows only this note), so
  the lane tier (`--changed`) has nothing to select and the build output is
  unchanged. I did not run them.
- Summit world signatures and replay fingerprints: unchanged, nothing touched.

## Claude's review (27 October 2026, night)

Decision: no pinning of the official run (players do not get to choose their core, so the number must include slow cores). The build stays a reported warning for now: frames pass and a 1 to 2.5 s world build happens once, at the race start, where a player sees a loading screen. The real fix is option 2, doing the course-only terrain math while the kits load; it moves work and needs its own design, so it is a new card, SUMMIT-TERRAIN-PRELOAD, for Codex. Verdict: merge the note.
