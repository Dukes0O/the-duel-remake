# EIFEL-CROWN-C2: rough road

The approved 34-piece Eifel road replaces the generic expansion road only
when the existing `eifel-crown` preview is enabled. It keeps id `eifel-crown`,
slot 9, stage 9, seed 1989, price 1,400 and Grand Prix membership. The switch
stays `dev`. Other courses retain their positions and definitions.

## What changed

- Scripted 5,596.4 m loop, 14 m width, layout version 3, the named esses,
  ridge and valley pieces, the 2.5 m Forest Dip crest and alpine sections.
- Existing forest bands and nine existing braking boards. Automatic kerbs
  stay red and white pending C4. No new art, events or sound cues.
- Registry slot validation and replacement preserve every other menu index.
  The GP catalogue excludes a second copy of a slotted base event.
- Pilot-map generation retains every released outline and adds the new Eifel
  outline as a preview. The chart selects it only with the Eifel switch.
  These small builder/view hooks are needed to meet the packet's off/on rule.
- Own geometry, slot, map and Casual/Pro lap tests, plus the memory-only
  `eifel-views` browser recipe at 1280 x 720. No frame timing.

## Checks and review

- Own course test: 6 passed, including isolated native Casual and Pro laps.
  The existing reference fixture removes traffic and police while preserving
  physical steps and legal lap crossing. The first test attempt used a raw
  time trial, which still spawns traffic, and hit three vehicles/trees.
  It was corrected to use the packet's stock 959 and the existing fixture.
  Loop closure correction: 1 degree, straights at most
  1.182%, steepest grade 21.708%, separate road stretches at least 468 m.
- `tools/test-circuits.mjs`, imported by hand after enabling the Eifel preview:
  passed, 174,834 checks across 23 events and four seeds.
- Raw drive-through: ground clean (41,985 road samples and all nine board
  footings), Medium and Hard finish without reported geometry issues. Easy
  leaves the road at s 3110.12 m, lateral -7.037 m. The tool spawns traffic.
  A trial of `roadShare: .85` caused Easy and Hard to run out of lives in
  traffic. That trial was removed; the packet's original road and line remain.
  An isolated-geometry option needs a Director re-slice of the tool's scope.
- Independent code review: clear, no findings. The reviewer checked packet
  fidelity, slot stability, switch isolation, map data and changed assertions.
- `npm run build`: passed (600 modules, 1.40 s). The linked dependencies lack
  Windows `vite.cmd`; a temporary lane-local launcher supplied it. Vite's
  `--configLoader runner` avoids writing config cache through the dependency
  junction. The same temporary launch setting served browser QA and the gate.
  No shared dependency file was changed.
- `node tools/run-browser-scenarios.mjs --scenarios eifel-views --jobs 1`:
  passed, 1/1 scenario, three road pictures, zero warnings or errors. Native
  memory-only scene on private port 33782, headless, no frame timing. Builder
  checked the three pictures: road and hills visible, no clipping or missing
  assets. This is C2 road evidence, not a final scenery verdict.
- Four pictures saved and checked at 1280 x 720 under
  `C:/Users/kyleb/AppData/Local/Temp/claude/C--Users-kyleb-dev-the-duel-remake--claude-worktrees-project-status-remote-plan-fa06b8/3382fa7b-51ba-42b5-b7c3-db65ae96eb7c/scratchpad/`:
  `eifel-c2-map.png`, `eifel-c2-esses.png`, `eifel-c2-ridge.png`, `eifel-c2-valley.png`.
- `node tools/run-tests.mjs --tier lane --changed --jobs 2`: FAILED after
  846.14 s, 104 passed, 1 failed, 218 not run (323 selected). The exact-match
  assertion in `tools/test-career-rebuild.mjs` fails: the recipe's released
  course filter rejects Eifel because its new replacement manifest is dev,
  even though its old road is released. The shipped restore data remains
  unchanged. No assertion was weakened and no real player save was read or written.
  The packet does not own `tools/career-rebuild.mjs`; the card records the
  recommended slot-aware filter fix for a Director re-slice and save review.
- The remaining lane suites, including replay/signature guards, were not run
  after fail-fast stopped the gate. No new fingerprints were recorded.
- Repository placement check passed after cleanup. `git diff --check` passed.
- Claude's keyboard lap and road verdict remain for the Director.

## Changed assertions

- Layout catalogue: a slotted definition retains its base generation stage
  and is excluded from appended course counts. Eifel permits traffic and
  combat as the packet requires. Its approved climb sum is -0.2 m before the
  existing builder spreads the remainder over the straights. Other courses'
  values and tolerances are unchanged.
- Harbour, Panorama, Tremblant, Tremblant Snow and Ardennes catalogue checks:
  count only unslotted entries when checking appended positions. Slot 9 is
  separately checked for exact identity, uniqueness and unchanged neighbours.
- Course-kit catalogue positions: use a declared slot when present, otherwise
  the original appended order. No road, replay or signature assertion loosened.
- Generic layout driving now installs a slotted definition for its test and
  restores it afterwards, so it drives the new road rather than the old road
  with the same id. The unchanged reverse checks also run.

Claude's written assertion review is required on the card before integration.

## Removed

The generic builder is bypassed for preview Eifel, including its coast section
and lighthouse. The released expansion entry remains for switch-off play until
C7 removes it. C3 owns pace, reference laps and replay replacement. C4 and C5
own full scenery, landmarks and water. C2 does not start those cards.

Temporary launchers, the lane's generated build and local QA evidence were
recycled after recording the results. The four requested scratchpad PNGs remain.
