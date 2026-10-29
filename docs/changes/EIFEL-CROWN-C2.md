# EIFEL-CROWN-C2: rough road

The approved 34-piece Eifel road replaces the generic expansion road only
when the existing `eifel-crown` preview is enabled. It keeps id `eifel-crown`,
slot 9, stage 9, seed 1989, price 1,400 and Grand Prix membership. The switch
stays `dev`. Other courses retain their positions and definitions.

## What changed

- Scripted 5,602.6 m loop, 14 m width, layout version 3, the named esses,
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

## Continued C2: Claude's decisions

Claude's answers are recorded on the card. Keep the raw traffic drive-through;
no new geometry mode or test machinery. The approved recipe correction is
inside this resumed card's scope. C3 has not started.

- Easy's 0.037 m departure was at the entrance to Wall Left. Ease that bend's
  radius from 105 m to 108 m (+2.86%). Keep its angle, climb and 14 m road width.
  The loop builder refits the straights by at most 0.678%; length is now
  5,602.65 m. Separate road stretches remain at least 470.55 m apart.
- The original racing line settings remain. The narrower-line trial from the
  first pass was already removed. The accepted raw traffic run now completes
  all three difficulties, so no traffic-related road repair is needed.
- Rebuild the pilot-map preview from the revised road. Released map outlines
  remain exact. Refresh the same four named C2 pictures.
- Make `unlockableCourseIds` retain a priced, already released slotted course
  when its replacement switch is dev. Appended development courses still
  require an enabled released switch. No player data is accessed.

## Checks and review

- Manual `node tools/drive-through.mjs --course eifel-crown --json`: PASS.
  Easy, Medium and Hard each complete a native lap with traffic: 130.192,
  130.242 and 130.292 seconds. Zero issues. Ground: 42,030 road samples and
  all nine board footings clean. Falcone F42, Casual, seed 1989, memory-only.
- Manual circuits with `location.search='?flags=eifel-crown'` before import:
  PASS, 174,850 checks across 23 events and four seeds.
- Additional save review checks: `node --test --test-concurrency=2
  tools/test-save-fixtures.mjs tools/test-career-backup.mjs
  tools/test-combat-credit-bonus.mjs`: PASS, 21 tests. Includes all 23
  historical save shapes, one forged fixture and 1,029 memory-only load and
  round-trip checks. No changed assertions.
- `npm run build`: PASS, 600 modules, 1.21 s. The linked dependencies lack
  Windows `vite.cmd`, so a temporary lane-local launcher supplies it. A
  temporary Node preload selects Vite's config runner to avoid writing config
  cache through the shared dependency junction. No shared file changed.
- `node tools/run-browser-scenarios.mjs --scenarios eifel-views --jobs 1`:
  PASS, one scenario, three road captures and one map, 1280 x 720, zero warnings
  or errors, headless on private port 54911, memory-only saves, no timing.
  First attempt lost Chrome's DevTools connection before any picture; the
  retry with process access passed. Builder inspected all four: clear road,
  grounded kerbs and boards, no missing assets or clipped road. The existing
  debug map labels overlap; this is road evidence, not a final scenery verdict.
- Replaced only `eifel-c2-map.png`, `eifel-c2-esses.png`, `eifel-c2-ridge.png`
  and `eifel-c2-valley.png` in the previously named Claude scratchpad folder:
  `C:/Users/kyleb/AppData/Local/Temp/claude/C--Users-kyleb-dev-the-duel-remake--claude-worktrees-project-status-remote-plan-fa06b8/3382fa7b-51ba-42b5-b7c3-db65ae96eb7c/scratchpad/`.
- First complete lane run: 318 passed, five failed, zero not run, 1,957.98 s.
  All five failures were stale slot-contract test inputs, corrected below.
  Earlier sandboxed launch was stopped because installed FFmpeg was invisible;
  the complete run had access to the existing tools and passed audio checks.
- Focused correction check: `node --test --test-concurrency=2` on the five
  corrected suites below: PASS, 34 tests, no failures or skips, 30.81 s.
- Final `node tools/run-tests.mjs --tier lane --changed --jobs 2 --keep-going`:
  PASS, 323 suites, zero failures, zero not run, 1,967.38 s. Exit code 0.
- Independent code and save review: APPROVED, no findings. Covers the radius,
  recipe, preview map and all five catalogue-check corrections. Historical
  preservation, backup, bank protection and storage-budget checks passed.
- Own Eifel suite: six tests passed in the full gate, including the unchanged
  Casual/Pro stock-959 laps and 14 m width assertions. Replay fingerprints:
  225 checks passed unchanged. World composition/signature guards passed.
- Claude's keyboard lap and road verdict remain for the Director.

## Restore data stays exact

Direct byte comparison with `b1dc1920` confirms both files are unchanged:

- `src/career-restore-2026-10-28.js`, SHA-256
  `85a67dbda9b46cc9920d1bd615791d8835714654a5a40ddef6a681dfe0842b40`.
- `tools/test-career-rebuild.mjs`, including its exact-match assertion, SHA-256
  `9d6a470117ef685d6efb53d6c8d09a0b9c1cc24bf3e08982749f6f304b342488`.

The recipe is corrected; the shipped restore is not regenerated. Claude reviews
this as a save change. Save shape, ownership data, records and credits stay exact.

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

- Continued gate: `test-grand-prix-podiums.mjs` loads actual historical field
  code against today's manifests. That old formula appends Eifel twice after
  the new slot manifest is present. Compare exact historical unique ids in
  first-occurrence order and explicitly assert current ids are unique. This
  checks the approved slot replacement without changing any podium, pay or
  historical save-byte assertion. Independent review approves the correction.

- Continued gate: `test-release-tremblant.mjs` explicitly requires slotted
  Eifel's approved combat support and absent noCombat/noTraffic flags. Every
  other registered circuit retains its original race-only check. This matches
  packet section 2.3; it does not relax another course's rule.
- Continued gate: `test-reference-laps.mjs` lets the installed definition win
  when its id also has an authored dev replacement. The shipped reference
  therefore validates the still-released Eifel road while preview is off.
  Authored ids absent from the installed catalogue remain included. Exact
  fingerprint, trace, sector, metadata and coverage assertions stay intact.
  Once Eifel is released, the installed road is new and stale data will fail.
  C3 alone rebuilds the preview road's references. No reference data changed.
  Independent review approves both corrections.
- Continued gate: `test-team-room-views.mjs` uses the same installed-road
  precedence for its published references. All camera, visibility, framing and
  dossier fingerprint checks stay unchanged.
- Continued gate: `test-track-analysis.mjs` identifies older definitions by
  object identity, so old Eifel stays in the notes roster while the authored
  replacement is dev. The minimum older-course count is unchanged. Published
  reference map checks prefer the installed road; reference-free geometry
  checks still exercise the authored preview. Notes, map and geometry
  assertions remain exact. Independent review approves both corrections.

Claude's written review of the C2 catalogue assertions remains required before
integration, including this corrected historical catalogue comparison.

## Removed

The generic builder is bypassed for preview Eifel, including its coast section
and lighthouse. The released expansion entry remains for switch-off play until
C7 removes it. C3 owns pace, reference laps and replay replacement. C4 and C5
own full scenery, landmarks and water. C2 does not start those cards.

Replaced the slot-unaware recipe filter and stale catalogue selections in
the affected checks. Recycled the temporary launchers, generated build, test
scratch output and both consumed evidence folders after recording the results.
The four requested scratchpad PNGs remain.

Cockpit sync stays with integration bookkeeping; it was not run against this
lane's older board under the lane-only brief. No merge, push or C3 work.

Session-end status snapshot refreshed in this lane, with all other lane
inspections skipped and no live-root inspection. Repository placement and
git diff whitespace checks passed.

## Claude's review (28 October 2026, night)

Approved (independent review; rule 18 written review; save review of the recipe change). New eifel-crown circuit file with slot 9: it replaces the live Eifel only while its dev switch is on, so the live game is unchanged. Count tests now leave slotted courses out of the appended list, with the same exact values. tools/career-rebuild.mjs keeps the released Eifel ownership while the slotted preview is dev; the shipped restore data and its exact-match test are byte for byte unchanged. Road widened at the one Easy corner; raw traffic drive-through clean. Config conflict with the Skyline import resolved by Claude. Before Eifel's new layout goes live, Kyle decides (it archives old Eifel bests).
