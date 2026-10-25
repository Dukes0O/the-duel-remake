# DEEP-EXPLORER

## Design and checks

Claude's card settles the player design. Implementation choices: U and the
Surface button use the existing ramp-top return and end the committed dive.
No ramp geometry or camera changes. Shared-file edits carry DEEP-EXPLORER
markers. The existing `the-deep` switch gates the feature.

The chart uses 16 m cells in the zone's own mirrored ramp frame, revealing
cell centres within 25 m of the driven path. Its 96 by 96 bitmap is stored as
2,304 hex characters under optional `deep.charted['kelp-coast']`: under 2.4 KB
including JSON. Unsupported zones and invalid or oversized bitmaps are rejected.
Old saves gain no field. Save packets union cells, belong to the diver's player
and flush every two seconds, on Surface, menu exit and before Restart replaces
the run and takes its save snapshot. Other Deep fields and rewards stay intact.

The same seeded 420-rock layout is solid and visible on both qualities
(High already drew 420; Performance drew 360). Swept contacts use the land
collision helper and stop the car gently, without damage. Kelp remains soft.
The chart caches its survey geometry. Pins read only the saved log, pearls and
raised finds at authored spots. Place names require saved discovery.

Ana's list has the five-part count (including the badge), a separate Sirena
raise, seven creatures, three pearls, survey percentage and Coast Cup. Each
unfinished goal has a pointer. Completion notices queue behind place titles
and log cards, then play the existing log cue. Existing completions do not
announce again on re-entry. Notices call the presentation audio hook directly;
the HUD never emits a race event. Its final two story/HUD suites passed.

Acceptance checks: `tools/test-deep-explorer.mjs` (Surface at every place on
all routes, every rock, reveal/size/route portability, pins, objectives and
player guards); `tools/test-deep-save.mjs` and `tools/test-save-fixtures.mjs`
(old bytes and the new two-player chart fixture). Browser: deep-explorer,
deep-sirena and deep-life. Deep frames: alone, timing-only, headed, jobs 1,
only with a quiet GPU. Lane tier jobs 4 and production build.

## Independent review

Separate reviewer found a restart gap in the final two seconds of charting.
Fixed by flushing the old dive in App.startCampaign before replacing runId
or taking deepSave. The actual memory-only App.restart regression verifies
the profile, written storage and next dive snapshot. Reviewer confirmed the
fix and found no further save or objective faults: clear.

## Changed assertions

- Save-fixture roster: 21 to 22 for `22-deep-chart.json`. All exact first-load,
  field-preservation and round-trip assertions remain.
- Deep-save fixture routing adds only `22-deep-chart.json` to the Deep-bearing
  fixtures; its fields are compared exactly, and all older fixtures keep their
  prior checks.
- Deep import guard adds only the twelve exact imports used by this card's new
  acceptance suite. The empty-unapproved-import assertion remains unchanged.
- New acceptance tests and browser recipe; no replay fingerprints, world
  signatures, timing tolerances changed. The authorized creature logging thresholds change as recorded below.

## Checks and pictures

- Lane tier, jobs 4: 210 of 212 suites passed initially, none unrun (1,575.9 s).
  Two non-game failures were corrected without changing assertions: GNU tar
  treated a Windows archive path as a remote host; the inherited DEEP-PLAYTEST-1
  JPG lacked its matching review note. Added the note from Claude's already
  recorded verdict and reran only those two suites, jobs 1: both passed
  (35.2 s). The rerun prepends `C:\Windows\System32` to PATH for Windows tar;
  it does not change the machine's PATH. Combined lane coverage: 212 of 212.
- Final HUD delta: both affected suites passed, jobs 1 (16 tests in 13.2 s).
  Separate reviewer confirmed this final delta; save/objective review clear.
- Core: 632 checks; race integrity: 605; replay fingerprints: 225 checks,
  25 cases, unchanged; world composition: 47 exact-scene checks, unchanged.
  Deep sea-life CPU suite: 23 of 23 passed. New acceptance: seven groups;
  old story: nine; Deep save: 30 groups; save fixtures: 993 checks.
- Production build passed: 535 modules, 1.85 s, existing large-chunk warning.
  No runtime assets or dependencies added.
- Browser: deep-explorer, deep-sirena and deep-life passed with zero warnings
  or errors. After extending the partial survey route, the final deep-explorer
  capture passed again on the final HUD code. All use private memory saves.
- Picture: `docs/board/looks/deep-explorer/round-1.jpg`, 224,573 bytes, inspected by the builder. Left: 15% surveyed and real badge/turtle/pearl finds.
  Right: completed synthetic save, 100%, all pins and Ana's list. Its matching
  note records the builder inspection. Claude subsequently passed the functionality; round 2 addresses his chart look feedback.
- Board: 199 checks and repository placement passed after the metadata and
  sheet updates. STATUS refreshed; protected Cockpit board sync succeeded.
  Repository audit found no unused new modules; existing uncertain candidates were left in place. The chart sheet
  accounts for the new review binary; runtime asset bytes are unchanged.

`deep-frames`: SKIPPED under Kyle's explicit condition. A warmed Windows GPU
counter sample showed Chrome GPU process 20728, parent 23076, at 87% 3D load;
that Chrome window is titled The Duel. The internal panel and both Dell screens
are active. No frame run, p95 claim, display change or interaction with that
window. The next quiet run remains:
`node tools/run-browser-scenarios.mjs --scenarios deep-frames --timing-only --headed --jobs 1`.

Original and corrected check logs remain in the ignored
`.evidence/2026-10-25/DEEP-EXPLORER/checks/` for integration handoff. Passing
unrelated suites were not repeated. Round 1 made no merge, release or push.

## Removed

Replaced the always-visible loop chart and quality-dependent rock layout.
Recycled this run's generated build, named test fixtures and raw captures
(about 465 MB), preserving the requested sheet and handoff proof. The scratch
folder itself stayed in place. No runtime assets, real player saves,
other lanes' output, originals or ramp geometry removed.

## Round 2: moving creatures and ink chart

Fetched origin, then merged `origin/integration/wasteland` at `6a35e8f6`
into this lane (`b91cbac4`) before coding. Resolved only two shared hooks:
retain DEEP-RAMP-2's ramp driving, wrapping underwater driving with Explorer's
rock sweep, and retain both imports. No ramp geometry or camera edits.

The dive now advances `createSeaLifeState` using simulation time, car inputs
and the zone floor. It reuses the existing sea-life motion rules, including
the sardine school centre and whale trigger/pass. Native graphics draw these
same poses without advancing them; loading, frame rate and quality cannot
decide logs. Standalone art views retain their existing rules-driven preview.

Creature holds accept a matching moving pose OR the authored spot, within
8 m horizontally, under 20 km/h, continuously for 1 s. Either location adds
to the same timer once per step. Leaving or speeding clears it. Pearls keep
3 m, under 15 km/h, 1 s. Saved IDs still prevent repeat rewards. The HUD reads
those timers to fill a small ring with "Logging: Green turtle" or the other
creature name / Pearl. Completion uses the existing cue, log card and Ana line.
No save shape, chart cap, objective or payment changes in round 2.

The chart blends circular survey samples into paper-coloured washes and kelp
pen strokes, then feathers their union and draws a thin ink contour. No square
tiles show. The dashed loop clips to that reveal. Rendering caches by survey
and geometry. The left panel widens from 340 to 510 px; the list below scrolls.
The saved bitmap and reveal rules are unchanged.

Independent reviewer: no faults in moving logging/ring, renderer authority,
save ownership, reward deduplication or objectives. Confirmed the requested
threshold assertions match the card. No further code fixes requested.

### Round 2 changed assertions

- Existing `test-deep-log` creature boundaries change 6.2/5.9 m to 8.2/7.9 m
  and 15.5/14.5 km/h to 20.5/19.5 km/h, matching Claude's written card items
  6/7 and Kyle's explicit request. They still test just outside/inside the
  boundary, interruption, full duration and no repeat card. Pearl checks stay.
- The save-already-logged test's obsolete "never a creature" title is corrected;
  its assertions are unchanged.
- Two exact import contracts are added for the new headless acceptance checks
  (`sea-life-rules`, `deep-story`); the no-unapproved-import assertion stays.
- New acceptance: native moving turtle outside its fixed spot, fast pass,
  half-filled/reset ring, fresh full second; all seven creatures at their spots
  and moving poses on all three routes; identical poses for identical inputs;
  explicit unchanged pearl range/speed. Browser recipe adds a real ring frame.
- No replay, signature, timing tolerance, save-fixture or reward assertion changes.

### Round 2 checks and picture

- Lane tier `--changed --jobs 4`: 187 passed, one inherited evidence-pairing
  failure, 32 not run (614.8 s). The incoming ramp sheet had `review.md` but
  lacked the required `round-1-review.md`. Added a short reference to its
  original review, without changing that review or any assertion. Reran only
  that failed suite plus the 32 unrun suites: 33/33 passed, none unrun (304.3 s).
  Combined coverage: all 220 lane suites passed. Original failure and continuation
  receipts remain separate in ignored `checks/round-2-lane.json` and
  `checks/round-2-remaining.json`; no passing suite was repeated.
- Explorer 9/9; log 12/12; sea life 23/23; story 9/9; ramp 11/11;
  Deep save 30 groups; save fixtures 993 checks / 22 historical shapes plus
  one forged. Replay 225 checks / 25 cases; combat replay 12 / 4;
  world composition 47 exact checks. Fingerprints and signatures unchanged.
- Production build passed: 535 modules, 1.13 s, existing chunk and ineffective
  dynamic-import warnings. No runtime dependencies or assets added.
- Deep-explorer, deep-sirena and deep-life passed (jobs 1), zero warnings/errors,
  private memory-only players. The final ring frame runs unpaused.
- Independent final delta review confirmed route-aware chart caching and the
  stronger moving-turtle boundary assertions; clear.
- `deep-frames`: SKIPPED. At 13:48 PT, GPU samples were idle (NVIDIA 0%, Windows
  engines 0%), but a foreign full tier PID 21840 was active, started 13:45:55
  by Claude's separate session. AGENTS requires frame timing alone; no frame
  job started and no p95 claim is made. The three displays and live game were
  left alone. This is a competing-full-tier skip, not a claim of GPU load.
  The quiet command remains `node tools/run-browser-scenarios.mjs --scenarios
  deep-frames --timing-only --headed --jobs 1`.
- Status and protected Cockpit board sync refreshed at session end.

New picture: `docs/board/looks/deep-explorer/round-2.jpg` (278,530 bytes),
partial survey, full saved fixture, live logging ring. Builder inspected.

### Round 2 removed

Replaced the fixed-spot-only logging path for creatures and the visible square
chart tiles. Native sea-life no longer advances in the renderer. No old save,
player progress, runtime asset, ramp geometry or other lane's work removed.
Recycled 671,548,836 bytes of generated Vite/QA output, both generated salt-test
fixtures and raw pictures; kept the two round sheets and handoff check reports.
Cleanup approval first required stronger ownership proof: private non-linked
roots, exact test receipts and 711 byte-identical runtime copies were verified
before recycling. The scratch root remains; no cleanup is blocked.
