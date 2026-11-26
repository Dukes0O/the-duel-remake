# Codex playbook: The Duel factory

Read SPEC section 0, AGENTS.md and docs/FACTORY.md first. Factory rules 11–15
win over older gate, queue and lane instructions. Use docs/README.md and the
current board to find a card. Kyle sets direction and says “go live”; Claude
chooses art and sound, with six rounds as a guide and not a stop.

## 1. The short version

Build in isolated lanes. Keep at most six build lanes active across all lines,
with no more than three course lanes. A card owns files and names shared locks; cards
holding the same lock never build at once. Each test run uses at most four jobs.
A clean green lane with a build and one clear review merges immediately.
There is no queue wait for an unrelated lane and no rerun after a clean merge.
Heavy checks belong to the full check: one batch a day, by default while Kyle
sleeps, on a copy of one commit. Builders keep building and merging while it
runs; only its frame step needs the laptop to itself.

## 2. Words used here

| Word | Meaning |
| --- | --- |
| Worktree | A separate checkout on its own branch, sharing Git history |
| Lane | One card's builder and checkout |
| Lock | A named group of shared files with one active owner |
| Gate | A check required before a change moves on |
| Fingerprint | A code from a replay; an unchanged code means unchanged behavior |
| Integration | integration/wasteland, where reviewed lane changes meet |
| Change note | docs/changes/<id>.md, at most about 15 lines: what changed, checks and commit, changed assertions, removals; deleted with its card in the merge commit |

## 3. Production lines

The course, feature and world graphs in FACTORY section 3 show dependencies.
Steps with no dependency arrow can run together. Course art and layout can be
built in parallel. World art, simulation, saves and sound use separate lanes.
The Director keeps these lines supplied within their limits and lock ownership.

## 4. Roles

| Role | Responsibility |
| --- | --- |
| Kyle | Direction and play notes; AGENTS rule 18 lists the few things that wait for him |
| Claude | Design packets, art and sound picks, finishing passes |
| Director | Cards, ownership, locks and immediate shared metadata commits |
| Builder | Card files, meaningful tests, implementation and targeted gate/build |
| Reviewer | One independent review of the frozen change |
| Integrator | Validate evidence, merge immediately, commit metadata and safe cleanup |
| Full check | Full tests, frames, combat balance and browser scenarios, once a day on a copy of one commit |
| Release Manager | Exact release gate and approved live installation |

Extra helpers are for saves, money, pay, releases and art rounds, as AGENTS
rule 6 requires. Other work needs the builder's tests, targeted gate and one
review. Existing helper configurations live in .codex/agents/; do not copy old
configuration templates over them.

## 5. Ownership

A card's owns and hooks are its editing boundary. Ask the Director to add a
hook before touching another file. Read locks from the current board and
FACTORY section 2. Respect other builders' changes. A dependency junction
may point only to integration's node_modules, never to the live checkout.
New branch names use codex/. Retained lanes keep their work until accepted,
replaced or explicitly dropped; being idle is not permission to remove one.

## 6. How one task flows

1. Pick only a Codex card shown by node tools/board.mjs as ready to start.
   The Director claims it and commits board/inbox/STATUS changes immediately.
   A design question goes to Claude in writing; move to another card while waiting.
2. Start from current integration in an isolated lane. Settle the card's design
   in its card's file before code. Use meaningful acceptance tests first when
   the behavior needs tests. A docs-only card does not need wording tests.
3. Build inside owned files and granted hooks. Keep seed/input behavior
   repeatable and views unable to change race state. Never touch real saves.
4. Freeze the source commit. Run node tools/run-tests.mjs --tier lane --changed
   --jobs 4 and npm run build once in the lane. Keep the original result and
   build log pinned to that clean commit. Fix a real failure in the lane.
5. Get one clear review. Use additional required save/art helpers only when
   rule 6 or the card calls for them. Claude judges art, six rounds being a guide and not a stop (SPEC 0.11).
   Daytime builds do not add full, frame, browser or balance checks; the full
   check owns those checks. `tools/full-check.mjs` uses a detached source copy;
   builders keep merging and only its frame step requires a quiet laptop.
6. Hand the exact source, green lane/build evidence and review to the Integrator.
   An independent clean lane can merge after another lane without syncing
   or rerunning solely because integration advanced.
7. Merge immediately. A clean merge does not rerun the lane tier. A conflict
   returns to the builder for resolution, one fresh targeted lane/build and review.
   Commit board/inbox/STATUS at once and add one run-log sentence per merge.

Record design, test or behavior changes, verdicts and Removed in the change
note. Do not make a commit solely to record a test result. Fold verdicts into
real work or the merge's shared metadata transaction.

## 7. Gates and evidence

| Gate | When | Command or evidence |
| --- | --- | --- |
| Targeted lane and build | Frozen lane before merge | node tools/run-tests.mjs --tier lane --changed --jobs 4; npm run build; one clear review |
| Behind an off switch (AGENTS rule 23) | A card whose work players cannot reach, with no save, pay or released behaviour changed | The card's checks, `--filter core`, the three guards (`test-replays`, `test-combat-replays`, `test-world-composition`) and the build; merge when green; no lane tier, no wait for a drive or look |
| Conflict fix | After resolving a real conflict in the lane | The suites for the files in conflict, the build and a review |
| Fix after the lane run | Any later change on the same card | `node tools/run-tests.mjs --tier lane --changed --since <that run's commit> --jobs 4`: only the suites for the files changed since that run, never the tier again |
| Full check | Once a day, on a copy of one commit; only the frame step needs the laptop alone | Full tier jobs 4, both frame qualities, combat balance --check on current rules, the browser scenarios for what changed (all on Saturday night); passed, passed with standing failures, or failed (AGENTS rule 13) |
| Release | Before live access | Full green on the exact final release commit and all applicable release evidence |

The targeted lane includes smoke, replay and world-signature guards, plus
suites that import or read changed paths within two steps. The second step
never passes through a hub (a module that imports 20 or more of the game's
own files, such as `game.js`, `app.js` or `world.js`), and the shared files
(`game.js`, `main.js`, `render3d.js`, `app.js`, `config.js`,
`feature-flags.js`) select only their owner suites and the suites that read
them as text: the smoke set and replay guards drive them in every lane. So do
the course tables and small helpers listed with their owners in `SHARED_FILES`
(QA-WIDE-FILES, 19 November 2026); `progression.js`, `rng.js`, `course.js`,
`combat-weapons.js` and `drivers.js` stay ordinary files on purpose. Suites
in `NIGHT_ONLY_SUITES` run only in the full tier, and every suite that takes
three minutes or more alone belongs there (Kyle, 16 November 2026, after the
audit: two suites of 69 and 26 minutes were 63% of a lane run's check
minutes). A card whose own subject is such a suite's subject names it and runs
it in its narrowest form (`test-everburn-easy.mjs --job <name>`). The lane
tier prints the long suites it left to the night. Unmapped game files do not
trigger a full daytime run; deeper effects belong to the full check.
A failing lane blocks that lane. A full-check failure puts its fix first while
other merges continue. A suite failing without changed game code gets one
same-commit rerun under AGENTS rule 3; a passing rerun becomes a small unreliable
check card, with no changed assertion or tolerance.

Run node tools/build-status.mjs after merges and at session end. Commit its
STATUS output and all board/inbox edits immediately. There is no merge-count
or elapsed-time full deadline. The full check uses a detached copy of one
commit; only its frame step runs alone. Exact release provenance still matters:
finish source and release notes before the final release full run; a later
commit needs its own full pass before release.

For release, keep build, full, combat balance --check (current rules), all browser scenarios,
frames, art intake and applicable save/storage evidence. Unmeasured is not
passed. Frames follow AGENTS rule 8: one busiest-view run per quality with
eight cars, delivered p95 at most 18.5 ms and construction under one second.
Never time an art round or hidden unfinished content. Do not alter existing
assertions or fingerprints without a reviewed reason.

Before a lane hands over a change to a job's rules, places, lines or sounds,
the builder searches `tools/` for that job's ids, place names, line ids and cue
names and runs every suite found, once. A long one is run in its narrowest
form for the job in hand (`test-everburn-easy.mjs --job <name>`); the whole of
it, and `test-run-gas-medium.mjs` when the card does not change the gas run,
are left to the night. Short rounds that run only the
suites being worked on never meet these. At the merge of the remade Hot
Delivery (16 November 2026) six older suites failed that no round had run. A
new sound cue joins the old pin's exclusion list in `test-p4-audio.mjs`. A thing
placed beside a road's own line needs its own check in
`test-scablands-size.mjs`; a thing placed from a named place uses whole eighths
of a metre, so that it keeps its exact offset when that suite moves the place.

Three more from the same merge, each found only by the last lane tier:

- **A new solid** on the land: run `test-everburn-play-start.mjs` (every job's
  car and camera start 3 m clear of every solid) before anything else.
- **The renderer's text is read by suites.** `test-frame-metrics.mjs` and
  `test-scene-presentation.mjs` match the lines of `src/render3d.js` between the
  main view's draw and the mirror's. Put a new rule in the module that owns the
  thing (`rearViewActive` in `src/rear-view.js` for the mirror), not between
  those lines, and run both suites after any edit near them.
- **A browser scenario's page keeps running** between the script's calls. A
  picture that must be taken at an exact moment steps to that moment inside the
  same call that measures it. A scenario that was only parsed, never run in a
  browser, is not checked: say so in the change note, as a thing still owed.
- **A scenario written without a browser starts a story job this way**, or it
  stops at its first step (slices 8 and 9 of EVERBURN-REMAKE, 17 November): the
  test player's story entry carries its version (`story:{version:1, ...}`), or
  the save drops it; the player goes to the yard first (`#wasteland-visit`, then
  wait for `isYardHomeActive()`), because a job starts only from there; and the
  job's actors and its fighter exist only once the state's status is `racing`,
  so wait for that and do not set the countdown to 0. A picture aimed by the
  scenario's own camera is held as a still over the page, because the game
  draws its own view again before the screenshot is taken.
- **A design that names places is measured against the land first.** The salt
  riders were designed to give up at the Pipe, which the road crosses before
  it reaches the pan. Print the way's line, its regions and the places' own
  coordinates before writing a rule that races to one of them.
- **A cause written down from a hand play is measured before it is cured.** Two
  of the causes recorded from job 2's hand plays on 17 November were wrong: F was
  not blocked during the opening lines (the hearth was), and the view had no
  resting tilt (the hand-drive tool's own mouse press had tilted it). Read the
  state at the moment (`eval:` in `tools/hand-drive.mjs`) or the rule's code
  first; write the fault as what was seen, and the cause only once it is measured.
- **A cure with a cost gate that fails twice gets a new method**, not a third
  try of the same one. Drawing creased ground finer failed three times; the
  cure that stands draws what stands on the land at the drawn ground.

**Scripted drives.** A brief asks for at most one scripted drive that proves
a job can be finished, by one way, and the card names it. Six such drives on
Hot Delivery took about five Codex hours and 149 of 228 saved changes, and the
two faults a player would have met were found by hand. Rules are proved by
checks that step the rules without driving. A way nobody has driven is driven
by hand before it is shown.

### Integrator command

Run tools/integrate-lane.mjs from the factory checkout with explicit
--integration ROOT --lane ROOT --card ID --evidence JSON. The JSON packet has:

- schema: 1, card and the exact clean lane commit;
- lane: that commit, the targeted command as an argument array, and the original
  --json runner result (complete green lane, jobs at most four);
- build: that commit, command [“npm”, “run”, “build”], exitCode 0, durationMs
  and a nonempty log path under the lane's .evidence/;
- review: that commit, reviewer name and passed: true.

Optional --metadata JSON is a map of new file contents for board.yaml,
playtest-inbox.md and STATUS.md only. The caller owns those decisions.
After FAC-06, closing a card removes its open entry and adds its ID to completed;
supply that board change in the same metadata map. The script refreshes STATUS,
adds one sentence from the actual gate/build/review and commits metadata at once.
It never runs a gate, build, browser check, release or push. A failure after the
source merge requires repairing its pending metadata before the next merge.

Cleanup is opt-in: --recycle-owned RECEIPT --run-id ID --run-started-at ISO.
The receipt supplies newlyCreated: true, exact lane and branch, matching runId
and createdAt within this run. It is the caller's proof of ownership, not an
inferred age test. Only a clean fully merged codex lane can be recycled.
The integration-only node_modules junction is detached first. Recycle Bin has
no permanent-delete fallback. A dry-run prune must name only this missing
registration; otherwise stop. Retained or unrelated lanes stay.

### Janitor sweep

Keep sweep work separate from feature cards. Fold consumed evidence verdicts
into current notes, then remove only owned consumed output. Run repo-audit for
proven unused files; uncertain findings become cards. Compare sizes with
size-targets.json. Leave idle unmerged lanes and Kyle's branches in place.
Never force-remove a worktree or rewrite history without explicit authorization.

## 8. Feature switches and releases

New features remain dev until their accepted design and applicable checks are
complete. Claude makes art and sound picks and decides go-live (AGENTS rule 18);
Kyle hears about each release afterwards and can overrule any pick.
The Release Manager follows OPERATIONS: exact release full, master fast-forward,
staged build, no retained rollback build, hashed assets before index/manifest, and no
forced reload of an open race. The Release Manager pushes integration/wasteland
after every release as a plain fast-forward; AGENTS rule 22 covers history.

## 9. Player touchpoints

Kyle plays the live game, leaves notes in playtest-inbox and can stop work at any time.
The Director routes notes into cards. Lost progress, crashes and broken races
go first. After release, the inbox's Latest release line is replaced: what changed, in one or two plain sentences.

## 10. Files and notes

Current AGENTS.md is the rule source; do not paste an older duplicate template.
The board names ownership, dependencies and locks; FAC-06 moves open details
under docs/board/cards/. A change note is at most about 15 lines: what changed,
the checks run and on which commit, reviewed behavior/assertion changes and Removed.
Its essentials go in the merge's commit message; the note and the card's file are
deleted in the merge commit (Git keeps them). Settled design that must last moves
into the current docs for that area, not into a note.
Evidence lives in ignored .evidence/<date>/<card>/; keep recipes, not raw output.
Only runtime assets go in public/. Lanes never edit README or VERIFICATION.

## 11. Ports and folders

| Purpose | Location |
| --- | --- |
| Live game | C:/Users/kyleb/dev/the-duel-remake, localhost:5174, Release Manager only |
| Integration | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake, integration/wasteland |
| Lanes | Separate codex branches under C:/Users/kyleb/.codex/worktrees/wasteland-integration/ |
| Preview | Integration .preview-dist, 127.0.0.1:5195, memory-only |
| Browser QA | Harness-selected private port/profile and memory-only storage |

A private port alone is not save isolation: QA must install memory-only storage.
Never refresh the live race, use 5174 for QA or link to live dependencies.

## 12. Thread prompts

Director: read the current board and FACTORY graphs, claim ready cards, enforce
six total build lanes, at most three course lanes and shared locks, and commit
shared metadata immediately. Keep independent green lanes moving.

Builder: read the card and SPEC/AGENTS/FACTORY, settle design before code,
write meaningful tests when needed, stay in owned files, freeze source, run
one targeted lane/build and obtain one review. Hand current evidence to the
Integrator. Do not add daytime full-check work.

Integrator: validate exact clean lane evidence, same repository and one review;
merge promptly. A clean union keeps its existing green evidence. Send a conflict
back for one fresh lane/build after its fix. Commit one run-log sentence and
shared metadata immediately. Recycle only caller-proven newly created clean lanes.

Full check: Claude's, not Codex's (Kyle, 18 November 2026, to save Codex's allowance). The Windows task runs
`node tools/full-check.mjs --idle-awake --no-push` once a day; Claude reads the report, names the first merge after the
last green full check for a failure, puts its fix first and allows other merges. Codex runs or cures a night check only
when Claude hands it a card.
Release Manager: only after Kyle says “go live”, require full on the exact
release commit and all applicable evidence, then follow OPERATIONS safely.

## 13. Foundation history

The September foundation and cleanup sequence is finished. Its task history is
in Git; use the current board and FACTORY for new work.

## 14. Autonomous sessions

One Director can keep the factory running through successive ready cards.
Separate lanes share history, not editing ownership. Follow the same limits,
locks and gate rules as manual sessions. Resume by reading the current board,
FACTORY, inbox and retained lane notes. Preserve pending work and decisions;
there is no old four/five-lane limit, merge queue or full-run deadline to restore.
When Kyle pauses work, drain existing jobs and stop new work. When a session
ends, commit shared status/inbox/board immediately; use the scheduled full
check. Tonight's 03:45 to Record night/06:30 pause still applies.

## 15. Codex in its cloud

Kyle, 18 November 2026: Codex builds from Claude's cards in its own cloud; Claude designs and merges on the laptop. The
cards and rules reach the cloud through GitHub, where `integration/wasteland` is pushed after each merge batch.

**Start of a card.** Read `AGENTS.md`, then the card in `docs/board/cards/`, then the design page it names. Take only a
card that `node tools/board.mjs` lists under CODEX CAN START NOW and that nobody has claimed. Cut `codex/<card>` from
`origin/integration/wasteland`, and as the first commit set the card's `claimed_by` on the board to "Codex (cloud)" with
the date, so that two sessions never build one card.

**What a cloud cannot do, so does not try.**
- Start a browser. Write the browser scenario the card asks for, prove that each string it sends to the page parses
  (`new Function`), and list it under "For Claude to run".
- Run the laptop-only suites (`AGENTS.md`, "Gates") or a frame check. List them.
- Listen, or look at a picture. Say plainly that nobody has.
- Reach the Cockpit, the live game or any player's save.

**What it does.** The card's own checks; every older suite that names what the card changed; the lane tier once
(`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`); `npm run build`. A cause is measured before
it is cured. A test's assertions change only because the card changed what is true, and each one is listed.

**Questions.** Never wait on a question. Write it to `docs/board/questions/<CARD>.md` on the branch (what needs deciding,
the options, the pick), push, and carry on with the pick. Saves, money and pay, and a released course are the
exceptions: stop there.

**Handing over.** Write `docs/changes/<CARD>.md` (15 lines at most). Open one pull request into `integration/wasteland`
whose text is: what was built; each check and its result, with the commit; "For Claude to run"; "Changed assertions";
"Codex decided"; what is not right yet. The laptop reads the diff, runs what the cloud could not, and merges.

**The channel between Codex and Claude** (Kyle, 25 November 2026: "we need a way to share issues between you two").
Nobody carries messages by hand, and nobody waits in a chat.
- *Codex to Claude.* Write the question to `docs/board/questions/<CARD>.md` on the card's branch, push at once, and
  open the pull request as a draft at once, so the branch is seen. Claude's laptop reads every `codex/*` branch's
  questions file at each check-in, about every 20 minutes while the laptop session is open.
- *Claude to Codex.* Claude answers in the card's own file on `integration/wasteland`, under "Claude answers" with the
  date (AGENTS rule 16), pushes, and leaves one line on the pull request that points there. A Codex session that is
  building merges `origin/integration/wasteland` into its branch before it carries on past a question, and reads its
  card's "Claude answers". The Codex director reads the board and the cards on `integration/wasteland`.
- *An answered question* is taken out of the questions file in Codex's next commit. A question that only Kyle can
  settle (AGENTS rule 18) is marked so, and Claude puts it to Kyle.
- *A thing for Claude to run on the laptop* goes under "For Claude to run" in the pull request, never in a chat.

**After the pull request is open, the card is finished for the cloud** (Kyle asked on 25 November 2026 how often Codex
should look for review comments). Do not wait and do not look again. Claude reads the pull request on the laptop, and
the verdict is one of two things: the branch is merged, with any small fault mended by Claude at the merge; or what is
still wrong becomes a new card on the board, which is taken like any other card. A review never asks a finished cloud
task to do more. The next thing to do is the next card under CODEX CAN START NOW.

**The laptop's check-in (Kyle, 18 November 2026).** At each Wasteland check-in Claude fetches `origin` and looks at every
`codex/*` branch. For each branch whose own card says `waiting_on: claude`, Claude reviews the diff independently, runs
the checks listed under "For Claude to run", and records the verdict and any fixes on GitHub against the exact commit
reviewed. If the branch has no pull request, the laptop opens it. A branch still `building` is left alone, except that
its questions file is answered.
