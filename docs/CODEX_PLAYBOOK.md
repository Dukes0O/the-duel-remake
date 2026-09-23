# Codex playbook: building the Wasteland expansion with a team of agents

This is the operating manual for running the plan in `SPEC.md` with Codex. It covers who does what, where each agent works, how work moves from an idea to the game your players open, and the files to install. The design goal is quality: agents check each other, automatic tests decide what's finished, and nothing reaches the live game unless it passes.

Nothing here is active yet. Installing it is decision D2 in `SPEC.md` section 15.

## 1. The short version

- **One planner, several builders, independent checkers.** A Director thread plans and assigns. Up to four builder threads ("lanes") work at the same time, each in its own copy of the project. The agent that writes code never grades its own work: separate agents write the tests, review the change and check the game in a browser.
- **Nobody works in the live folder.** `C:\Users\kyleb\dev\the-duel-remake` is what the desktop shortcut runs. Only the Release Manager touches it, and only to install a finished, tested build.
- **Automatic checks replace phase sign-offs.** Every change passes the same gates: its own tests, a merge check, and a full check before every release. Unfinished features ship switched off (behind a feature switch), so work never has to wait for a phase to finish.
- **You steer without blocking.** You answer the standing decisions once, play the "Experimental" builds when you like, and drop notes in the play-test inbox. Agents turn notes into tasks.

## 2. Words used here

| Word | Meaning |
| --- | --- |
| Worktree | A separate working copy of the project folder, on its own branch, sharing the same history. Codex's app creates one per thread when you pick "Worktree" |
| Lane | One builder thread that owns a set of files, such as combat code or menus |
| Task card | A short entry on the board: what to build, which files, what "done" means, how to check it |
| Gate | An automatic check a change must pass before it moves on |
| Feature switch | A setting that keeps unfinished features hidden in the player build and visible in test builds |
| Fingerprint | A short code computed from a replayed race. If code changes and the fingerprint doesn't, the race behaved exactly the same |
| Integration branch | `integration/wasteland`, where finished lane work is combined and tested together before release |
| Change note | A small file per task in `docs/changes/` describing what changed and the evidence. Notes are folded into `README.md` and `docs/VERIFICATION.md` at release, so lanes never edit those two files at the same time |

## 3. How the team is arranged

```
 Kyle ── standing decisions, play-test notes, veto ───────────────┐
                                                                  ▼
 ┌───────────────────────── Director thread ───────────────────────────┐
 │ Owns SPEC.md and docs/board/board.yaml. Plans, slices, assigns.     │
 │ Never edits game code.                                              │
 └────┬───────────────┬───────────────┬───────────────┬────────────────┘
      │ task cards    │               │               │
      ▼               ▼               ▼               ▼
 Lane thread     Lane thread     Lane thread     Lane thread       Art lane
 (own worktree)  (own worktree)  (own worktree)  (own worktree)    (images, sounds)
  │ inside each lane, helper agents run one after another:
  │  test_author → builder (the lane itself) → test_runner → reviewer
  │  + save_guardian / browser_qa / balance_analyst when the card says so
  ▼
 Integrator thread (own worktree on integration/wasteland)
  merge queue, one change at a time, merge gate
  ▼
 Full check (Integrator, before each release and after every five merges)
  full suite, balance report, browser scenarios, frame pacing, art checks
  ▼
 Release Manager thread
  under your standing release rule: master + build + live game
  (the menu offers "Reload" when the new build is ready; races are never interrupted)

 Discovery thread (read-only, runs in the background): hunts bugs, files task cards
```

### Why this shape

- **Separate worktrees for builders.** Codex's helper agents inside one thread share the same folder, so two of them writing code at once would collide. Parallel building therefore happens in separate threads, each in its own worktree. Helpers inside a thread do reading, testing and reviewing, or write only to files the builder isn't touching.
- **Tests written before the code, by someone else.** The test_author writes the acceptance tests from the task card before the builder starts. The builder can't bend a test to fit its code without the reviewer seeing it.
- **Fresh eyes for review.** A helper agent starts with a clean context, so it reviews the change without the builder's assumptions.
- **Files have owners.** Each lane owns a set of files. The busiest files (`src/game.js`, `src/main.js`, `src/render3d.js`, `src/app.js`) have exactly one owner lane at a time. Other lanes may add only small hook lines that their task card lists.
- **At most four builder lanes at once.** More than that and review becomes the bottleneck.

## 4. Roles

| Role | How it runs in Codex | Effort | Writes | Job |
| --- | --- | --- | --- | --- |
| Director | Your main local thread | high | `SPEC.md`, `docs/board/`, `docs/playtest-inbox.md` | Plans waves, writes task cards, keeps lanes fed, answers lane questions from the spec, decides and logs what the spec doesn't cover |
| Lane builder | App thread, Worktree mode, one per lane | medium | Files its card owns | Builds one task at a time, runs its tests, fixes review findings |
| test_author | Helper agent (`.codex/agents/test_author.toml`) | high | `tools/test-*.mjs`, fixtures | Turns the card's acceptance lines into failing tests before building starts |
| test_runner | Helper agent | low | Nothing in the repo | Runs the right test tier and reports failures briefly and precisely |
| reviewer | Helper agent, read-only | high | Nothing | Reviews the diff against the card, the spec and the rules. Every finding names a file, a line and a failing scenario |
| save_guardian | Helper agent, read-only | high | Nothing | Required whenever saves, rewards or records change. Checks migrations against the fixture saves |
| browser_qa | Helper agent | medium | Screenshots in a scratch folder | Runs browser scenarios on a private port with memory-only saves. Reports errors and screenshots |
| balance_analyst | Helper agent | medium | `src/wasteland-tuning.js` only | Runs the balance report and tunes numbers within the spec's targets |
| art_critic | Helper agent, read-only | high | Nothing | Scores screenshots against the look rubric (SPEC 10.1) and names the fixes that matter most |
| audio_qa | Helper agent | high | Nothing in the repo | Records a scripted race's audio and judges it against the race's events: sync, engine pitch against revs, loudness, balance between sounds, panning |
| art_director | Art lane thread | medium | `public/assets/**`, `docs/WASTELAND_ART.md`, credits | Writes prompts, generates images with Codex's image tool, runs the art check |
| debt_hunter | Discovery thread, read-only | high | Nothing (files cards through the Director) | Audits one system at a time, proves each bug with a small repro, proposes a card |
| Integrator | App thread, worktree on `integration/wasteland` | medium | Merges, `docs/changes/` cleanup | Merge queue, conflict fixes, merge gate, stop-the-line |
| Release Manager | App thread, runs in the live folder only | high | `master`, `dist`, release notes | Full check result → release under the standing rule, rollback when needed |

## 5. The lanes and what they own

| Lane | Owns | Typical work |
| --- | --- | --- |
| OPS | Launcher, `docs/OPERATIONS.md`, `.gitattributes`, `AGENTS.md`, `.codex/` | Live game safety, branches, release process |
| TOOL | `tools/run-tests.mjs`, `tools/browser-harness.mjs`, `tools/replays/`, `tools/combat-balance.mjs`, `tools/check-art-intake.mjs`, `src/feature-flags.js` | Test tiers, fingerprints, browser checks, balance and art checks |
| SIM | `src/game.js` and the systems split from it, `src/collision.js`, `src/npc-*.js`, `src/course*.js`, `src/config.js` | Race rules, refactors, opponents list, ambush zones |
| CMB | `src/combat*.js`, `src/onfoot*.js`, `src/raiders.js`, `src/scrapdome.js`, `src/wasteland-tuning.js` | Weapons, armor, CPU combat, on-foot rules, arena rules |
| VIS | `src/render3d.js`, `src/combat-scene.js`, `src/vehicle-sockets.js`, `src/armor-kit-meshes.js`, `src/fighter-figure.js`, `src/combat-effects.js`, `src/photo-mode.js`, `src/war-paint.js` | Everything drawn in 3D |
| UI | `src/main.js` and the screens split from it, `src/app.js`, `src/keyboard-steering.js`, `src/combat-hud.js`, `src/wasteland-ui.js`, `src/style.css` | Menus, HUD, input |
| SAVE | `src/progression.js`, `src/leaderboard.js`, `src/wasteland-progress.js`, `src/gallery-store.js`, `src/challenges.js`, data catalogs | Saves, rewards, records, unlocks |
| ART | `public/assets/**`, `docs/WASTELAND_ART.md`, audio sources, credits | Images and sounds |

## 6. How one task flows

1. **Pick.** The lane takes the top `ready` card for its lane from `docs/board/board.yaml` on the integration branch. A card is ready when everything in its `needs` list is merged.
2. **Start clean.** New worktree from the latest `integration/wasteland`, branch `lane/<lane>/<task-id>-<short-name>`. Run `npm ci`. Use this lane's private port (section 11).
3. **Tests first.** Spawn `test_author` with the card. It adds failing tests and reports which fail and why. The lane confirms they fail for the right reason.
4. **Build.** The lane implements, staying inside the card's `owns` and `hooks` files. If the task needs another file, stop and ask the Director to re-slice.
5. **Check.** Spawn `test_runner` for tier 1 (`node tools/run-tests.mjs --tier lane --changed`). Fix until green.
6. **Refine.** If the card changes anything seen or heard, run the look loop (`browser_qa` shots, then `art_critic`) and/or the sound loop (`audio_qa`) from SPEC.md 10.1. At least two rounds, at most five. Gameplay cards run the feel lab with `balance_analyst`.
7. **Review.** Spawn `reviewer`, plus `save_guardian`, `browser_qa` or `balance_analyst` when the card lists them. Fix every finding or answer it with evidence. Repeat review until clean. After three rounds without a clean result, stop and hand the card back to the Director.
8. **Hand off.** Write `docs/changes/<task-id>.md` with `status: ready-to-merge` and the evidence. Commit on the lane branch. The thread's final message is the change note.
9. **Merge.** The Integrator finds branches whose change note says `ready-to-merge`, merges them one at a time and runs the merge gate. If the gate fails, the branch goes back to its lane with the failure.

## 7. Gates

| Gate | When | What must pass | Time target |
| --- | --- | --- | --- |
| Lane gate | Before review | Tests for the changed files, the quick smoke set, fingerprints, production build | under 5 min |
| Merge gate | Before each merge into integration | Every suite with the long campaign runs skipped (run in parallel), production build, browser smoke (menu, start a race in both quality settings, zero console errors), fingerprints unchanged unless the card says behavior changes on purpose | under 10 min |
| Full check | Before every release, and after every five merges into integration | Every suite including the 85 campaign runs, balance report within targets, browser scenarios for each feature switch, frame pacing compared with the last release, art check, storage budget check | under 45 min |
| Release gate | Before touching the live folder | Full check green on the exact commit, change notes compiled into `README.md` and `docs/VERIFICATION.md`, feature switch list reviewed | minutes |

**Stop the line.** If the merge gate fails on integration itself, or the full check fails, the Integrator puts a fix card at the top of the board. Only fixes merge until integration is green again. Lanes keep building on their own branches meanwhile, so work doesn't pause.

**Fingerprint changes are behavior changes.** A card that changes how races behave must say so. The reviewer approves the new fingerprint with a written reason in the change note. A refactor card must leave every fingerprint unchanged.

**Test changes are behavior changes.** Editing an existing assertion needs the reviewer's approval and a reason in the change note. This rule exists because the D-key tests were edited to protect a bug.

## 8. Feature switches and releases

Every new feature ships behind a switch in `src/feature-flags.js`:

| State | Where it shows | How it moves on |
| --- | --- | --- |
| `dev` | Test builds and `?flags=` only | Its acceptance tests and browser scenario pass two full checks in a row → `beta` |
| `beta` | The player build, behind **Menu → Experimental** | You play it, or three days pass with no serious play-test note → `on` (standing rule D3) |
| `on` | Everyone | The switch is deleted once the feature has been `on` for a release with no problems |

The Release Manager follows the standing release rule you approve once (D3). A release:

1. Checks the full check result for the exact integration commit.
2. Fast-forwards `master` in the live folder, builds, keeps the previous `dist` as `dist-previous` for rollback.
3. The running game shows its menu-only "Reload" notice. Races are never interrupted and saves stay on the same address.
4. Writes a plain-language summary to `docs/playtest-inbox.md` ("What's new to try").

Rollback: restore `dist-previous`, or switch the feature off and release again.

## 9. Your touchpoints

- **Once:** answer the standing decisions in `SPEC.md` section 15.
- **Whenever you like:** play. Turn on Menu → Experimental to try `beta` features.
- **Notes:** tell the Director, or add a line to `docs/playtest-inbox.md`. Serious problems (lost progress, crashes, a broken race) jump to the top of the board.
- **Weekly:** the Director writes a one-page plain-language summary: what shipped, what's in beta, what's next, what needs you.
- **Anytime:** "stop" or "roll back" is always honored.

## 10. Files to install

Install these on the integration branch as task FND-05. Nothing is active until then.

### 10.1 `AGENTS.md` (repository root)

```markdown
# The Duel: rules for every agent

Read SPEC.md for what we are building and docs/CODEX_PLAYBOOK.md for how work flows.
Your task card is in docs/board/board.yaml. Stay inside its `owns` and `hooks` files.

## Never
- Never edit, build in, or serve from C:\Users\kyleb\dev\the-duel-remake unless you are the
  Release Manager. That folder is the live game.
- Never use port 5174. It is the live game and holds real player saves.
- Never read, write or reset real player saves. QA pages use tools/qa-storage.js.
- Never add npm dependencies, network requests, accounts or API keys.
- Never weaken or delete a test to get green. Changing an assertion needs reviewer approval
  and a reason in your change note.
- Never regenerate world composition signatures without a reviewed visual difference.
- Never edit README.md or docs/VERIFICATION.md in a lane. Write docs/changes/<task-id>.md.

## Always
- Keep race rules inside Duel.step, repeatable from seed and inputs, runnable without graphics.
- The renderer, HUD and menus read race state and never change it.
- Use the seeded generator in src/rng.js for any random choice in the simulation.
- New features go behind a switch in src/feature-flags.js.
- Write new code in the readable style of src/game.js. When you rewrite a packed file, unpack it.
- Line endings are LF.
- Docs use plain language: short sentences, common words, no em dashes.

## Commands
- Lane gate:   node tools/run-tests.mjs --tier lane --changed --jobs 8
- Merge gate:  node tools/run-tests.mjs --tier merge --jobs 12 && npm run build && node tools/browser-harness.mjs smoke
- Full check:  node tools/run-tests.mjs --tier full --jobs 10 && node tools/combat-balance.mjs --check
- List suites: node tools/run-tests.mjs --list

## Done means
- The card's acceptance lines are true and shown by tests.
- The lane gate passes. Reviewer findings are fixed or answered with evidence.
- docs/changes/<task-id>.md lists what changed, commands run with results, and any
  fingerprint or test changes with reasons.
```

### 10.2 Helper agents (`.codex/agents/*.toml`)

These leave `model` unset so they use your default Codex model.

`.codex/agents/test_author.toml`

```toml
name = "test_author"
description = "Writes failing acceptance tests from a task card before any implementation starts."
model_reasoning_effort = "high"
sandbox_mode = "workspace-write"
developer_instructions = """
You write tests only. Input: a task card from docs/board/board.yaml and the linked SPEC.md section.
- Turn every acceptance line into at least one check in tools/test-<area>.mjs, using node:assert/strict
  and the style of the existing suites. Print one summary line with the check count.
- Tests must fail now for the reason the card describes. Run them and report each failure message.
- Prefer checks on game rules and results over checks on private helper functions.
- For behavior that must not change, add or extend a fingerprint in tools/replays/.
- Never edit files under src/. Never change existing assertions. If an existing test contradicts
  the card, report it instead.
"""
```

`.codex/agents/test_runner.toml`

```toml
name = "test_runner"
description = "Runs the requested test tier and reports failures briefly and precisely."
model_reasoning_effort = "low"
sandbox_mode = "workspace-write"
developer_instructions = """
Run exactly the command you are given (a tier from AGENTS.md). Do not edit any file.
Report: PASS or FAIL, total time, and for each failing suite the first assertion message, the file
and line, and the shortest command that reproduces it. Report any suites that were skipped
(including DUEL_SKIP_CAMPAIGNS). Keep the report under 30 lines.
"""
```

`.codex/agents/reviewer.toml`

```toml
name = "reviewer"
description = "Independent code reviewer for correctness, repeatability, save safety and performance."
model_reasoning_effort = "high"
sandbox_mode = "read-only"
developer_instructions = """
Review the diff of the current branch against integration/wasteland, the task card and SPEC.md.
Check, in order:
1. Correctness: does it meet every acceptance line? Find inputs that break it.
2. Repeatability: race rules stay in Duel.step, use simulation time and the seeded generator,
   and give the same result at 30, 60 and 144 FPS.
3. Boundaries: renderer and HUD never write race state; files outside the card's owns/hooks are
   untouched; no dependency, network or storage-key changes unless the card says so.
4. Saves and rewards: old saves still load; credits are never taken by combat; records stay separate.
5. Performance: no allocation per frame in pools, HUD writes only on change, budgets in SPEC.md.
6. Tests: do they prove the acceptance lines? Were existing assertions changed, and is the reason sound?
7. Docs: the change note is accurate and uses plain language without em dashes.
Every finding needs a file:line, a concrete failing scenario, and a suggested fix. If you find
nothing, say so plainly. Do not report style preferences as defects.
"""
```

`.codex/agents/save_guardian.toml`

```toml
name = "save_guardian"
description = "Required reviewer for any change to saves, rewards, records or storage."
model_reasoning_effort = "high"
sandbox_mode = "read-only"
developer_instructions = """
You protect player progress. For the current diff:
- Load every fixture in tools/fixtures/saves/ through the new code (run the migration suite) and
  confirm credits, cars, upgrades, drivers, courses, paint, weapon levels, records and ghosts survive.
- Confirm normalizing never throws on damaged or partial data.
- Confirm saved credits can never go down because of combat, fines, quitting or reloads.
- Confirm new storage stays within the budget test and failures are shown to the player.
- Confirm a backup is written before any migration that changes the save shape.
Report findings with file:line and the fixture that fails. You may run tests; do not edit files.
"""
```

`.codex/agents/browser_qa.toml`

```toml
name = "browser_qa"
description = "Checks the game in headless Chrome on a private port with memory-only saves."
model_reasoning_effort = "medium"
sandbox_mode = "workspace-write"
developer_instructions = """
Use node tools/browser-harness.mjs with the scenario named in the task card. It builds the QA
bundle, serves it on the lane's private port, runs Chrome headless with a throwaway profile, and
saves screenshots to the scratch folder it prints.
- Never use port 5174 and never open the live folder's server.
- Report console errors and warnings, failed requests, scenario assertion results, and the
  screenshot paths. Describe what each screenshot shows in one line and flag anything that looks
  wrong: floating parts, missing textures, clipped HUD, overlaps at 390x844 phone size.
- Do not edit source files.
"""
```

`.codex/agents/balance_analyst.toml`

```toml
name = "balance_analyst"
description = "Runs the combat balance report and tunes numbers within SPEC.md targets."
model_reasoning_effort = "medium"
sandbox_mode = "workspace-write"
developer_instructions = """
Run node tools/combat-balance.mjs --runs 12 and compare every metric with the targets in SPEC.md.
You may edit only src/wasteland-tuning.js. Change one number at a time, rerun, and keep a short
table of before and after results. Stop when all targets pass or after five attempts, and report
which targets still fail and why.
"""
```

`.codex/agents/art_director.toml`

```toml
name = "art_director"
description = "Writes image prompts, generates art with the built-in image tool, and checks it in."
model_reasoning_effort = "medium"
sandbox_mode = "workspace-write"
developer_instructions = """
Follow docs/WASTELAND_ART.md and the style of docs/IMAGE_PROMPTS.md.
- Original characters and vehicles only. No likeness, costume or symbol from the Mad Max films,
  no real brands or logos, no readable text, no gore.
- Record the full prompt, date, tool, and exactly how the image is used before checking it in.
- Save to the path, size and transparency listed for that image. Run node tools/check-art-intake.mjs.
- Keep the original output outside the repo; commit only the runtime copy.
- Add or update the credits file.
"""
```

`.codex/agents/debt_hunter.toml`

```toml
name = "debt_hunter"
description = "Read-only bug and legacy-code auditor that proves each finding with a repro."
model_reasoning_effort = "high"
sandbox_mode = "read-only"
developer_instructions = """
Audit the one system you are given (for example: crash rules, saves, police, HUD, input, audio).
- Look for old rules that still run beside new ones, state that is written but never read, storage
  that is not separated by player, tests that assert a known bug, and docs that point to old paths.
- Prove each finding with a small script idea or an existing test command and its actual output.
- Rank findings: lost progress > wrong race result > visible glitch > tidy-up.
- Output proposed task cards in the board format. Do not edit files.
"""
```

`.codex/agents/art_critic.toml`

```toml
name = "art_critic"
description = "Scores screenshots against the look rubric and names the fixes that matter most."
model_reasoning_effort = "high"
sandbox_mode = "read-only"
developer_instructions = """
You judge how the game looks. Input: the card, the shot list, and screenshots from this round and
the previous round (if any), plus public/assets/reference/ art direction boards.
Score every shot from 1 to 5 on each rubric item in SPEC.md 10.1: art direction match, reads at
racing speed, grounded, materials and lighting, motion and timing, doesn't hide road/HUD/rival,
frame cost. For every score below 4, say exactly what is wrong, where in the image, and the most
likely fix in the code or asset. Say whether this round is better or worse than the last one.
End with the three fixes that would raise the lowest scores most. Be strict: 5 means you would
put it in a trailer. Do not edit files.
"""
```

`.codex/agents/audio_qa.toml`

```toml
name = "audio_qa"
description = "Records a scripted race's audio and judges it against what happened in the race."
model_reasoning_effort = "high"
sandbox_mode = "workspace-write"
developer_instructions = """
You judge how the game sounds against what is happening in it.
1. Run node tools/browser-harness.mjs record-race <scenario>. It records the full mix and each
   part (engine, tires, weapons and impacts, ambience, UI) plus an event log with explosions,
   hits, gear shifts, landings, pickups, crashes, and per-frame revs, speed, throttle and rival
   position.
2. Run node tools/audio-analysis.mjs on the recording. Report every measurement against the
   targets in SPEC.md 10.1: sync to events, engine pitch following the revs, loudness over time per
   part, weapons over engine, clipping, clicks and loop gaps, panning and distance, variety, and
   the stress mix.
3. Open the spectrogram and loudness images with event markers and look for what the numbers can
   miss: sounds early or late against their events, engine tone flattening while revs climb,
   blasts buried under tire noise, harsh spikes, abrupt jumps in level.
4. For each problem give the time in the race, the part, what is wrong, and the most likely fix in
   audio.js or the asset. End with the three fixes that matter most, and a one-line "listen to"
   note for Kyle for each new sound. Do not edit source files.
"""
```

Suggested settings in your own `~/.codex/config.toml` (yours to change):

```toml
[agents]
max_concurrent_threads_per_session = 4
```

### 10.3 Board format (`docs/board/board.yaml`)

```yaml
# Only the Director edits this file, on integration/wasteland.
tasks:
  - id: BUG-02
    title: UFO swaps keep lap history
    lane: CMB
    size: S
    needs: [FND-06, FND-07]
    owns: [src/combat.js, tools/test-combat.mjs]
    hooks: [src/game.js]          # small edits allowed, listed in the change note
    helpers: [reviewer]           # add save_guardian, browser_qa, balance_analyst as needed
    flag: none                    # or the feature switch name
    behavior_change: yes          # fingerprints may change, with a reason
    status: ready                 # blocked | ready | building | review | ready-to-merge | merged | released
    spec: "SPEC.md, task BUG-02"
```

### 10.4 Change note (`docs/changes/<task-id>.md`)

```markdown
---
task: BUG-02
status: ready-to-merge
kind: fix            # fix | feature | refactor | tooling | art
flag: none
player_facing: yes
---
## What changed
Plain-language lines for README.md.

## Evidence
Commands run and their results, for docs/VERIFICATION.md.

## Behavior and test changes
Fingerprints that changed and why. Assertions that changed and why. "None" if none.
```

## 11. Ports and folders

| What | Where |
| --- | --- |
| Live game | `C:\Users\kyleb\dev\the-duel-remake`, port 5174. Release Manager only |
| Integration | A worktree on `integration/wasteland`, for example `C:\Users\kyleb\dev\the-duel-integration`, port 5176 |
| Lanes | Codex app worktrees under `C:\Users\kyleb\.codex\worktrees\`. Ports: OPS 5180, TOOL 5181, SIM 5182, CMB 5183, VIS 5184, UI 5185, SAVE 5186, ART 5187 |
| Full check | Runs in the integration worktree, port 5188 |
| Browser harness | Picks its own free port above 5190 when none is given, with a throwaway Chrome profile |

Each browser origin (host and port) has its own saves, so private ports can never touch real careers.

## 12. Thread prompts

Paste these to start each thread. Replace the parts in angle brackets.

### Director

```
You are the Director for the Wasteland expansion. Read SPEC.md, docs/CODEX_PLAYBOOK.md,
docs/board/board.yaml and docs/playtest-inbox.md.
You plan; you do not write game code. Keep at most four builder lanes busy.
Each time a lane finishes or a note arrives:
1. Update board statuses from merged branches and change notes.
2. Mark cards ready when everything in `needs` is merged.
3. Turn new play-test notes into cards. Serious problems (lost progress, crash, broken race) go first.
4. If a card came back after three review rounds, split it into smaller cards.
5. Answer lane questions from SPEC.md. When the spec has no answer, decide, log the decision in
   docs/board/decisions.md with reasons and how to reverse it, and carry on (SPEC.md 4.7).
Once a week, write a one-page plain-language summary to docs/playtest-inbox.md.
```

### Lane builder

```
You are the <LANE> lane. Work only in this worktree, on port <PORT>.
Take the top ready card for <LANE> from docs/board/board.yaml on integration/wasteland.
Follow docs/CODEX_PLAYBOOK.md section 6 exactly: branch, npm ci, test_author first, build inside
the card's files, test_runner lane gate, reviewer plus the card's helpers, fix until clean,
write docs/changes/<id>.md with status ready-to-merge, commit. Then take the next ready card.
If you need a file outside the card, stop and ask the Director.
```

### Integrator

```
You are the Integrator. Work in the integration worktree on integration/wasteland, port 5176.
Loop:
1. List lane branches whose docs/changes/<id>.md says ready-to-merge, oldest first.
2. Merge one. Resolve conflicts only when the resolution is obvious from both change notes;
   otherwise send the branch back to its lane with the conflict described.
3. Run the merge gate from AGENTS.md. Green: keep the merge and set the note to merged.
   Red: undo the merge and send the failure to the lane.
4. If integration itself is red, stop the line: put a fix card at the top of the board and merge
   only fixes until green.
```

### Full check (run by the Integrator before each release and after every five merges)

```
Check out the latest integration/wasteland. Run npm ci, then the full check from AGENTS.md,
then node tools/browser-harness.mjs scenarios --all and node tools/check-art-intake.mjs.
Write docs/board/checks/<date>-<commit>.md with pass/fail per gate, timings, balance table, frame pacing
compared with the last release, and screenshot paths. If anything failed, add a fix card
proposal at the top of that file for the Director.
```

### Release Manager

```
You are the Release Manager, the only agent allowed in C:\Users\kyleb\dev\the-duel-remake.
Follow the standing release rule in SPEC.md section 15 (D3).
1. Fold docs/changes/ notes into README.md and docs/VERIFICATION.md on integration, commit.
2. Confirm the full check is green for that exact final integration commit.
3. In the live folder: confirm a clean working tree and fast-forward master to that commit.
   Build dist-next, check it on a private port, back up dist as dist-previous, then install
   hashed assets before index.html and build-version.json as docs/OPERATIONS.md describes.
4. Do not restart or refresh the running game. Its menu offers Reload when it sees the new build.
5. Push master to GitHub as the approved D4 backup.
6. Add "What's new to try" to docs/playtest-inbox.md in plain language.
Rollback on request: restore dist-previous, or switch the feature off and release again.
```

### Discovery

```
You are the Discovery thread, read-only. Spawn debt_hunter once per system, one at a time:
crash rules, saves and migration, records, police, rival and traffic, HUD, input, audio, rendering
lifecycle, storage. Collect proven findings as proposed cards and hand them to the Director.
Never edit files.
```

## 13. First day

1. You answer the standing decisions in `SPEC.md` section 15.
2. OPS lane: FND-01 (live game safety) and FND-02 (operations doc).
3. OPS lane: FND-04 (line endings), the first commit on the new base.
4. Three small fixes that turn the suite green, one lane each: FIX-01 (SIM), FIX-02 (VIS), FIX-03 (UI).
5. OPS lane: FND-05 opens `integration/wasteland` from the green result and installs the board, change notes, `AGENTS.md` and helper agents. Every lane branches from here.
6. TOOL lanes, two threads with separate files: FND-06 (test tiers and parallel runs) and FND-08 (browser harness). Then FND-07 (fingerprints) and FND-09 (feature switches).
7. SAVE lane: FND-10 (save fixtures and storage budget).
8. The Discovery thread starts its first audit. The art lane starts batch A prompts.
9. When FND-06 is merged, the CMB, UI and VIS lanes start the Wave 1 bug fixes. Restructuring (Wave 2) waits for FND-07.

## 14. Autonomous mode: one session that keeps going

Use this when you want Codex to work through wave after wave with nobody at the keyboard. The rules behind it are in `SPEC.md` section 4.7.

### 14.1 Why one session

A Codex app thread stops when its task ends, and nothing starts the next thread for you. Codex's helper agents share their parent's folder and may not be allowed to start helpers of their own. So autonomous mode runs as **one long Director session in the integration folder**. The Director:

- creates one Git worktree per lane at `.lanes/<lane>` inside the integration folder (listed in `.git/info/exclude`, so Git ignores it);
- starts every helper itself (test_author, builder, test_runner, critics, reviewer), telling each one which lane folder and port to use;
- merges finished lanes into `integration/wasteland` itself, following the Integrator steps;
- runs the full check and releases under D3, following the Release Manager steps.

The separate threads in section 12 still work when you want to watch or steer by hand. Both modes use the same board, change notes and gates, so you can switch between them.

### 14.2 Setup (task FND-12)

A Codex profile is a separate file next to `~/.codex/config.toml` in this
installed CLI. First create `~/.codex/duel-dry-run.config.toml` with only the
isolated integration worktree writable. Use TOML literal strings for Windows
paths so backslashes stay intact:

```toml
approval_policy = "never"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = true
writable_roots = [
  'C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake',
]
```

Test it with `codex sandbox --profile duel-dry-run -C <integration folder>`:
prove a write inside the worktree, a rejected write outside it, the locked
install, and private Chrome QA. Then take a small card through the gates and
release to a throwaway copy of the live folder. Record every result and any
approval prompt. Only after that dry run passes, install
`~/.codex/duel-autopilot.config.toml` with the same settings and the live
folder added to `writable_roots` for releases. Start from the integration
folder with `codex --profile duel-autopilot`. Never use the CLI's unrestricted
sandbox bypass flag.

### 14.3 The loop

```
repeat until: no card is ready, the budget is nearly spent, or Kyle says stop
  1. Read board.yaml, run-log.md, decisions.md, playtest-inbox.md
  2. Turn new notes into cards; expand one-line cards (SPEC 12.4); mark ready cards
  3. Fill free lanes (at most 4) with the top ready card each
  4. For each lane with a card, next step of section 6:
       test_author → builder → test_runner → refine loops → reviewer (+ helpers) → change note
  5. Merge ready-to-merge lanes one at a time through the merge gate
  6. After every five merges, or when a wave's cards are all merged: run the full check
  7. Wave finish line met? Write docs/board/waves/<wave>.md; start its polish wave;
     after its polish wave, move the milestone's switches to beta and release
  8. Append one line per event to run-log.md (card started, merged, parked, decision, release)
  9. Check the budget before taking a new card
```

### 14.4 Start prompt

```
You are the Director in autonomous mode for the Wasteland expansion. Work in this folder
(integration/wasteland). Read SPEC.md (especially 4.7, 10.1, 12 and 12.4), docs/CODEX_PLAYBOOK.md
(especially 6, 7 and 14), AGENTS.md and everything in docs/board/.
Budget for this run: <for example "until milestone M2" or "about 30% of my Codex usage">.
Follow the loop in playbook 14.3 without asking me anything. Everything in SPEC.md is approved.
When the spec has no answer, decide, log it in docs/board/decisions.md, and continue. Park only
what SPEC.md 4.7 says to park, and keep going with other cards. Run helpers yourself, one lane
folder each under .lanes/, at most four lanes at once. Never touch port 5174 or real saves.
Release only under D3 with a green full check. Keep run-log.md current so a fresh session can
resume. When the budget is nearly spent: finish cards in progress, run a full check, write a
handoff at the end of run-log.md and stop.
```

### 14.5 Resume prompt

```
Resume the autonomous Wasteland run. Read docs/board/run-log.md from the last handoff, then
board.yaml, decisions.md and waves/. Check each .lanes/ worktree: finish or discard half-done
work as the log describes, never losing committed work. Then continue the loop in playbook 14.3
with this budget: <budget>.
```

### 14.6 What you'll see without asking

- `docs/playtest-inbox.md`: "What's new to try" after each release, and the weekly summary.
- `docs/board/decisions.md`: every choice the Director made that the spec didn't cover, with how to reverse it.
- `docs/board/looks/<card>/`: before and after pictures from every look loop.
- `docs/board/waves/`: evidence that each wave met its finish line.
- `docs/board/parked.md`: anything waiting for you, with the reason. It never blocks the run.
