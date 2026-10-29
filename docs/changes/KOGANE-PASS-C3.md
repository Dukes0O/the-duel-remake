# KOGANE-PASS-C3: pace check and failed baseline

Status: unfinished. C3 is not ready to merge as complete. Switch: dev.

## Changed

Added `--pace [easy|medium|hard]` to the course's own test. It runs 30 seeds
per selected difficulty with the existing field-balance controller, manifest
Stuttgart 959-S, club driver, explicit .95 skill and five computer cars plus
the player. Saves are memory-only. From PowerShell:

```powershell
$env:LINE_SKILL = '.95'
node tools/test-circuit-kogane.mjs --pace
```

The card records ownership, checks and the unresolved controller question.
No production recipe met acceptance. No lines changed in
`src/circuits/kogane-pass.js`, including scenery, pace and driver fields.
`src/race-field.js` is unchanged. No replay fixture was added. Open roads
have no reference lap file, as with Summit Run. No event or sound was added.

## Pace findings

The original settings, field-balance skill .95, Easy 30 seeds: 150/150
computer finishes, zero early pile-ups, 23 computer crashes, zero player
wins (target 60 to 80%), 0.733 computer passes per race and mean position
5.3. Player time: 133.581 to 157.292 s, mean 142.5963 s. Acceptance fails.
The Medium and Hard 30-seed batches were not run after this failure.

Temporary probes, not accepted recipes:

- Native solo Stuttgart .95: 106.98 s. With lineSwing .2: 105.89 s. Both
  clean. Solo evidence does not establish six-car acceptance.
- Native six-car driver, original line/following and pace .90/.88/.88,
  seed index 0: Easy/Medium/Hard 113.935/112.418/111.151 s. Crashes, no wins.
- Field-balance .95, lineSwing .2, holdRacers true and pace .90, seed index
  0: 127.650/126.365/123.023 s. All computers finished, zero computer
  crashes, passes 2/2/0, no wins. One seed is not the 30-seed safety proof.

Kogane already copies Summit's line and following settings. The native
line driver uses track-script speeds and has no following speed cap. The
field-balance driver uses a separate speed profile and follows traffic.
They are different controllers even at .95. Claude should name the field
controller and next slice; the card recommends keeping all targets and
allowing a course-specific driver hook if needed. These probes do not
prove that every course-only recipe must fail. No shared driver was edited.

## Checks and review

- Ordinary course test: Casual 109.81 s, Pro 109.32 s, native finishes,
  no crashes or resets.
- Manual drive-through: passed, zero issues.
- Manual circuit suite with the Kogane switch: 208,982 checks passed,
  28 events, four seeds.
- PowerShell lane gate, jobs 2: 21 passed, zero failed or not run, 392.59 s.
  Replay guard: 270 checks; world composition: 57 checks, unchanged values.
- Production build: passed, 1.52 s. Temporary lane-local Windows Vite shim
  used the native config loader, keeping scratch out of shared dependencies.
  Existing chunk-size and mixed-import warnings only; no dependency changed.
- Final centreline candidate: not run; no shared slot opened in its bounded
  two-minute wait. No result or safety claim is made for it.
- Independent review approved the diagnostic check after three corrections:
  passes checked per Medium race; time names Medium seed index 0; all five
  computers must finish in at least 29 of 30 races per difficulty.
  This is not approval of C3 completion. No browser or frame check ran.

## Assertions and fingerprints

No existing assertion, tolerance, fingerprint or world signature changed.
New assertions require six cars, manifest skill, player finishes, field
completion, existing pile-up/win targets, three passes in each Medium race,
zero computer crashes and the Medium index-0 time in 98 to 106 s. Claude's
written assertion review is pending. No target was loosened.

## Removed

No production code or asset was replaced. Lane-only probes, logs, temporary
shim and build output were recycled after recording their verdicts. No
external scratchpad or evidence folder was created or changed. Cockpit sync
was not run because this job is confined to its lane.
