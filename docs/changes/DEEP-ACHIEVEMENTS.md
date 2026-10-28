---
task: DEEP-ACHIEVEMENTS
status: building
flag: the-deep
---

# DEEP-ACHIEVEMENTS

## Design settled before code

Read-only shelf beside the cup case, gated by the-deep. With Lab off only
Raised from the Deep appears; with Lab on all six appear. Raised comes from
the raised car; running from Sirena ownership; Restored from the owned finish
(including the old single-restore compatibility view). These facts have no
stored dates: say "Date not recorded", never invent one or write on load.
Only Wreck racer and the two Coast Cup wins use an optional achievements list,
with first-earned UTC timestamps. Use the race-start paint snapshot, never a
later garage selection. Record after valid settlement, with both switches on.
Coast Cup trophies require a win at Pacific Canyon in the named finish; the
existing once-only Coast Cup finish payment stays as designed. No new reward
or sound event; the shelf reads progress and existing finish cues still play.
Wreck racer includes combat, Summit Time Attack and Grand Prix with career
pay off. The last of these records achievements without turning on payouts.

Checks: new headless achievement/save/settlement checks, lane tier --changed
with four jobs, production build; memory-only shelf scenario and compact JPG.
One independent save-code review. No frame check: no scene code changes.

## Changed assertions

None. Six new tests cover read-only derived progress and legacy restoration,
optional save round trips and first-earned dates, duplicate settlement,
invalid and disabled results, combat/Summit/Grand Prix paths, historical
fixtures, and the real App's race-start paint through a no-pay GP finish.
Existing assertions, tolerances and race/world fingerprints are unchanged.

## Independent save review

Save guardian: clear after fixes. Review found skipped Wreck racer paths in
combat, Summit Time Attack and GP with career pay off; all fixed and confirmed.
The real App earns both wreck trophies through a trusted GP finish, persists
them, keeps the wallet unchanged and makes duplicate settlement a no-op.
Final qualifying guard reviewed: driving qualifying awards nothing; a race
after qualifying completes earns and persists achievements, with no debit.
All 23 historical plus one forged fixture pass 1,029 preservation checks.
Damaged profiles pass 86 tests / 3,654 checks. Combat credits, fines, quitting,
reload, backup/migration and recovery checks pass. Storage model: 3.60 / 4 MB;
the three optional entries add at most 322 bytes per player. Old profiles
gain no achievements field when loaded; save failure notices remain intact.

## Checks and picture

New achievement suite: six tests pass. Lane selection:
`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going --json`:
199 suites, initial 192 pass / seven fail, none unrun (570.37 seconds).
The final qualifying guard delta used the existing runner's `main` with
`getChanges:()=>['src/app.js','tools/test-deep-achievements.mjs']`, same lane
options: 28 selected, 26 pass / two fail, none unrun (166.70 seconds).
The two were the already-known Deep import placement and Windows tar failures.
Moved the shared registry beside the trophy code, with identical logic;
`test-deep-look` then passes all 5,287 checks and achievements passes all six.
Reran only the six tool-access failures with System32 first in PATH and the
needed subprocess access: drive-through, full-check, p4-audio, review-evidence,
warlord-blackiron and warlord-tollkeeper all pass (20.39 seconds, four jobs).
Across the union: **199 distinct suites, latest results all pass, none unrun**.
No assertions or tolerances changed to fix these failures. The initial run
could not spawn PowerShell/ffmpeg and chose a non-Windows tar for drive-through.
Final production `npm.cmd run build`: pass, 1.08 seconds; existing large-chunk and
dynamic-import warnings only. Used npm.cmd because PowerShell blocks npm.ps1;
Vite needs access to the integration-linked dependency cache.
`deep-achievements` browser scenario: pass, two pictures, zero warnings/errors,
private port and memory-only saves. Lab mode shows earned, dated and hinted
entries; live switches show exactly one achievement. Picture:
`docs/board/looks/deep-achievements/round-1.jpg` (92 KB).
Cockpit sync: zero tasks changed. No live checkout or real player save accessed.
No race or world fingerprints changed. Lane commit only; no merge or push.
Raw screenshots, gate logs and generated build/QA output recycled after review;
the scenario recipe, compact JPG and verdict remain.

## Removed

Move the pure shared achievement registry out of the isolated Deep scene
folder to `src/achievements.js`, beside its trophy presentation and save hooks.
The Deep import guard and its approved import list remain unchanged.
No replaced asset or save migration.

## Round 2: look-only polish (Claude verdict, Kyle request)

Replace browser-default bullets with compact garage tiles: three columns on
desktop, two below 900 px. Use the garage's dark panel gradient, border,
Segoe UI type and warm gold. CSS medallions are gold when earned and dim
outlines when hinted. One line below the name shows EARNED and a UTC date
only when known, or the hint in italics. No rule, save or award code changes.

Changed assertions: per Kyle's explicit wording request following Claude's
look verdict, the existing presentation assertion and scenario now reject
"Date not recorded" instead of requiring it. No save or race assertion changes.
The scenario also checks three/two columns, three earned icons and three
italic hints. All six achievement tests pass. Production build passes
(1.26 seconds, existing chunk/dynamic-import warnings only). Browser scenario
passes at 1280 and 800 px, three screenshots, zero warnings/errors. The live
switch view still has only Raised from the Deep. Lane tier --changed, jobs 4:
200 suites, 199 initially passed, none unrun (521.79 seconds). The remaining
review-evidence failure required the standard `round-N-review.md` note names;
renamed the shelf's two review notes, staged them for its tracked-file check,
and reran only that suite: nine tests / 379 checks pass. Latest results across
all 200 selected suites are green. No further source changes or weakened checks.

Picture: `docs/board/looks/deep-achievements/round-2.jpg`.
Independent UI review: clear, including the actual round-2 picture. Icons
are decorative and hidden from screen readers; earned state also has text;
dates use semantic time elements and hints stay escaped. No faults found.
Removed: plain bulleted shelf markup and the unknown-date label. Renamed
review notes in place; kept no duplicate copies. Generated build/QA output
and consumed raw evidence recycled. Cockpit sync: zero tasks changed.
