# The Duel: rules for every agent

Read `SPEC.md` section 0 first; it wins over conflicting later text. Use
`docs/README.md` to find current instructions and supporting references.
The cleanup phase (SPEC 0.7) finished on 24 September 2026. Phase 2 builds
features on that clean base: the current plan and start prompt are in
`docs/board/next-run.md`. Settle each card's open design question in writing
before its code. Read `docs/CODEX_PLAYBOOK.md`
for the workflow, and `docs/board/board.yaml` for task ownership. Use
`docs/OPERATIONS.md` for current folders, ports and release steps.

## Who works on what

- `node tools/board.mjs` shows the split. Codex starts only cards listed under
  CODEX CAN START NOW. Cards with `owner: claude` are Claude's (design, rules,
  look and feel reviews, releases prepared for Kyle); never start them.
- Stop rule (Kyle): this is a game for one laptop, played by Kyle and his son.
  If a card cannot meet its acceptance with the tools we have (free services,
  this laptop, SPEC 0.11's three-round art cap), stop, write why in the change
  note and ask Kyle. Never ship a placeholder or stub as the finished thing.
- Cloud sessions (Kyle, 24 October 2026): `integration/wasteland` is GitHub's
  front branch, so a cloud session starts from it. Cards with
  `owner: claude-cloud` are built there. A cloud session works only on its
  card's `cloud/<card>` branch, pushes that branch and opens a pull request
  into `integration/wasteland`; it never merges, never pushes `integration`
  or `master`, and never touches the live game. It runs the lane tier and
  `npm run build` and lists in the change note any suite it could not run
  there. The laptop merges after its own lane tier, build and any look check.
- Questions from a cloud session: nobody reads its chat. Never stop to ask in
  chat. Write the question to `docs/board/questions/<CARD>.md` on your branch
  (what you need decided, the options, your recommended pick), commit and push
  at once. Carry on with your recommended pick if the work can continue, and
  say so in the file; stop only if it truly cannot. Claude answers by message
  to the session and deletes the file when the card merges.

## Never

- Do not "fix" anything listed under "Keep these" in `docs/board/decisions.md`
  (fun that looks like a bug, kept on purpose for Kyle and his son).
- Do not edit or build in `C:\Users\kyleb\dev\the-duel-remake` except as the
  Release Manager after the release gate. That folder serves the live game.
- Do not use port 5174 for development or QA. Do not refresh a live race.
- Do not read, write or reset real player saves. QA uses memory-only storage.
- Do not add runtime dependencies, network requests, accounts or API keys.
- Do not weaken a test to make a change pass. Explain and review any changed
  assertion in the task's change note.
- Do not regenerate world signatures without a reviewed visual difference.
- Do not edit `README.md` or `docs/VERIFICATION.md` in a lane. Write a change
  note under `docs/changes/`; the Release Manager collects those notes.

## Always

- Keep race rules repeatable from seed and inputs, runnable without graphics.
- Keep the renderer, HUD and menus from changing race state.
- Use the seeded generator in `src/rng.js` for simulation randomness.
- Put new player features behind a switch in `src/feature-flags.js` once
  FND-09 installs it.
- Use readable code and LF line endings. Unpack a packed file when rewriting it.
- Stay inside the task card's owned files and named hooks. Ask the Director to
  re-slice a card when another file is needed.
- Record tests, browser checks, changed assertions and race fingerprints in
  `docs/changes/<task-id>.md` before a lane hands work to integration.

## Build more, record less (Kyle, 4 October 2026)

This is a game for two people on one laptop. These rules win over any older
text in the playbook, SPEC or cards that asks for more checking or recording.

1. Check once, sized to the change ("Gates" below, Kyle 24 October 2026): the
   builder runs the card's checks, lane tier and build; the merge runs only
   what the builder could not. A full-tier pass covers every release (rule
   19). They protect the live game and saves.
2. Run the full tier inside the full check (rule 13) and, alone (no other
   gates, browser checks or builds at the same time), before every release,
   not on a merge count or clock. Always with `--jobs 4`.
3. A suite that fails with no game code changed since it last passed gets one
   rerun of that suite on the same commit. If the rerun passes, carry on and
   open a small card for the unreliable check; it never holds merges. Never
   change a test's assertions or tolerances to make it pass.
4. Spend at most 30 minutes investigating any one failure or tool problem.
   Then write what is known in one short note, make a card if needed and go
   back to building.
5. Record less: one short `run-log.md` line per merge and per full run. No
   commit whose only purpose is recording a result or a status; fold notes
   and `STATUS.md` into the next real commit or the merge itself.
6. Extra helpers (critic, second reviewer, save checker, balance analyst) only
   for work that touches saves, releases, money and pay, or art rounds. Other
   cards: the builder's tests, the lane gate and one review (rule 17 says
   which cards need it).

Added 11 October 2026 (Kyle: "yes", after one shared test slot held every
team's merges back for hours):

7. Only frame timing needs a quiet laptop. Lane gates, builds, balance runs
   and browser checks that do not time frames run alongside each other, at
   most two at once across all teams (Kyle, 24 October 2026: three at once
   caused timeouts that cost reruns), each with `--jobs 4` or fewer. A frame measurement waits until
   no gate, build, balance run or browser check is going, and nobody starts
   one while it runs. The full tier on a release commit still runs alone (rule 2).
   Every chat takes a turn the same way: `docs/FACTORY.md` section 8.
8. A frame check is simple: one run per quality (Performance and High) at the
   track's busiest view with eight cars, passing at delivered p95 at most
   18.5 ms and the world build under 1 s (the full first-race load in a fresh
   browser is reported and should stay under 5 s; slower is a warning, not a
   failure: Kyle, 14 October 2026). Run it with the laptop's own screen off
   (Win+P "Second screen only"), since a window spanning both graphics chips
   misses frames. Paired on/off packets, repeated legs
   and extra controls are used only to find the cause after a simple check
   fails, inside rule 4's 30 minutes. Before timing, check that no other
   program (a browser window, a game tab) is using the graphics card heavily;
   if one is, wait, and never count that run.
9. No frame checks on art rounds, look tests or anything a player cannot
   reach yet. Art is judged on its pictures; timing comes when it is wired
   into the game.
10. No new test machinery (guards, negative controls, harness recipes,
    scenario frameworks) unless a card asks for it. A tool problem gets rule
    4's 30 minutes, then a small card, then back to building.

## The factory (Kyle, 12 October 2026)

`docs/FACTORY.md` is the plan: three production lines (feature, course,
world) drawn as graphs, with shared files named as locks. These rules win
over rules 1, 2 and 7 above and over older playbook and SPEC text.

11. Test by what changed. The lane tier runs the smoke set, the replay and
    world-signature guards, and the suites that import a changed file or
    name its path within two steps, never through a hub (a module that
    imports 20 or more game files) and never for importing a shared file
    (`docs/CODEX_PLAYBOOK.md` section 7). Deeper effects are the full
    check's job.
12. Merge as soon as it is green: the builder's one lane tier and build, and
    one review where rule 17 asks for one. A merge with no conflict in code
    does not run the lane tier again; a code conflict fixed at merge reruns
    only the suites for those files ("Gates"). Two clean lanes never wait for
    each other.
13. Heavy checks run as one batch, the full check: full tier, frame check
    (rule 8), combat balance on current rules (`combat-balance.mjs --check`),
    all browser scenarios, then a short report. It runs once a day, by default
    while Kyle sleeps, on a copy of one commit, so merges and building
    continue while it runs. Only its frame step needs the laptop to itself;
    builders pause gates, builds and browser checks for that step only, about
    15 minutes. Its other stages run alongside builders and each counts as one
    of the two heavy jobs (rule 7). A full-check failure names the first
    merge after the last green full check; its fix goes first and other
    merges continue. Run `node tools/full-check.mjs --idle-awake --no-push`.
    The tool checks a detached copy of the starting integration commit;
    only frames require no competing heavy jobs. Tonight's 03:45 to
    Record night/06:30 pause remains in force (next-run.md).
14. Limits: at most six build lanes at once across all lines, no more than
    three of them course lanes, each test run `--jobs 4` or fewer. A lane is
    one card's own folder; the lane tag (SIM, UI, ART) names a file area, not
    a single slot, so two SIM cards with different files run at once. A card
    lists the locks it holds (`locks:` in the board, FACTORY section 2); two
    cards with the same lock never build at once. Edits to the board, inbox
    and STATUS on integration are committed at once, never left uncommitted in
    the integration folder: an uncommitted shared file blocks every other
    merge.
15. Kyle sets direction. Claude makes art and sound picks within the
    three-round cap and decides go-live under rule 18; nothing waits on Kyle
    except rule 18's short list.
16. Claude answers a card's question in that card's own file
    (`docs/board/cards/<id>.md`, section "Claude answers") and clears its
    `waiting_on` in `docs/board/board.yaml` in the same commit. The inbox
    carries only questions and notes that have no card, so two answers never
    collide in one place (Kyle, 12 October 2026).
    If a card has waited on Claude for more than an hour while Kyle is
    away, Codex's lead may settle a small question itself, within the rules
    already written on the card and its design document: under the heading
    "Codex decided (Claude to review)" on the card, it says what it chose
    and why, then clears `waiting_on`. Claude reviews each one at the next
    check-in and may reverse it. Art and sound verdicts, money and pay,
    saves, anything Kyle decided, and anything that would change a released
    course stay waiting; Codex moves to other cards instead (Kyle, 13
    October 2026).
17. Reviews by kind (Kyle, 12 October 2026). Code, saves, money and pay, and
    design numbers get one independent review. Documents and rule wording that
    Kyle or Claude already decided get none; the lane gate and build are
    enough. A reviewer's fixes go back for confirmation only when the review
    found a real fault; wording and style fixes land at once. Line length and
    style notes never hold a merge.

## Ship when green (Kyle, 15 October 2026)

Kyle: "many things are being held up because they need my explicit approval to
merge or go live after tests pass... it's a bottle neck when I'm not around,
and it's a bottle neck when I am around... I trust yours and Codex' ability to
run these builds together. I don't need much involvement during the building
phase." These two rules win over rules 1, 2 and 15, the Gates section below,
and any card, playbook or SPEC text that asks for Kyle's word or a repeated run.

18. **Standing approval.** Kyle no longer approves merges, test changes or
    releases one by one. A green change merges. A finished, green feature or
    course goes live: Claude (Director) decides, and Claude or Codex acts as
    Release Manager (one at a time, announced in the inbox). A test whose
    assertions change needs Claude's written review on its card (why it
    changes, that nothing is loosened); that review is the approval. "Never
    weaken a test" still stands. Kyle hears about each release afterwards in
    the release note. Kyle still decides, and only these wait for him:
    - direction: what to build next and what the game is;
    - anything he asked to try first (a preview), until he has tried it;
    - anything that wipes or hides a player's saved progress, records,
      credits or cars;
    - money, accounts and keys;
    - the story for the helicopter, the Deep and the Lab (with Gratian).
19. **Never redo a passing check.** A full-tier pass counts for a later commit
    when the changes since it are only docs, board, notes, art sheets or files
    no test reads. When code changed since the pass, run the lane tier for
    those changes on the later commit, not the whole tier again. The whole
    tier reruns only when shared core files, the save shape or the physics
    changed since the last pass, and in the daily full check. A frame-check
    pass counts while the scene and its code are unchanged. The release note
    names the passed commit and what changed since.

## Gates (SPEC 0.5)

Right-sized checks (Kyle, 24 October 2026; replaces "lane tier before every
merge"). Test once, at the size of the change:

- **The card names its checks.** Before code, each card lists the one to
  three checks that prove its claim (new or existing) and the laptop-only
  checks it needs (browser scenario, look, frame). Write a new test only when
  it proves the card's point; prefer checking behaviour over pinning exact
  numbers.
- **The builder runs them once**, cloud or lane, on a branch with current
  `integration/wasteland` merged in: the card's checks, the lane tier
  (`node tools/run-tests.mjs --tier lane --changed --jobs 8`) and
  `npm run build`, recorded in the change note.
- **The merge does not repeat them.** When the builder's lane tier and build
  passed and the merge into integration has no conflict in code, the laptop
  runs only what the builder could not: the laptop-only suites
  (`test-course-kit`, `test-earned-cars-ui`, `test-medals`,
  `test-drive-through`, `test-full-check`, `test-salt-flats`,
  `test-salt-flats-art`) when the change touches their areas, the card's
  browser scenario and look, and `npm run build` on the merged result. A code
  conflict resolved at merge reruns only the suites for those files.
- **Notes, docs and board-only changes:** `tools/test-board.mjs` and
  `tools/test-repo-hygiene.mjs`.
- **At most two heavy runs on the laptop at once.** A timeout while the laptop
  is busy is rerun once alone and is not a failure.
- **Full tier once a night** (the scheduled full check) and before every
  release. It is where the slow, broad suites run. A real failure stops
  feature merges until a fix lands; an unreliable check follows rule 3 above.
- **Deliberate changes that move pinned numbers** (replays, lap times,
  counts) re-record them with a one-line reason each in the change note; that
  is not weakening a test.
- Release: a full-tier pass that covers the release commit under rule 19 (on
  that commit, or on an earlier one with only rule 19's allowed changes
  since). Keep the full
  release evidence: build, combat balance (`combat-balance.mjs --check`, current rules),
  browser scenarios, frame pacing, art and save budget checks as applicable.
  Card-specific visual, audio, gameplay and save checks still apply.
- Run `node tools/build-status.mjs` at every session end and include
  `docs/board/STATUS.md` in that commit. A later commit needs its own full-tier pass;
  a status snapshot never grants a pass to another commit.
- Pushing (Kyle, 13 October 2026, replacing D8 of 24 September): the Release
  Manager pushes `integration/wasteland` to GitHub after every release, as a
  plain fast-forward with no history rewrite, so the work is never only on the
  laptop. Compaction (SPEC 0.8) becomes an occasional tidy-up that Claude runs
  without asking (see the janitor section); it never holds back a push. D4 still covers
  `master`. The branch was pushed on 13 October after eleven days unpushed.

See playbook section 7 for the gate and evidence workflow.

## How we work with AI-written code (Kyle, 24 September 2026; SPEC 0.8)

Old best practices assumed code was expensive to write, so everything was kept
in case it had to be rolled back. Here, redoing is cheap and storage, speed and
small context matter. These rules win over habit:

1. **Fix forward, including live releases (Kyle, 15 October 2026).** A mistake
   is a failing test, a fix and a pass. Do not retain rollback builds or revert
   a release to undo an added course. Correct faults in the next release.
2. **Keep the recipe, not the output.** Commit scripts, prompts and settings.
   Rebuild models, renders, textures, reports and screenshots from them. Commit
   generated output only when the game loads it.
3. **One version of every binary.** Text history (code, tests, docs) stays: it
   is small and shows when a problem started. Binary assets keep only their
   current version; superseded versions are compacted out of history before
   every push (SPEC 0.8).
4. **Evidence is used once.** Screenshots, videos, recordings and logs serve a
   review and are then deleted. Keep the verdict: scores, findings, numbers.
5. **Replace means remove,** in the same change.
6. **Delete, don't archive.** Once a note's facts live in the current docs,
   delete the note. Git text history holds it if anyone ever asks.
7. **A branch lives as long as its work.** Delete a lane branch and its folder
   when its card is merged, replaced by other work, or dropped with a written
   reason. Never delete a branch for being idle. Branches Kyle creates are his:
   the janitor lists them but never deletes them.
8. **Targets, watched by the janitor.** Sizes are targets kept in one place
   (`tools/size-targets.json`), not merge blockers; they change as the game
   grows. Only a file in the wrong home fails a check.
9. **Never discard what can't be regenerated:** real player saves and their
   backups, Kyle's decisions and notes, licensed third-party files and their
   credits, and the current game assets.

## Where files live (SPEC 0.7)

- `public/`: only files the game loads at runtime. Never Blender files,
  videos, raw captures or other sources.
- Blender `.blend` files are rebuilt by the scripts in `tools/blender/` and are
  not committed. Commit the script and its small inputs instead.
- Review evidence (screenshots, videos, audio captures, gate logs) goes in
  `.evidence/<date>/<card>/` in the integration folder, which Git ignores.
  Commit only one compressed comparison sheet per round (JPG, 500 KB at most)
  and its review note under `docs/board/looks/<family>/`.
- Lane folders may link `node_modules` only to the integration folder's copy,
  never the live folder's. Unlink the link before removing a lane folder.
- Audio (SPEC 0.9): compressed runtime sounds in `public/assets/audio/`;
  takes that cannot be regenerated in `audio-src/` (FLAC, one version);
  library sounds as recipes in `tools/audio/catalog.json`, with the libraries
  outside the repository. API keys only in Kyle's environment, never in files
  or logs. Every card that adds a game event names its sound cue.
- Scratch output stays in `.qa-dist/`. Nothing new in the repository root
  unless it is on the root allow-list in `tools/test-repo-hygiene.mjs`.
- `tools/test-repo-hygiene.mjs` checks placement in every lane tier: a file in
  the wrong home fails. Sizes are targets in `tools/size-targets.json`,
  reported on the status page and handled by the janitor, not merge blockers.

## The janitor (SPEC 0.7)

- Every change note has a **Removed** section. When work replaces something
  (a model, code path, test, doc or tool), remove the old one in the same task,
  or name the task that will remove it when its switch turns fully on.
- Start from `docs/README.md`, your task card and the files they name. The
  index labels historical evidence; history is not a new instruction.
- **The janitor** keeps the repository clean by deleting, not by moving
  things into a closet. It has two parts.
- **After every successful merge** (and whenever a card is dropped or replaced
  instead of merged), as part of that merge:
  1. Delete that lane's branch and folder. Unlink dependency links first, then
     `git worktree remove` (never forced).
  2. Delete that card's review evidence once its verdict is committed.
  3. Update the status page, including sizes against `tools/size-targets.json`.
- **The sweep**, at the end of every run and after every 10 merges, as its own
  step, never squeezed into a feature card:
  1. List idle unmerged branches on the status page with their card, last
     activity and what they hold. Leave them in place.
  2. Fold still-needed facts from old notes, handoffs and log entries into
     the current docs, then delete the originals. No "history" folders.
  3. Remove what `node tools/repo-audit.mjs` proves unused: assets nothing
     loads, code nothing imports, tests of removed behavior, switches fully on
     for a release. Each removal passes the lane tier with unchanged replay
     fingerprints. Anything uncertain becomes a card instead.
  4. Compare sizes with the targets. Delete waste, record why any real growth
     happened, and propose new targets when the game has grown.
  5. Write one janitor line in `run-log.md`: what went, what was flagged,
     sizes before and after.
- Never force-remove a worktree. Never rewrite history without Kyle, with one
  standing exception (Kyle, 13 October 2026): Claude may run the SPEC 0.8
  binary compaction of `integration/wasteland` and force-push it without
  asking, in a window when Codex has paused merges, and must announce it in
  the inbox. `master` is never rewritten.
- History was rewritten on 24 September 2026 (SPEC 0.7, CLEAN-09). Never merge
  a branch that still contains pre-rewrite commits; rebase it first using
  `docs/history/history-rewrite-2026-09-24-map.txt`.
