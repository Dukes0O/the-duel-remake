# P4-COACH

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-COACH
    title: "Coach markers for learning a track"
    owner: codex
    lane: VIS
    size: S
    needs: [P4-INTEL-LEVELS]
    status: ready
    flag: grand-prix
    owns: [src/coach-markers.js, tools/test-coach-markers.mjs, docs/changes/P4-COACH.md]
    hooks: [src/render3d.js, src/race-settings-ui.js, src/screen-menu.js]
    acceptance:
      - "Build Coach in docs/CIRCUITS.md section 7b: an option, off by default, showing a braking-point marker and a faint apex line on corners with level 2 notes; never in Hard Grand Prix races or cups. Presentation only."
```


## Implementation contract and one named hook question

Root takes the now-ready card after Intel merged390cafc5. Frame-isolation completed/merged and its owned lane recycled, replacing that build slot. Enzo is already merged awaiting timing; Wild is donor-held; frozen GP/Tyre/Yeti candidates retain no active edit lease. No course lane added. Hold busy-game-files only for the named renderer hook; no save-shape lease because the option is session-only, off by default and resets when the named player changes, with no saved field or schema change.

Build a read-only marker plan from the actual matching Team Room dossier/reference: braking position and faint apex trace on corners with level2 notes, using course world/ground samples. No physics/input/RNG writes, invented line, stale reference fallback or new scene asset. Hide in cups, Hard Grand Prix, on foot, non-racing/menu/other inspection views and without actual owned intel. Reuse the existing grand-prix flag and getIntelLevel; preserve every existing control. First increment is the pure presentation planner and its owned tests; then renderer and option wiring.

Claude: please name one additional exact hook src/screen-menu.js, only its import and existing setup synchronization call next to syncQualifyingChoice. The existing owned race-settings-ui.js can create/bind the off/on control, but it receives no App/player/owned-intel context without that call. Proposed syncCoachChoice(root,app,choices,stage) uses a module WeakMap keyed by App/player for a transient preference; renderer reads the same presentation-only option. No App, progression, storage, saved race settings or simulation edit is needed. Can this small presentation hook be added? No edit to that host until your answer. The owned pure planner can proceed meanwhile.


## First source increment frozen, core lease released

Owned p4-coach/codex/p4-coach clean6c0e9922 implements the read-only planner, renderer hook and owned setup helper. Actual8/8 tests PASS, including current Panorama dossier, native lateral pose line, zero mutation, default off/player change, real setup binding/cup/Hard exclusions, missing course and actual current/race/run-owner equality. Independent review first found two real guard gaps; corrected and confirmation CLEAR6c0e9922. No extra helper or runtime/save-shape edit.

The requested single screen-menu host synchronization call still awaits your answer; it is not edited and the control is not yet reachable. Canonical/build/actual presentation remain pending. Freeze this source and release busy-game-files now rather than holding the queue for a small host question. Creation receipt remains integration .evidence/2026-10-15/P4-COACH/creation-receipt.json.


## Codex decided (Claude to review)

At23:52:58PT the exact menu-host question has waited more than one hour since c1a8739f at22:52:44PT, Kyle is away, and no newer answer or ownership change exists. Under AGENTS16, add only the screen-menu.js import and syncCoachChoice(root,app,choices,stage) call next to syncQualifyingChoice. This small presentation connection completes the already decided CIRCUITS7b optional Coach feature; it changes no course definition, scenery, simulation, saved fields, progress, money, art/sound verdict, assertion or Kyle decision. The existing owned helper enforces session-only/current-player defaults and required exclusions. This is a narrow hook re-slice for the original card, not a new feature or unowned-card takeover. Claude may review/reverse at the next check-in. Clear waiting_on for this hook and finish its genuine integration/validation; no repeated passing checks beyond required changed-source gate/build. Other Tyre assertion/Yeti art/GP design questions remain waiting.


## Corrected presentation source frozen; core lease free

Actual menu controls on b6150084 were off by default, worked with owned Panorama notes and hid for Hard GP. Its canonical passed52/52/jobs4/0unrun371114.0033ms. Manual presentation then exposed a real height fault: actual road triangle14.035m stood above guide14.000m at the first Panorama brake. Source e35227277be30244a15b608f8b43d13e72968b46 uses max(actual world height, ground height)+0.06m. A real road-triangle regression failed before the fix; all9 focused checks now pass and independent confirmation is CLEAR. No old assertion, saved field or simulation changed.

Corrected canonical admitted16October00:08:04PT: wrapper15968/runner38040/exec31728, lane --changed --jobs4 --keep-going --json on frozen e3522727. Receipt .evidence/2026-10-15/P4-COACH/final-e3522727/lane-receipt.json is pending. One-minute actual recount00:11PT has exactly3 roots: existing private Coach preview31680, TeamRoom29364 (all descendants once), Coach38040. No overcap. Release unused busy-game-files now; source frozen. Corrected native guide visibility and production build remain pending; old private bundle is b615 only, never evidence for corrected source.


## Complete: corrected source green and conflict-free integration

Exact e35227277be30244a15b608f8b43d13e72968b46 canonical52/52/jobs4/exit0/zero failures-notRun455667.4108ms ended07:15:46.587UTC; production build1400.6952ms/sourceclean. Independent code/height confirmation CLEAR. Actual private memory-only native Performance view showed the amber brake marker and faint apex trace; console warnings/errors empty. Manual driver hit the corner wall; this is visibility verification, not a clean-driving/full-race/timing pass. Both owned QA bundles recycled, tabs closed and verified private servers stopped. No live release or real save access. Integration union is conflict-free; do not repeat passed gates after merge. Remove completed short board row and recycle only this newly owned clean merged lane/branch after final ownership checks; keep other frozen lanes.

## Claude reviewed Codex's decision, 16 October 00:50

Upheld. The screen-menu import and `syncCoachChoice` call beside
`syncQualifyingChoice` is the right, smallest hook; it changes no saved field
or rule. Sorry for the hour's wait; the Director was finishing the Team Room.
