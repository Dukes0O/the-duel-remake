# KOGANE-PASS-C2: rough road

Status: built for Claude's keyboard judgement. Kind: course. Switch:
`kogane-pass`, `dev`. No C3 pace work.

## Changed

Added the packet's 28-piece open road without changing a length, angle,
radius, width or climb. Length 4,684.23 m, start height 320 m, finish 26 m,
four 12 m wide hairpins on a 10 m road. Distant legs measure 195.31 m apart
on the test's 8 m sample grid. Maximum eased grade is 10.21%, consistent
with the packet's approximate 10%.

Reused Summit's racing line and following options, six-car Grand Prix,
one run, start at 45 m, and no traffic or combat. The new course manifest
supplies its dev switch, 2,200 credit price, release order 13, generation
stage 22 and Stuttgart test driver. No existing course registration moved.

Reused fir forest bands, armco, concrete walls, braking boards and a start
gantry. The drive-through caught an 18.55 cm gap between the thinner armco's
visible face and the physical wall. Shifted only the armco placements inward
by half the mesh depth difference and added a regression assertion.

The light path follows dusk at 0 and 1,500 m, night at 2,600 m. Final scenery,
the actual lake, sodium lamps and custom sound remain C4/C5 work. The lower
road picture is of the named Sodium Hairpin section before those lamps.
No new event or sound cue; existing alpine forest ambience applies.

## Checks and review

- Course test: passed Casual and Pro native finishes, no crashes or resets.
  Added an on-road sample assertion for both handling modes for the lane run.
- Drive-through: passed, zero ground or traversal issues, three native runs
  on Easy/Medium/Hard, and all 16 barrier probes at 70 and 110 mph.
- Manual circuit suite with `?flags=kogane-pass`: passed 174,850 checks,
  23 events and four seeds. Existing assertions unchanged.
- Pilot outline rebuilt with `node tools/build-pilot-map.mjs`: byte-identical.
  The tool traces registered pilot places; Kogane's place belongs to C5.
- Independent code review: no faults in the course, test or browser recipe.
- Browser scenario: passed, three High pictures, zero warnings or errors;
  native six-car Grand Prix admission and a 109.82 s downhill duel with zero
  crashes or resets. Memory-only saves, private port, no frame timing.
- Lane: all 49 suites in the final changed-file plan passed. Started with
  `node tools/run-tests.mjs --tier lane --changed --jobs 2`: 41 passed,
  one environment failure, five unrun. The status snapshot selected two more
  suites. Reran only the failed suite and those seven pending suites, all
  green. Replay guard: 225 checks across 25 cases; combat replay guard:
  12 checks across four encounters; world composition: 47 checks. Existing
  fingerprints and signatures unchanged.
- `npm run build`: passed. Vite reported its existing large-chunk and mixed
  static/dynamic import warnings. The linked dependencies lacked a Windows
  `vite` command shim, so a temporary lane-local shim forwarded the same
  build command to the installed Vite CLI. Native config loading kept config
  scratch files out of the shared dependency tree. No dependency changed.

Vite's default config loader tried to write into the linked dependency tree
and was denied. Used Vite's native config loader through a temporary launcher,
without changing the harness, dependencies or shared files. The first sandboxed
Chrome session closed its DevTools connection; reran the same scenario outside
the sandbox on its harness-selected private port, with memory-only storage.
The lane's audio evidence suite could not see the installed FFmpeg inside the
sandbox (`spawnSync ffmpeg ENOENT`). The same suite passed all nine tests
outside the sandbox. No code or test assertions changed to address either
environment restriction. Completed the unrun suites with the same jobs limit.

## Pictures

Top-down map comes from `drawCircuit` in `tools/track-script.mjs`, drawn at
1,800 by 1,012 and reduced to 1,280 by 720 so the legend fits. Three native
High road pictures use the new `kogane-pass` scenario at 1,280 by 720.
The requested copies use `kogane-c2-*.png` in Claude's supplied scratchpad.
Saved `kogane-c2-map.png`, `kogane-c2-lakeside-start.png`,
`kogane-c2-hairpin-above.png` and `kogane-c2-lower-sodium.png` there.
Raw lane evidence is recycled after recording its verdict.

## Assertions and fingerprints

No existing assertion or tolerance changed. The new grade assertion initially
assumed a strict 10.1% limit; inspecting the unchanged packet script showed
10.21% after easing, so its new test uses 10.3%. No replay fixture, world
signature, existing pace row, save shape or player data changed.

## Not done

Claude must drive the course on the keyboard and judge the four hairpins.
C3 pace tuning and later stages were not started. The observed Falcone run
times are traversal evidence, not the Stuttgart C3 pace target.
Board closure and Cockpit sync belong to the Director's lane handoff; this
job writes only in its own worktree and the requested picture destination.

## Removed

No runtime code or assets replaced. Recycled the temporary browser builds,
launchers, drive-through JSON, logs, test bundles, raw lane pictures and
production build. The four requested review pictures remain in Claude's
scratchpad. Refreshed the lane's status snapshot without inspecting other
lane folders or the live checkout.
