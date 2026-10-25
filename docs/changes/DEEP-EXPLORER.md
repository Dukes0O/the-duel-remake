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
- Deep import guard adds only the ten exact imports used by this card's new
  acceptance suite. The empty-unapproved-import assertion remains unchanged.
- New acceptance tests and browser recipe; no replay fingerprints, world
  signatures, timing tolerances or existing numeric gameplay checks changed.

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
  note records the builder inspection; Claude's look verdict remains pending.
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
unrelated suites were not repeated. No merge, release or push.

## Removed

Replaced the always-visible loop chart and quality-dependent rock layout.
Recycled this run's generated build, named test fixtures and raw captures
(about 465 MB), preserving the requested sheet and handoff proof. The scratch
folder itself stayed in place. No runtime assets, real player saves,
other lanes' output, originals or ramp geometry removed.
