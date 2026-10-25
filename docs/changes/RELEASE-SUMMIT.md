# RELEASE-SUMMIT

Summit Run, Summit Time Attack and the Yeti go live, with everything merged on
integration since the forest-fire release (42dcb5b6). Claude is Release
Manager under AGENTS rule 18.

## What goes live

- Summit Run (`summit-run` on, 2,600 credits, Grand Prix, after Panorama Ridge)
  and Summit Time Attack (follows Summit's switch, free with Summit), with the
  accepted always-on snow look; the Yeti (`yeti` on). SUMMIT-SWITCH-ON 92f80264.
- Team Room intel levels, reference ghosts and the variant entry
  (P4-INTEL-LEVELS 390cafc5); engineer notes for the sixteen older courses
  (P4-FINISH-TEAMROOM 8794b4de); optional Coach braking and apex guides
  (P4-COACH 177b185c).
- Ardennes braking boards (bf358e5a) and Stavelot stone houses (8c310939).
  The far forest band (ae5be47a) is taken out again (3abe9e00) after its High
  frame check failed; its code stays for a later pass.
- QA-AUDIO-CRASH-RELIABILITY and other merged fixes.

## Checks

- Full tier on 7f108454, alone, jobs 4: 455/455, zero failures or not run,
  2141 s. Since then only Ardennes' far-forest data, its signature row and its
  test changed (3abe9e00, lane 42/42 jobs 4, build, review CLEAR), plus docs:
  rule 19, no second full tier.
- Combat balance --check on 7f108454: flags [], 51 policy runs, 90 baseline
  races.
- Frame check (headed, eight cars, laptop panel off, GPU quiet), measured with
  the reviewed perf-high-night e5f24864 night-summit selector merged into a
  measuring copy only:
  - Summit night summit: p95 16.8 ms High and Performance; world build
    1498/1533 ms (repeat 1510/1515), over the 1 s limit; full first load
    7.9/8.2 s (warning). The Director decided under rule 18 to ship with the
    world build recorded as a warning for this release; the Director session
    reports Kyle answered "Release now, fix after". SUMMIT-BUILD-TIME (Codex)
    brings it under 1 s, keeping the snow. Rule 8 is unchanged otherwise.
  - Ardennes Pit Straight on 7f108454: High p95 33.3 ms FAIL, Performance
    16.8 ms, world 640/621 ms. With only the far band removed (the scene now
    shipped, signature 29779488): High and Performance 16.8 ms, world
    646/586 ms, pass.
- Browser scenarios on 7f108454 are running alongside and do not hold the
  release (Kyle, 15 October); results and any new QA cards follow in the
  inbox.

## Removed

Nothing removed by the release itself; the far forest band data was removed in
3abe9e00 (its code and test-local coverage stay).
