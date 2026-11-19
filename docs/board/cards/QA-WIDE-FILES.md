# QA-WIDE-FILES

Left by QA-CHECKS-BY-CARD (merged 16 November 2026). Claude's design card; the code that follows is small and Codex's.

With the long suites sent to the night, a lane's cost is now set by how many short suites one changed file picks. Codex
counted, for every game file, the suites a change to that file alone picks (the nine standing guards included). Most
pick under forty. These pick far more:

| File | Suites | File | Suites |
| --- | --- | --- | --- |
| `src/circuits/index.js` | 299 | `src/course.js` | 177 |
| `src/freestyle-course.js` | 283 | `src/rng.js` | 166 |
| `src/bowl/bowl-course.js` | 275 | `src/wasteland-access.js` | 138 |
| `src/expansion-courses.js` | 275 | `src/combat-weapons.js` | 118 |
| `src/progression.js` | 215 | `src/wasteland-tuning.js` | 117 |
| `src/circuit-manifests.js` | 178 | `src/summit-attack.js`, `src/drivers.js`, `src/arsenal/targeting.js` | 108, 103, 102 |

About 150 more files pick between 41 and 100. The whole table is in the merge commit of QA-CHECKS-BY-CARD.

## The question to settle before any code

Each of these is imported by a great many suites as a plain helper (a course list, the seeded generator, the unlock
rules). The runner already has the tool for this: `SHARED_FILES` in `tools/run-tests.mjs`, where a file is given a few
owner suites and importing it no longer picks a suite. For each file above, decide:

- which two to five suites truly test that file (its owners);
- whether the replay and world-signature guards, which run in every lane, already cover the rest;
- what the night then catches that a lane no longer does, and whether that is acceptable for that file. The save rules in
  `src/progression.js` and the seeded generator are the two to be most careful with.

## The same question for the nightly browser scenarios

QA-NIGHTLY-NEWS (merged 16 November 2026) runs, on a weekday, the browser scenarios for what changed. A change to any of
the five shared files picks all 222, and `src/render3d.js` changes on most art cards: against the last nightly's commit
(12 November) the rule picked every scenario. With nothing changed it picks 70 (17 that guard saved progress or pay, 53
that belong to no area). Watch the ledgers for two weeks (each records how many ran and how many were left for
Saturday). If most nights still run everything, rule which scenarios a change to each shared file really needs.

## What done looks like

A ruling per file in this card, then a Codex job that adds the owners to `SHARED_FILES` with a check in
`tools/test-test-runner.mjs`, and a before-and-after count for three recent real cards.

## Draft ruling (19 November 2026, for the Director's written review under rule 18)

Status: confirmed by the Director with one change (`src/drivers.js` stays as it is); see "Claude's ruling" below.

**How the runner picks today** (`tools/run-tests.mjs`, `docs/CODEX_PLAYBOOK.md` section 7). A lane runs the six smoke
suites and the three guards (`test-replays`, `test-combat-replays`, `test-world-composition`), plus every suite that
imports a changed file, reaches it one step further through a module that is not a hub (20 or more of the game's own
imports), or reads its path as text. A file listed in `SHARED_FILES` stops counting as an import: a change to it picks
only its owners and the suites that read it as text. The runner still walks *through* a shared file, so a suite that
imports `src/config.js` reaches every file `config.js` imports at the second step. Whatever its owners, a shared file
still picks about 21 suites: the nine standing ones and about twelve that read the whole `src` folder as text
(`test-build-status`, `test-repo-hygiene-rules`, `test-course-kit`, `test-medals` and others). The partial night's pick
(`--tier wide`, rule 13) ignores `SHARED_FILES`, the hub limit and the two-step limit, so every suite this ruling takes
out of a lane still runs on the next partial or full night: a night that reaches any one of these files picks 450 to
589 suites.

**Counts.** Each count is the lane plan the runner itself builds (`suitesForChanges`, then `selectPlan` for the lane,
long suites removed) for a change to that file alone, on `00382d70b`. They are a little above the table at the top
because suites have been added since 16 November. "Through a shared file" is how many of the file's second-step picks
reach it only through `config.js` or `feature-flags.js`. "Changes" counts commits to the file since 20 October.

| File | Today | Through a shared file | Changes | Ruling | After |
| --- | --- | --- | --- | --- | --- |
| `src/circuits/index.js` | 302 | 234 of 239 | 1 | narrow | 42 |
| `src/freestyle-course.js` | 286 | 263 of 280 | 0 | narrow | 25 |
| `src/bowl/bowl-course.js` | 277 | 273 of 273 | 2 | narrow | 25 |
| `src/expansion-courses.js` | 277 | 271 of 271 | 0 | narrow | 23 |
| `src/progression.js` | 220 | 0 of 32 | 11 | leave | 220 |
| `src/circuit-manifests.js` | 184 | 99 of 148 | 4 | narrow | 28 |
| `src/course.js` | 179 | 0 of 5 | 17 | leave | 179 |
| `src/rng.js` | 174 | 0 of 142 | 0 | leave | 174 |
| `src/wasteland-access.js` | 142 | 0 of 113 | 0 | narrow | 26 |
| `src/combat-weapons.js` | 123 | 0 of 72 | 4 | leave (Director's call) | 123, or 34 |
| `src/wasteland-tuning.js` | 122 | 0 of 77 | 0 | narrow | 26 |
| `src/summit-attack.js` | 109 | 0 of 89 | 0 | narrow | 25 |
| `src/drivers.js` | 104 | 0 of 72 | 0 | narrow | 27 |
| `src/arsenal/targeting.js` | 111 | 0 of 83 | 1 | narrow | 30 |

**The rule behind the rulings.** Narrow a data table or a small helper whose many importers use it to look something up.
Leave a file of game logic whose picks are mostly suites that import it directly, because those suites are its tests.

### The four course tables and the circuit list

`config.js` builds the course list from these files, so almost every suite reaches them through `config.js`. The replay
guard drives every enabled event (31 today, `titan-freestyle` and the expansion courses among them) and the
world-signature guard hashes every enabled event's scene, so a change that moves a released race or scene fails in every
lane. A lane would no longer run the suites that use these files only to find a course; the night runs them. Acceptable.

- `src/freestyle-course.js`: `test-freestyle-course` (every car drives on the quarry mountains' real surface),
  `test-practice-map` (exact map paths and markers of the original courses), `test-playground-rivals` (practice rivals
  and the freestyle drag strip), `test-mountain-support` (support under a car matches the visible mountain triangles).
  These are all three of its direct importers, plus `test-mountain-support`.
- `src/bowl/bowl-course.js`: `test-bowl-course` (the Bowl's layout and props), `test-bowl-save` (Bowl scores only rise,
  pay once and leave the rest of the profile alone), `test-bowl-air` (pitch control and landings).
  (`test-bowl-show` was in the draft; the review found it reaches no Bowl course file, so Part 2 leaves it out.) The Bowl is behind a dev switch, so
  neither guard drives it; its owners carry it. The session building this file today gains once Part 2 lands.
- `src/expansion-courses.js`: `test-expansion-geometry` (real mesh positions, no gaps or folds),
  `test-circuit-eifel` (Eifel's identity and road), `test-expansion-driving` (a long suite: a lane prints it as left to
  the night). The replay guard drives all of these courses.
- `src/circuits/index.js`: `test-circuits` (every circuit's road checks, dev circuits switched on),
  `test-circuit-panorama-registry` (a slotted circuit keeps its identity and access), `test-circuit-variants` (night,
  dusk and reverse versions are separate events and leave the parent road alone). A lane would no longer run 46 of its other
  direct importers, mostly helicopter and Lab suites that use `ALL_CIRCUITS` as a lookup; the night runs them.
- `src/circuit-manifests.js`: `test-circuits`, `test-circuit-panorama-registry`, `test-feature-flags` (each circuit's
  switch), `test-wasteland-beta` (released and dev switches stay apart), `test-career-rebuild` (saved careers keep
  circuit positions). Its 99 picks through `feature-flags.js` go; 15 other direct importers (mostly the single-circuit
  suites) leave the lane, and each circuit's own card still picks its suite through its own files.

### Small helpers

- `src/summit-attack.js` (24 lines, the Attack id, medal targets): `test-summit-attack`, `test-completion-screen`,
  `test-circuit-summit`, `test-course-access-ui`. The replay guard drives `summit-time-attack`.
- `src/wasteland-access.js` (39 lines, the gate rules and race switches): `test-wasteland-easter-egg` (the unlock
  belongs to the player who found the gate, and a race sees the new rules only from its start), `test-arsenal-core`,
  `test-career-rebuild`, `test-deep-save`, `test-heli-hooks`. `wastelandUnlocked` reads the profile, hence the two save
  suites. The combat replay guard drives a Wasteland race in every lane.
- `src/wasteland-tuning.js` (weapon and CPU combat numbers): `test-arsenal-core`, `test-arsenal-runtime`,
  `test-enemy-aim` (measured aim cones), `test-combat-projectiles`, `test-wasteland-career`. The combat replay guard
  fails on any changed number its fights use, and the night runs combat balance when a combat file changed. A changed
  number is a design number and gets its review under rule 17 either way.
- `src/arsenal/targeting.js` (88 lines): all six direct importers, `test-seeker-rockets`, `test-arsenal-runtime`,
  `test-arsenal-wave1`, `test-arsenal-wave3`, `test-crew-gear`, `test-road-riders`. It goes from 111 to 30 only by
  dropping picks through `combat-armor.js`, `audio.js` and the combat scene.
- `src/drivers.js` (94 lines): `test-drivers`, `test-driver-driving`, `test-driver-ui`, `test-career-rebuild`,
  `test-career-budget`, `test-storage-budget`. It holds `purchaseDriver` (credits) and the saved driver list, so the
  owners include the three save and budget suites. Unchanged since 20 September. Director: confirm or leave it as it is.

### Left as they are

- `src/progression.js`: leave. It is the save and money rules (1,032 lines), it changed 11 times in a month, and 171 of
  its 220 picks import it directly. The evidence is EASY-NO-PENALTY (`cb590cabe`): its change to this file needed ten
  other suites updated, every one a direct importer (`test-checkpoint-integration`, `test-combat-credit-bonus`,
  `test-drift-integration`, `test-driver-ui`, `test-fire-close`, `test-heli-fire-session`, `test-heli-save`,
  `test-milestones`, `test-wasteland-results`, `test-course-closures`). With five save owners for this file, a lane
  would not have run nine of them for that change (the tenth is also picked by `course-closures.js`). `test-progression` and `test-race-integrity` are in the smoke set already, and a change to this file
  already makes the night full (`NIGHT_FULL_FILES` in `tools/full-check.mjs`). Narrowing it to five save owners would
  take a lane from 220 to 27 and the two recent progression cards from 278 and 241 to 116 and 117: the largest saving
  on the table, and the one this card was told to be most careful with. Not supported by the facts.
- `src/rng.js`: leave. It has not changed since 12 June. Every course layout (`course.js`) and the scattered scenery
  (`world.js`) draw from it, so any change to its numbers moves every replay and world fingerprint and is a reviewed
  change of its own. Narrowing it saves nothing in practice. No suite tests `makeRng` by itself; the guards are its real owners.
- `src/course.js`: leave. It is the road and ground class, 17 changes in a month, and 154 of its 179 picks import it
  directly (18 more read it as text, 5 reach it at the second step); it is a hub, so the runner already follows none of
  its own imports. Its importers are the road, ground and course suites (`test-circuits` among them), which is what a
  road change has to meet in the lane.
- `src/combat-weapons.js` (418 lines of firing rules, 4 changes in a month, last by ROAD-RIDERS): recommended to leave,
  for the same reason as `course.js`: 29 suites import it directly and most are fights that fire it (`test-raiders`,
  `test-cpu-crews`, `test-road-riders`, `test-dustmonger`, `test-boarding`). The combat replays fire only the star,
  crossbow and bomb. If the Director prefers to narrow it, ten owners (`test-arsenal-core`, `test-arsenal-runtime`,
  `test-arsenal-wave1`, `-wave2`, `-wave3`, `test-combat-balance`, `test-raiders`, `test-cpu-crews`,
  `test-road-riders`, `test-enemy-aim`) take it to 34, and the Everburn forge-hold merge from 172 to 121.

### Before and after for recent real cards

Each card's changed game and tool files, as they stand today, through the same count.

| Card (merge) | Wide files it touched | Today | After this ruling |
| --- | --- | --- | --- |
| EIFEL-CROWN-C2 (`8a854a77a`, 28 Oct) | `circuit-manifests.js`, `circuits/index.js` | 359 | 81 |
| FIX-MANIFEST-AWAIT (`96273c71c`, 24 Oct) | `circuit-manifests.js`, `arsenal/targeting.js`, `combat-weapons.js` | 271 | 177 |
| MAP-SECRETS (`31830c082`, 24 Oct) | `circuit-manifests.js` | 244 | 181 |
| STORY-REPLAY-PICK (`bf0fa86fe`, 19 Nov) | `progression.js` | 278 | 278 |
| EASY-NO-PENALTY (`cb590cabe`, 16 Nov) | `progression.js` | 241 | 241 |
| ROAD-RIDERS (`ea19e0189`, 18 Nov) | `combat-weapons.js` | 228 | 228 |

The three most recent cards gain nothing: each changed `progression.js` or `combat-weapons.js`, the files this ruling
leaves alone. The ruling pays on course and circuit cards (EIFEL-CROWN-C2 from 359 to 81). MAP-SECRETS and
FIX-MANIFEST-AWAIT keep most of their count because their other files pick widely too.

### An alternative for the five course files, for the Director

The playbook's words are that a shared file never selects a suite by being imported. Today the runner still walks through
`config.js` and `feature-flags.js` to the files they import. Stopping the second step at a shared file, as it already
stops at a hub, cuts the same five files nearly as far (`bowl-course.js` 277 to 22, `freestyle-course.js` 286 to 40,
`expansion-courses.js` 277 to 23, `circuits/index.js` 302 to 83, `circuit-manifests.js` 184 to 88) and keeps every direct
importer, including suites written later, with no owner lists for those five. It is one line of picking logic rather than
five entries, and it would also change what other files `config.js` imports pick. Recommended to stay with the owner
lists, as the card asks; the alternative is here so the Director can choose it.

### What Part 2 costs

`tools/run-tests.mjs` and `tools/test-test-runner.mjs` are full-scope files: a change to either makes the lane run every
short suite. Part 2's one lane tier is therefore a whole short tier and should take its turn when few other heavy jobs are running.

### The browser scenarios (the card's second question)

Not answerable yet. Since QA-NIGHTLY-NEWS (16 November) only one night has finished (`night-2026-11-18`), and it was a
full night that ran every scenario; neither the November ledgers nor the evidence they name record how many scenarios a
partial night picked or left for Saturday. The two-week watch stands.

## Claude's ruling (Director, 19 November 2026; the written review rule 18 asks for)

Confirmed as drafted, with the owners listed above:

- Narrow: `src/circuits/index.js`, `src/freestyle-course.js`, `src/bowl/bowl-course.js`, `src/expansion-courses.js`,
  `src/circuit-manifests.js`, `src/summit-attack.js`, `src/wasteland-access.js`, `src/wasteland-tuning.js`,
  `src/arsenal/targeting.js`.
- Leave as they are: `src/progression.js`, `src/rng.js`, `src/course.js`, and `src/combat-weapons.js` (the
  recommendation is taken: most of its importers are fights that fire it, and the combat replays fire only three weapons).

The one change: leave `src/drivers.js` as it is. It holds `purchaseDriver`, which is credits, and it has not changed since
September, so narrowing it saves nothing today and removes cover from a money rule.

Nothing is loosened by this ruling: no assertion changes, every suite taken out of a lane still runs on the next partial
or full night, and the replay and world-signature guards run in every lane. Stay with owner lists; do not change how the
runner walks through a shared file.

Part 2's checks, sized to the change: it alters only which suites a lane picks. Run `tools/test-test-runner.mjs` with the
new check, the runner's other own suites, and print the lane plan for three changed-file cases (`src/bowl/bowl-course.js`
alone, `src/circuits/index.js` alone, `src/progression.js` alone) to show the counts. Do not run the whole short tier that
a change to `tools/run-tests.mjs` would pick: tonight's night check is a full one (shared game files changed today) and
runs every suite, and the laptop is short of memory. Run `npm run build` only if a file the build reads changed.
