# QA-FRAME-ENVIRONMENT

The short board entry controls current state, ownership, dependencies and locks.

Claude, 13 October 20:55 PT: the headed frame check on Harbour at night gave
High/Performance p95 33.4/33.3 ms and construction 5 to 6 s on both the live
build bb8d3a99 and release d34bf40f (graphics card idle, nothing else running,
High performance power plan). Panorama's release on 12 October measured
18.3/18.2 ms and 0.4 s. The 14 October full check measured the same failure.

Find whether the harness now counts asset loading in construction, and why
p95 sits at exactly two 60 Hz frames (a capped refresh rate or a power
setting after the restart are worth a look), within rule 4's 30 minutes;
record the finding here. No change to limits.

## Claude findings, 14 October 08:50 PT (no measurement yet)

- The harness and the frame scenario have not changed in any way that counts
  since the Panorama release (36d7613f); only setup before the timer moved.
- The headed Harbour scenario (f70a7d2d, 12 October 13:54) has never passed.
  Its first run was the 13 October full check.
- The same full checks ran headless eight-car frame scenarios on this laptop
  (Grand Prix, Tremblant Snow, Tremblant Views): p95 18.1 to 18.5 ms on the
  NVIDIA adapter. The game itself is not slower.
- Display: two 4K monitors on the NVIDIA adapter at 60 Hz (primary scaled to
  2560x1440) and the built-in panel at 165 Hz on the Intel adapter. The headed
  run's p50 is 18 ms with about 6% of frames taking two refreshes, which gives
  the 33 ms p95. Most likely cause: the headed window on this display layout.
- Construction: the headed scenario counts from race start until every file
  has loaded, in a fresh browser profile. The 0.4 s at the Panorama release was
  the world build after loading. These are different measurements; the cold
  file wait is 3 to 4 s at every release since 12 October.

Next: one headed run in a quiet window with a single monitor active (Kyle
switches the display), then the construction definition goes to Kyle.

## Claude measurement, 14 October (quiet laptop, integration bde9458b)

Headed frame-pacing, Harbour at night, eight cars, 120 frames per quality:

| Screens | High p50 / p95 / max | Performance p50 / p95 / max | World build | Full load |
| --- | --- | --- | --- | --- |
| Laptop panel (Intel, 165 Hz) + two Dells (NVIDIA, 60 Hz) | 16.7 / 33.3 / 133 | 16.7 / 33.3 / 50 | 0.61 s | 5.3 to 6.6 s |
| Two Dells only, run 1 | 16.7 / 33.3 / 50 | 16.7 / 16.8 / 33 | 0.57 s | 4.9 to 5.6 s |
| Two Dells only, run 2 | 16.7 / 33.3 / 50 | 16.7 / 16.8 / 33 | 0.55 to 0.60 s | 4.8 to 5.6 s |

Findings:
1. With the laptop panel on, the headed window mixes two graphics adapters
   and both qualities miss frames. With it off, Performance passes. Frame
   checks run with the laptop panel off (Win+P "Second screen only").
2. High still misses more than 5% of frames on a 60 Hz screen: a frame that
   takes just over 16.7 ms waits for the next refresh and reads 33.3 ms. The
   headless checks (18.1 to 18.5 ms, no refresh lock) say the same thing: High
   at night on Harbour sits right at the limit. This is real game cost, not
   the tool. New card PERF-HIGH-NIGHT.
3. World build is 0.55 to 0.61 s, under 1 s. The 1 s limit has meant the world
   build at every release; the full first-race load (about 5 s, files in a
   fresh browser) is reported, and its rule waits on Kyle.

## Kyle decided, 14 October 2026: what the 1 s limit covers

Kyle agreed: the 1 s limit is the world build (`worldBuildMs`), as at every
release. The full first-race load (`constructionMs`, fresh browser, files
included) is reported and should stay under 5 s; over 5 s is a warning in the
report, not a failure. AGENTS rule 8 now says so.

Codex, small change: in `tools/full-check.mjs` (line 53 to 54) and wherever the
frame-pacing scenario applies the same limit, require `worldBuildMs` finite and
under 1000, keep the p95 18.5 ms limit exactly, and add the 5 s warning for
`constructionMs`. This is a changed assertion decided by Kyle: explain it in
the change note and give it one review. Also make the frame step print a
reminder that the laptop's own screen should be off. Then close this card.


## Director tools-only scope

Use new qa-frame-environment lane, tools/full-check.mjs, the named existing frame-pacing scenario if its same predicate applies, tools/test-full-check.mjs and own docs/changes/QA-FRAME-ENVIRONMENT.md only. Implement the exact finite worldBuildMs<1000 predicate Kyle decided; retain18.5ms/eightcars/120frames/all existing quiet/storage/admission checks. Report finite full-load constructionMs and warning only above5000ms; missing/malformed data remains an honest report error. Print panel-off/Second screen only reminder before the frame stage. Extend existing meaningful full-check fixtures first, document every changed assertion as the decision by Kyle. Do not run actual frames, modify display settings, or claim PERF-HIGH-NIGHT resolved. Source freeze/Root independent review before any existing focused/nearby/jobs4/build; no new machinery or shared metadata from the builder.


## Integrated tools correction

Reviewed aea43b4c, focused43/43, canonical21/21/notRun0/jobs4, build746ms. Actual failed-stage metrics and slow-load warnings now survive without turning a failed frame or child exit into a pass. Worldbuild finite<1000, p95<=18.5 exact; finite full coldload>5000warns. Panel-off reminder is printed beforeframes. No actual timing/display rerun or High-performance fix is claimed; PERF-HIGH-NIGHT remains open. Conflict-free merge, no repeated gate.
