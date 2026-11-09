# The Duel: rules for every agent

These are today's rules, for a game on one laptop played by Kyle and his son Gratian. Read
`SPEC.md` section 0 next; it wins over later SPEC text. On how we work (checks, merges, releases,
records) this page wins over the SPEC, the playbook and any card. The current plan is
`docs/board/next-run.md`. `docs/README.md` lists every other page: `docs/board/board.yaml` for
ownership, `docs/OPERATIONS.md` for folders, ports and release steps, `docs/CODEX_PLAYBOOK.md`
for the workflow, `docs/FACTORY.md` for the production lines. Kyle's dated decisions behind these
rules are in `docs/board/decisions.md`. Rule numbers are unchanged from earlier versions of this
page, because cards and notes cite them. Start from your task card and the files it names; old
notes and history are evidence, not instructions.

## Who works on what

- `node tools/board.mjs` shows the split. Codex starts only cards listed under CODEX CAN START
  NOW. Cards with `owner: claude` are Claude's (design, rules, look and feel reviews, releases);
  never start them. Settle each card's open design question in writing before its code.
- Stop rule: if a card cannot meet its acceptance with the tools we have (free services, this
  laptop, the six-round art limit in SPEC 0.11), stop, write why in the change note and ask
  Kyle. Never ship a placeholder or stub as the finished thing.
- Cloud sessions: `integration/wasteland` is GitHub's front branch. Cards with
  `owner: claude-cloud` are built there, each only on its `cloud/<card>` branch, pushed and
  opened as a pull request into `integration/wasteland`. A cloud session never merges, never
  pushes `integration` or `master`, and never touches the live game. It runs the lane tier and
  `npm run build` and lists in the change note any suite it could not run. The laptop merges.
- A cloud session never stops to ask in chat. It writes the question to
  `docs/board/questions/<CARD>.md` on its branch (what needs deciding, the options, its
  recommended pick), commits and pushes at once, and carries on with that pick if the work can
  continue. Claude answers by message and deletes the file when the card merges.

## Never

- Do not "fix" anything listed under "Keep these" in `docs/board/decisions.md`.
- Do not edit or build in `C:\Users\kyleb\dev\the-duel-remake` except as the Release Manager
  after the release gate. That folder serves the live game.
- Do not use port 5174 for development or QA. Do not refresh a live race.
- Do not read, write or reset real player saves. QA uses memory-only storage.
- Do not add network requests, accounts or API keys. Do not add runtime dependencies, except a
  permissively licensed library named on a card by Claude (`docs/MACHINES.md` section 12).
- Do not weaken a test to make a change pass (rule 18 says how a changed assertion is reviewed).
- Do not regenerate world signatures without a reviewed visual difference.
- Do not edit `README.md` or `docs/VERIFICATION.md` in a lane. Write a change note under
  `docs/changes/`; the Release Manager collects those notes.
- Do not force-remove a worktree, and do not rewrite history (rule 22 has the one exception).

## Always

- Keep race rules repeatable from seed and inputs, runnable without graphics.
- Keep the renderer, HUD and menus from changing race state.
- Use the seeded generator in `src/rng.js` for simulation randomness.
- Put new player features behind a switch in `src/feature-flags.js`.
- Use readable code and LF line endings. Unpack a packed file when rewriting it.
- Stay inside the task card's owned files and named hooks. Ask the Director to re-slice a card
  when another file is needed.
- Record tests, browser checks, changed assertions and race fingerprints in
  `docs/changes/<task-id>.md` before a lane hands work over. Its **Removed** section names what
  the work replaced and removed, or the card that will remove it when its switch is fully on.
- Name the sound cue for every game event a card adds.

## The rules

1. **Check once, sized to the change.** The builder runs the card's checks, the lane tier and
   the build. The merge runs only what the builder could not ("Gates" below).
2. **The full tier** runs in the nightly full check (rule 13) and, alone, before a release that
   rule 19 does not already cover. Always `--jobs 4`.
3. **An unreliable suite.** A suite that fails with no game code changed since it last passed
   gets one rerun on the same commit. If the rerun passes, carry on and open a small card; it
   never holds merges. Never change a test's assertions or tolerances to make it pass.
4. **Thirty minutes** at most on any one failure or tool problem. Then write what is known in
   one short note, make a card if needed and go back to building.
5. **Record less.** One short `run-log.md` line per merge and per full run. No commit whose
   only purpose is recording a result or status; fold notes and `STATUS.md` into the next real
   commit.
6. **Extra helpers** (critic, second reviewer, save checker, balance analyst) only for work
   that touches saves, releases, money and pay, or art rounds.
7. **Heavy jobs.** A lane or full gate, a build, a balance run, a browser check and a Blender
   render are heavy. At most two run at once across all sessions, each `--jobs 4` or fewer;
   take a turn as `docs/FACTORY.md` section 8 says. A timeout while the laptop is busy is rerun
   once alone and is not a failure. Only frame timing and a release full tier need the laptop
   alone.
8. **A frame check is simple.** One run at the track's busiest view with eight cars, on
   Performance, passing at delivered p95 of 18.5 ms or less with the world build under 1 s.
   High is timed only when its scene or code changed, after timing the last passing commit as a
   control. The first-race load in a fresh browser is reported; over 5 s is a warning. Run with
   the laptop's own screen off (Win+P "Second screen only") and nothing else using the graphics
   card; never count a run that had company. Paired runs and extra controls are for finding a
   cause after a failed check, inside rule 4's 30 minutes.
9. **No frame checks** on art rounds, look tests or anything a player cannot reach yet.
10. **No new test machinery** (guards, negative controls, harness recipes, scenario
    frameworks) unless a card asks for it.
11. **Test by what changed.** The lane tier runs the smoke set, the replay and world-signature
    guards, and the suites that import a changed file or name its path within two steps, never
    through a hub (a module that imports 20 or more game files) and never for importing a
    shared file (`docs/CODEX_PLAYBOOK.md` section 7). Deeper effects are the full check's job.
12. **Merge as soon as it is green:** the builder's lane tier and build, and one review where
    rule 17 asks for one. Two clean lanes never wait for each other.
13. **The full check** runs once a day, while Kyle sleeps, on a copy of one commit: full tier,
    frame check, combat balance (`combat-balance.mjs --check`), all browser scenarios, then a
    short report. Run `node tools/full-check.mjs --idle-awake --no-push`. Building and merging
    continue; only its frame step needs the laptop alone (about 15 minutes), and each other
    stage counts as one heavy job. A failure names the first merge after the last green full
    check; its fix goes first and other merges continue.
14. **Limits.** At most six build lanes at once, no more than three of them course lanes. A lane
    is one card's own folder; the lane tag (SIM, UI, ART) names a file area, not a single slot.
    A card lists its locks (`locks:`, FACTORY section 2); two cards with the same lock never
    build at once. Edits to the board, inbox and STATUS on integration are committed at once.
15. **Kyle sets direction.** Claude makes art and sound picks within the six-round limit and
    decides go-live under rule 18.
16. **Questions on a card.** Claude answers in the card's own file, section "Claude answers",
    and clears its `waiting_on` in the same commit. The inbox carries only questions and notes
    that have no card. When a card has waited on Claude for more than an hour while Kyle is
    away, Codex's lead may settle a small question within what the card and its design page
    already say, under "Codex decided (Claude to review)", and clear `waiting_on`; Claude
    reviews it at the next check-in and may reverse it. Art and sound verdicts, money and pay,
    saves, anything Kyle decided and anything that changes a released course stay waiting.
17. **Reviews by kind.** Code, saves, money and pay, and design numbers get one independent
    review. Documents and rule wording that Kyle or Claude already decided get none. A
    reviewer's fixes go back for confirmation only when the review found a real fault; wording
    and style fixes land at once. Line length and style notes never hold a merge.
18. **Standing approval.** A green change merges. A finished, green feature or course goes
    live: Claude (Director) decides, and Claude or Codex acts as Release Manager, one at a time,
    announced in the inbox. A test whose assertions change needs Claude's written review on its
    card (why it changes, that nothing is loosened). Kyle hears about each release afterwards
    in the release note. Only these wait for Kyle:
    - direction: what to build next and what the game is;
    - anything he asked to try first, until he has tried it;
    - anything that wipes or hides a player's saved progress, records, credits or cars;
    - money, accounts and keys;
    - the story for the helicopter, the Deep and the Lab (with Gratian).
19. **Never redo a passing check.** A full-tier pass counts for a later commit when the changes
    since are only docs, board, notes, art sheets or files no test reads. When code changed,
    run the lane tier for those changes, not the whole tier. The whole tier reruns only when
    shared core files, the save shape or the physics changed since the last pass, and in the
    daily full check. A frame-check pass counts while the scene and its code are unchanged. The
    release note names the passed commit and what changed since.
20. **Cockpit.** Kyle follows the build in Cockpit, project "The Duel" (`pers-the-duel`). Each
    task's notes name its board cards and `tools/cockpit-sync.py` sets task status from the
    board. Run it after every merge batch and at session end through
    `C:\Users\kyleb\dev\command-center\scripts\run_command_center_postgres.ps1` with the
    script's full path. It never blocks a merge. Give a card with no task a task.
21. **The factory learns.** What we learn goes where the next job will read it, not in a chat
    or a private brief. Art: `docs/ART_LINE.md`. Whoever finds a new kind of fault adds it
    there in the same commit as the fix.
22. **History.** Claude may run the SPEC 0.8 binary compaction of `integration/wasteland` and
    force-push it without asking, in a window when Codex has paused merges, announced in the
    inbox. `master` is never rewritten. History was rewritten on 24 September 2026: never merge
    a branch that still holds commits from before it; rebase it first with
    `docs/history/history-rewrite-2026-09-24-map.txt`.

## Gates

- **The card names its checks** before code: the one to three checks that prove its claim and
  the laptop-only checks it needs (browser scenario, look, frame). Write a new test only when
  it proves the card's point; prefer checking behaviour over pinning exact numbers.
- **The builder runs them once**, on a branch with current `integration/wasteland` merged in:
  the card's checks, the lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`)
  and `npm run build`, recorded in the change note.
- **The merge does not repeat them.** With no conflict in code, the laptop runs only what the
  builder could not: the laptop-only suites (`test-course-kit`, `test-earned-cars-ui`,
  `test-medals`, `test-drive-through`, `test-full-check`, `test-salt-flats`,
  `test-salt-flats-art`) when the change touches their areas, the card's browser scenario and
  look, and `npm run build` on the merged result. A code conflict resolved at merge reruns only
  the suites for those files.
- **Notes, docs and board-only changes:** `tools/test-board.mjs` and
  `tools/test-repo-hygiene.mjs`.
- **A deliberate change that moves pinned numbers** (replays, lap times, counts) re-records
  them with a one-line reason each in the change note. That is not weakening a test.
- **A real full-tier failure** stops feature merges until its fix lands.
- **Release:** a full-tier pass that covers the release commit under rule 19, plus the build,
  combat balance, browser scenarios, frame pacing, and art and save budget checks that apply,
  and the card's own visual, audio, gameplay and save checks. The Release Manager then pushes
  `integration/wasteland` to GitHub as a plain fast-forward.
- **Session end:** run `node tools/build-status.mjs` and include `docs/board/STATUS.md` in
  that commit. A status snapshot never grants a pass to another commit.

## Keeping the repository small (SPEC 0.7 and 0.8)

- **Fix forward, including live releases.** A mistake is a failing test, a fix and a pass. Keep
  no rollback builds; correct a fault in the next release.
- **Keep the recipe, not the output.** Commit scripts, prompts and settings; rebuild models,
  renders, reports and screenshots from them. Commit generated output only when the game loads
  it. Blender `.blend` files are rebuilt by `tools/blender/` and are not committed.
- **One version of every binary.** Text history stays. Replace means remove, in the same
  change. Delete, do not archive: once a note's facts live in the current docs, delete it.
- **Evidence is used once.** Screenshots, videos and logs go in the ignored
  `.evidence/<date>/<card>/` of the integration folder and are deleted after the review. Keep
  the verdict, and one comparison sheet per round (JPG, 500 KB at most) with its review note
  under `docs/board/looks/<family>/`.
- **Never discard what cannot be regenerated:** real player saves and their backups, Kyle's
  decisions and notes, licensed third-party files and their credits, the current game assets.
- **Where files live.** `public/` holds only files the game loads. Compressed sounds go in
  `public/assets/audio/`, takes that cannot be regenerated in `audio-src/` (FLAC, one
  version), library sounds as recipes in `tools/audio/catalog.json` with the libraries outside the
  repository. API keys live only in Kyle's environment, never in files or logs. Scratch output
  stays in `.qa-dist/`. Nothing new in the repository root unless it is on the allow-list in
  `tools/test-repo-hygiene.mjs`; a file in the wrong home fails that check. Sizes are targets
  in `tools/size-targets.json`, reported on the status page, never merge blockers. A lane may
  link `node_modules` only to the integration folder's copy; unlink it before removing the lane.
- **A branch lives as long as its work.** After a merge, or when a card is dropped or replaced,
  delete that lane's branch and folder (unlink, then `git worktree remove`), delete its review
  evidence once the verdict is committed, and update the status page. Never delete a branch
  for being idle, and never delete a branch Kyle created.
- **The sweep**, at the end of every run and after every 10 merges, as its own step: list idle
  unmerged branches on the status page; fold still-needed facts from old notes into the current
  docs and delete the notes; remove what `node tools/repo-audit.mjs` proves unused, each
  removal passing the lane tier with unchanged replay fingerprints; compare sizes with the
  targets and propose new ones when the game has grown; write one janitor line in
  `run-log.md`. Anything uncertain becomes a card.
