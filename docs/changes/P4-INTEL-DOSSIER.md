# P4-INTEL-DOSSIER - Team Room track dossier

Status: shared analysis, dossier data and native reference recipe implemented.
Full reference generation, Team Room UI and renderer/browser evidence remain pending.
Day/night renderer source is retained separately at `66b3c45b`.

## Decisions before code

- Extract the review tool's sampling, corner, crest, straight, name and trace
  analysis into `src/track-analysis.js`. Preserve its constants, smoothing,
  seam handling, rounding, fallback names and last-flying-lap review output.
  Re-export the existing public functions from the tool so its callers and
  unchanged tests still work. The tool keeps Node imports, CLI work, lap runs,
  picture output and its existing report format.
- Add a pure `analyseTrack(course, {trace})` assembly function for the screen.
  It reads the native course and an explicit reference trace. It cannot start
  a race, advance simulation, write a profile, use storage or call RNG. Copy
  caller-owned trace/feature data before any annotation. Without an actual
  reference, speed fields remain absent/null; never invent a measured speed.
- Expose the current blue/cyan/yellow/red reference-speed colour calculation in
  shared code with identical values. The tool's map drawing remains self-contained
  because browser QA serializes that function. A transport test proves exact
  intermediate colour parity. The dossier uses native x/z positions,
  the start direction and the same sampled corner/crest locations as review.
  The map has both readable labels and equivalent keyboard-operated controls;
  colour alone never conveys a flag or corner's meaning.
- Generate flags for every slow corner and every crest. The overtaking-zone
  fallback is the longest measured straight into a detected braking corner.
  A generated signature can identify the strongest measured crest or tightest
  corner, and must say it is a generated highlight. Authored names, positions
  and engineer notes take precedence when their schema is settled below.
- Generated notes describe facts present in the analysis: direction, measured
  reference speed, road position, crest and straight. Do not invent a gear,
  braking board, scenery landmark or player's history. Use "your engineer"
  until Kyle names them. Render authored text as text, never as HTML.
- TEAM ROOM belongs on owned, closed event cards, guarded by the real
  `grand-prix` feature query. It must not select a course, buy anything or
  change stored settings. Preserve card focus on close, support Escape and
  keyboard flag selection, and expose loading/error status for snapshots.
  No telemetry, intel levels, saved progress, rewards or qualifying in this card.
- A snapshot must use the native current world and a true driver-seat view at
  the flag's approach/braking position. It is generated on selection, displayed
  in memory and discarded on close. No stored screenshot assets. Do not move
  the real player/rival, swap the real race state or invoke a fake race. The
  missing renderer capture hook waits until TRACK merges and DAY hooks finish.
- UI actions use the existing interface interaction sound, with no new race
  event or sound cue. No dependency, network request or asset placeholder.

## Reference and metadata policy, settled before implementation

Claude's final contract is CIRCUITS 7b.1, integrated at `88770bbd`. The
Director recorded the additional owned files and fixture correction before code.

- Build one reference per real event/route. Legacy A/B/C use seeds 1989/42/17;
  other events use `fixed` and their layout seed. Use the Stuttgart 959-S,
  Club Driver, Medium, no upgrades: one warm-up followed by two flying laps,
  selecting the faster completed lap. No partial publication.
- The runtime file is `src/generated/reference-laps.json`, loaded through
  `src/reference-laps.js` as bundled data without a network request. Follow
  the exact 7b.1 keys, 20 m distance samples in km/h, lap/sector milliseconds,
  and measured corner fields. TELEMETRY consumes the same record and helpers.
- The disposable native fixture has no traffic, opponents, weapons, police
  or radar, and neutralizes objective/deadline completion fields. Native
  physics, surfaces, road geometry and ordered lap gates remain unchanged.
  The playground's `practice` flag also affects physics: preserve it in both
  the physical course and player. Only native lap/finish calls receive a
  completion facade with `practice:false/laps:3`; its physical course methods
  and legal-surface queries remain bound to the original course/Duel.
- Exactly three sectors, with equal-distance fallback. Authored `intel.sectors`
  gives the start of sectors 2 and 3. Routes override authored fields item by
  item. Corner note IDs are named-piece slugs or `c1` through `cN`. Preserve
  authored sectors, flag positions/cameras and note fields; fill only gaps.
  The generic registry contains no invented per-course author notes.
- Fingerprints cover sampled road positions, elevation, width, surfaces,
  named geometry and sector boundaries. A changed timing partition also
  needs new reference sector times. Missing/stale records must fail build
  checks with the rebuild command.
- The Director approved the narrow `course-access-ui.js` button hook because
  that file owns actual event-card markup. No generated-markup replacement.
- Shared `analyseLap` takes a complete native lap with exact start/finish
  samples and returns the same compact speed trace, corner and sector metrics
  for references and player telemetry. The Director approved additive corner
  `elapsedMs`, measured from actual entry/exit times including the start seam.
  Native zero-based gears become display gears. `brakeS` remains the review
  tool's suggested braking point; it does not claim actual pedal-on timing.
- The Director settled the fixed seed difference before native generation:
  production App forces 1989 for fixed events, while 7b.1 requires layoutSeed.
  The disposable fixture validates through App, then starts its native Duel
  with layoutSeed. Production App is unchanged. The reference fingerprint
  describes that actual course, not a different runtime seed. Native pedal
  samples are captured, but no unapproved pedal thresholds or advice is added.

The `grand-prix` catalog entry is FIELD-owned and absent at this base. The
feature must stay hidden until that real entry lands. A mocked switch proves
unit behavior only, not native entry acceptance. Renderer edits remain held.

## Test-first proposal

`node tools/test-track-analysis.mjs` failed first with `ERR_MODULE_NOT_FOUND`
for the absent shared module. The Director reviewed and approved the proposal
before runtime code. It now passes 172 checks across 24 native closed event/route
combinations. The unchanged review-tool suite passes 57 checks.
Coverage includes known stadium/circle geometry, the cyclic seam, frozen inputs,
RNG prohibition, authored piece names, explicit trace speeds and their absence,
shared map colours, and parity with the current review report's internal
geometry, real native ramps, and serialized map drawing. Existing
`tools/test-track-review.mjs` stays unchanged. No assertion was weakened.

Sector and authored-dossier cases also failed first on their absent exports.
The reference suite failed first on the absent build recipe, then passed 44
checks for route identity, complete-lap selection, distance/KPH sampling, actual
sector crossings, storage-descriptor restoration on errors and the completion
facade's physical method receivers and complete-set assembly. The optional
`--native` probe passes 50 checks: 720 playground physical steps exactly match
an equivalent direct Duel in position, speed, gear, heading, ground, air and
boost. Course definitions remain unchanged. A permitted single-event probe
completed three Pacific Canyon A laps and selected 49,996 ms, 200 samples,
fingerprint `track-v1-c1ebefb6`. No full data file has been published.

Shared lap and elapsed-time tests also failed before their exports/fields
existed. One implementation correction uses the actual finish sample's time
at a seam rather than rounding the whole lap before measuring a corner.

Remaining UI/browser checks cover owned and locked
tracks, the real feature switch, all existing closed circuits, keyboard focus,
flag captures in both presets, no saved images, course switching and exact
race/profile preservation. Native driver-seat position and native drawn pixels
must be witnessed; a requested camera field is not proof of the actual view.

No browser, frame, art, lane/build or release result is claimed. All heavy jobs
wait for the Director's quiet slot. Art sheets go to Claude via the Director.

## Removed

The duplicate geometry/speed analysis was removed from the review tool in the
same extraction; its existing exports delegate to the shared module.
No stored pictures, duplicate renderer, saved-state migration
or replacement reference-data implementation is introduced by this proposal.
