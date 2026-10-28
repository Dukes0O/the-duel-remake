# Codex playbook: The Duel factory

Read SPEC section 0, AGENTS.md and docs/FACTORY.md first. Factory rules 11–15
win over older gate, queue and lane instructions. Use docs/README.md and the
current board to find a card. Kyle sets direction and says “go live”; Claude
chooses art and sound within the three-round cap.

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
| Change note | docs/changes/<id>.md, holding design, verdict and removals |

## 3. Production lines

The course, feature and world graphs in FACTORY section 3 show dependencies.
Steps with no dependency arrow can run together. Course art and layout can be
built in parallel. World art, simulation, saves and sound use separate lanes.
The Director keeps these lines supplied within their limits and lock ownership.

## 4. Roles

| Role | Responsibility |
| --- | --- |
| Kyle | Direction, play notes, release approval |
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
   in its change note before code. Use meaningful acceptance tests first when
   the behavior needs tests. A docs-only card does not need wording tests.
3. Build inside owned files and granted hooks. Keep seed/input behavior
   repeatable and views unable to change race state. Never touch real saves.
4. Freeze the source commit. Run node tools/run-tests.mjs --tier lane --changed
   --jobs 4 and npm run build once in the lane. Keep the original result and
   build log pinned to that clean commit. Fix a real failure in the lane.
5. Get one clear review. Use additional required save/art helpers only when
   rule 6 or the card calls for them. Claude judges art within three rounds.
   Daytime builds do not add full, frame, browser or balance checks; the full
   check owns those checks. `tools/full-check.mjs` uses a detached source copy;
   builders keep merging and only its frame step requires a quiet laptop.
   Tonight's direct pause in next-run.md remains in force.
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
| Conflict fix | After resolving a real conflict in the lane | One fresh targeted lane/build and review |
| Full check | Once a day, on a copy of one commit; only the frame step needs the laptop alone | Full tier jobs 4, both frame qualities, combat balance --check on current rules, browser scenarios |
| Release | Before live access | Full green on the exact final release commit and all applicable release evidence |

The targeted lane includes smoke, replay and world-signature guards, plus
suites that import or read changed paths within two steps. The second step
never passes through a hub (a module that imports 20 or more of the game's
own files, such as `game.js`, `app.js` or `world.js`), and the shared files
(`game.js`, `main.js`, `render3d.js`, `app.js`, `config.js`,
`feature-flags.js`) select only their owner suites and the suites that read
them as text: the smoke set and replay guards drive them in every lane. Suites
in `NIGHT_ONLY_SUITES` run only in the full tier. Unmapped game files do not
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
complete. Claude makes art and sound picks; nothing waits on Kyle except a
release. Kyle can overrule a pick and must say “go live” before live installation.
The Release Manager follows OPERATIONS: exact release full, master fast-forward,
staged build, no retained rollback build, hashed assets before index/manifest, and no
forced reload of an open race. Push or history changes require their applicable
authorization; this integrator performs neither.

## 9. Player touchpoints

Kyle can play Preview, leave notes in playtest-inbox or stop work at any time.
The Director routes notes into cards. Lost progress, crashes and broken races
go first. After release, the inbox states what changed in plain language.

## 10. Files and notes

Current AGENTS.md is the rule source; do not paste an older duplicate template.
The board names ownership, dependencies and locks; FAC-06 moves open details
under docs/board/cards/. A change note contains task/status/kind/flag, settled
design, a short evidence verdict, reviewed behavior/assertion changes and Removed.
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

Full check: run `node tools/full-check.mjs --idle-awake --no-push` once a day; report the first merge after the last green full check for a
failure, put its fix first and allow other merges.
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
