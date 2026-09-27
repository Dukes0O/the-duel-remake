# Next run: phase 3, a Wasteland worth finding (updated 26 September 2026, overnight)

## Resume here (Claude handoff, 26 September 2026, evening)

Claude stopped for quota mid-merge. Steps 1 to 3 are card INT-0926-MERGE;
do them first, in order, then continue with the plan below.

1. **Sound lane** `lane/audio/crash-hollow-sounds` (worktree
   `C:\Users\kyleb\.codex\worktrees\sounds\the-duel-remake`, pushed): crash
   impact, pond splash and mud sounds; finishes CRASH-02 and EGG-03 audio. Its
   records are complete (docs/changes/CRASH-02.md, EGG-03.md). It already
   contains integration through GATE-REJOIN. Its gate passed 285 suites and
   failed test-combat-audio (splash true peak); Claude fixed and pushed that.
   Rerun `node tools/run-tests.mjs --tier lane --changed
   --jobs 8` and `npm run build`, then merge it and run the janitor.
2. **Arena lane** `lane/audio/arena-feel` (worktree
   `C:\Users\kyleb\.codex\worktrees\arena-feel\the-duel-remake`, pushed),
   stacked on the sound lane: the rammer's charge tell, respawn shimmer and
   arena sounds (docs/changes/ARENA-FEEL.md, status ready-to-merge). After
   step 1, merge integration into it, run the lane gate and build, set its
   note to merged, merge, janitor.
3. Full tier on the final integration commit, `node tools/build-status.mjs`,
   then push integration/wasteland (D8). Integration is ahead of origin by
   the GATE-REJOIN merge, which has not had a full tier yet.
4. **Release needed, Kyle's go-ahead first.** GATE-REJOIN and RALLY-CHECKPOINT
   fix two live bugs Kyle and Gratian hit: reversing back down the hidden road
   froze the race, and the rally car was snapped onto the road near the
   Pacific Canyon shortcut. The fix only
   reaches his game through a release (docs/OPERATIONS.md). Prepare the
   release evidence and ask Kyle; do not release without his written yes.
5. Open task chip for Kyle: the `combat-audio` browser scenario fails with
   "No owned flight voice" on integration without any of today's changes.

Janitor note: Claude force-removed the merged gate-rejoin lane folder
(committed and merged work only, ignored scratch deleted). Use plain
`git worktree remove` from here on, as AGENTS.md requires.

## Warlords for Gratian: the plan and who does what (Kyle, 26 September 2026)

Gratian wants to play the warlord fights. Two steps get him there: a
**Preview** icon so he can test each piece the day it merges (nothing is
saved), then **real releases** on Kyle's written go-ahead. The first warlord
is Sawtooth Sal; her fight is settled for build in docs/SCRAPDOME.md
section 5. Later warlords are settled one at a time after Sal has been played.

**Where to look.** Every task is a card in docs/board/board.yaml with an
`owner`. Run `node tools/board.mjs` to see the split:

- CODEX CAN START NOW: the only cards a Codex agent starts. Claim one by
  setting `status: building` and `claimed_by` on integration, then follow
  docs/CODEX_PLAYBOOK.md section 6. Several agents can take different cards
  at once, up to five lanes.
- CLAUDE IS WORKING ON and CLAUDE NEXT: Claude's cards. Never start them.
- WAITING FOR CLAUDE'S REVIEW / WAITING FOR KYLE: paused for a verdict or a
  go-ahead; pick another card meanwhile.

**How the work is split.** Claude settles rules and design in writing, judges
look and feel from screenshots and play, takes small subtle fixes to the live
game, and prepares releases for Kyle. Codex builds, tests, balances, runs the
art and sound pipelines and keeps the janitor. A design question goes back to
Claude in writing; Codex does not invent a rule to get unstuck.

**Stop rule (Kyle).** This is a game for one laptop, played by Kyle and his
11-year-old son. If a card cannot meet its acceptance with the tools we have
(free services, this laptop, the three-round art cap in SPEC 0.11), stop the
card, write why in its change note, set `waiting_on: kyle`, and ask: get the
tool, or change the plan. Never ship a placeholder, stub or hidden shortcut
as the finished thing.

### Codex cards

| Card | What | Can start |
| --- | --- | --- |
| INT-0926-MERGE | Finish today's merges (sounds, ARENA-FEEL), full tier, push | Now |
| PREVIEW-LAUNCHER | The Preview desktop icon | Now |
| COMBAT-AUDIO-SCENARIO | Fix the failing combat-audio browser check | Now |
| WAR-SAL-ART | Sal's side saws, sparks and saw scream; Claude judges the sheet | Now |
| WAR-01 | The warlord ladder on the territory map (FIGHT, REMATCH, COMING LATER) | Now |
| WAR-02a-FORMAT | The warlord duel format, launched from the map | After WAR-01 and INT-0926-MERGE |
| WAR-02a-REWARD | Side Saws that work, scrap, one-time claim (Save Guardian) | After WAR-02a-FORMAT |
| WAR-02a-SAL | Sal's Saw Sweep, window and phase-two Charge; Claude plays it | After WAR-02a-FORMAT and WAR-SAL-ART |
| WAR-02b, WAR-02c | The Dustmonger and Mother Mirage, in parallel lanes | After Claude settles each |

### Claude cards

| Card | What | When |
| --- | --- | --- |
| RALLY-CHECKPOINT | The rally car snapped onto the road by checkpoints | Now (in progress) |
| SCRAPDOME-PLAYTEST | Gratian and Kyle play Last Car Rolling in Preview; notes become codex cards | After PREVIEW-LAUNCHER |
| SCRAPDOME-RELEASE | The Scrapdome in the real game, with GATE-REJOIN and the rally fix | Kyle's go-ahead |
| WAR-SAL-TUNE | Play Sal, tune to "winnable in a few tries" | After Sal's cards |
| WAR-SAL-RELEASE | The ladder and Sal in the real game | Kyle's go-ahead |
| DESIGN-WAR-02b, DESIGN-WAR-02c | Settle the Dustmonger and Mirage for build | After Sal has been played |

**In order, not side by side:** WAR-01, then WAR-02a-FORMAT, then Sal's fight
and reward, then WAR-SAL-TUNE and the release. **Side by side:** everything
else, including all of today's "Can start: Now" cards.

## Where things stand

- **Live game:** the Wasteland is released as an easter egg (EGG-REL), with
  the on-foot controls fix and no R restart key (FOOT-FIX). Kyle and Gratian
  are playing it. Their notes arrive at the top of `docs/playtest-inbox.md`
  and go to the top of the board.
- **Development:** `integration/wasteland`. Switches `wasteland2` and
  `hidden-road` are `on`; `career-backup` is `dev`.
- **Phase 2 and BETA-01 are done.** Art is still at about 3 of 5 (crew, hands,
  Rustwall); SPEC 0.11 sets the new approach.
- **Built by Claude on 26 September (merged):** the Scrapdome foundation
  (ARENA-01), its yard entry, display and results (ARENA-01-UI), and crates,
  jousting, junk sense and balance (ARENA-02 part 1). All behind `scrapdome`
  (dev). **In progress on a branch:** crash physics (CRASH-01), see below.
- **Designed by Claude, not yet built:** Titan climbing (TITAN-01) and Muddy
  Hollow (EGG-03), in `docs/MUDDY_HOLLOW.md`.

## Rules for this phase (Kyle, SPEC 0.12)

- **The main menu does not change.** The only Wasteland choice there is Mad
  Max Duel, plus the WASTELAND button a player earns by finding the gate. No
  new menu buttons, settings or Experimental panels. New Wasteland screens
  live inside the Scrapdome yard.
- **The Wasteland stays hidden until found.** Anything new in Mad Max races
  applies only to a player who has found the gate: check
  `app.wastelandUnlocked()` in menus and shops, and the race's switch view
  (`duel.featureFlags`) in the race. Before discovery, Mad Max Duel stays as it is.
- **New features start behind a new `dev` switch** in `src/feature-flags.js`,
  and move to `on` only in a release Kyle approves in writing. There is no
  player-facing beta stage any more.
- **Controls:** test every new on-foot or camera control through the camera,
  as `tools/test-onfoot-screen-directions.mjs` does: a key that says "right"
  must move right on screen.

## Order

The arena and warlord design is settled in `docs/SCRAPDOME.md` (SPEC 0.13),
and its foundation is built and merged (ARENA-01: venue, event rules, teams,
the computer pilot and brains, tests). Build on it; do not redesign it. Its
section 8 lists the measured behaviour, the balance targets and the known gaps;
section 9 lists the cards.

| Order | Card | Done when |
| --- | --- | --- |
| 0 | **Play-test notes** | Anything Kyle reports from the live game goes first, including UX-ENTRY-HINTS |
| 1 | **CRASH-01** | Finish the branch `lane/arch/crash-physics` exactly as `docs/changes/CRASH-01.md` says (four test files, each with a settled decision), re-pin changed fingerprints with reasons, combat balance in its bands, browser review, merge |
| 2 | **TITAN-01** | The Titan climbs whole hills under its slope limit; slopes slow it going up and speed it going down |
| 3 | **EGG-03** Muddy Hollow | Built in the six phases on the card, each merged separately behind `muddy-hollow` (dev) |
| 4 | **ARENA-02-PAY** | Scrap and Scrapdome hold for Last Car Rolling, paid once |
| 5 | **CRASH-02**, **ARENA-FEEL** | Crash look and sound; arena tells, callouts and sounds |
| 6 | **WAR-01**, then **WAR-02a, WAR-02b, WAR-02c** | Warlord ladder; Sawtooth Sal, The Dustmonger, Mother Mirage, each with a working reward |
| 7 | Then | ARS-01; ARENA-03 to ARENA-05; CREW-02 to CREW-04; ARS-02 and ARS-03; WAR-03 and WAR-04 (warlords 4 to 8, designed in writing in the SCRAPDOME.md section 5 format first); ARENA-06 and ARENA-07 |
| 8 | Polish and release | Look, sound and feel rounds (SPEC 10.1), then a release Kyle approves |

Designs are settled in `docs/SCRAPDOME.md`, `docs/CRASH_PHYSICS.md` and
`docs/MUDDY_HOLLOW.md`. Build on them; do not redesign them. If a design
choice turns out wrong in play or in the numbers, record the evidence and the
change in `docs/board/decisions.md` and keep going.

### Art, alongside (SPEC 0.11)

GFX-01-P3 (crew), GFX-02-P3 (first-person hands) and EGG-02-P3 (Rustwall and
wash) start with a sourcing step: two or three candidate starting assets per
family from CC0 libraries first, licences checked and recorded in
`tools/art/catalog.json`, and a short list with pictures for Kyle. No
adaptation work before Kyle picks. At most three rounds per art card per run.

### Audio, alongside

AUD-17: wire Kyle's kept voice lines (in `audio-src/voices/`, cataloged) into
crew callouts and raider warnings, with subtitles. Raiders use Bill; Rook's
line is Harry. Then AUD-15, AUD-16 and AUD-18 in SPEC 0.9 order. The arcade
rule for car weapons stands: bright transient above the engine band, tonal
signature, a flight sound that travels with the projectile, a hit-confirm, and
judged over the engine at full throttle. ElevenLabs: up to 1,500 credits per run
for candidates only; Kyle picks.

### Housekeeping

- Merge `codex/ux-backlog-notes` with the docs lane gate. It records Kyle's
  UX-ENTRY-HINTS request and the closed OPS-LAUNCHER-DIAG report. Kyle later
  confirmed that double-click opens the game after the audio session refreshed
  shortcut metadata. The earlier cause was not proved; no launcher repair or
  root-cause task remains authorized.
- Do UX-ENTRY-HINTS early in the run: Kyle and Gratian are playing on foot now.

- `tools/test-rustwall-frame.mjs` reads commit `5a994ad` from Git history.
  Give it a checked-in baseline so a history compaction cannot break it.
- The audio lane's old voice audition takes in its `.evidence/` can go now that
  Kyle has picked (keep `audio-src/voices/`).

## Rules to watch

- Gates: lane tier and build before every merge; full tier after every 5
  merges or 2 hours and at the end of the run; update STATUS.md after every merge.
- After every merge, the janitor deletes that lane's branch, folder and used
  evidence (unlink `node_modules` junctions first). Never delete a branch for
  being idle; never delete Kyle's branches.
- Sizes are advisory targets; record why an asset grows.
- Push `integration/wasteland` after each passing full tier (D8). No history
  rewrite and no release without Kyle's written approval.

## Start prompt

Paste into a fresh Codex session from
`C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake`.
Use Sol: the designs are settled.

```
You are the Director in autonomous mode for The Duel. Work in this folder
(integration/wasteland). Read AGENTS.md (especially "Who works on what"),
docs/board/next-run.md, docs/CODEX_PLAYBOOK.md section 6, SPEC.md section 0,
docs/SCRAPDOME.md section 5 and the top of docs/playtest-inbox.md. Then run
node tools/board.mjs. Work only on cards listed under CODEX CAN START NOW,
starting with INT-0926-MERGE; claim each card on the board before starting,
and run up to five lanes in parallel. Never start a card owned by Claude or
Kyle. The designs are settled by Claude: build on them, do not redesign them;
send design questions to Claude in writing. Follow Kyle's stop rule: if a
card cannot meet its acceptance with the tools we have on this laptop, stop,
write why, set waiting_on: kyle and move on. Write tests first. Gates: lane
tier and build before every merge; full tier after every 5 merges or 2 hours
and at the end; build-status after every merge; janitor after every merge
with plain git worktree remove, and the sweep at the end. Never touch the
live folder, port 5174 or real saves. Do not rewrite history or release;
push integration/wasteland after each passing full tier (D8). When the budget
is nearly spent: finish cards in progress, run the full tier and the janitor
sweep, update STATUS.md, write a short handoff at the end of run-log.md,
push, and stop.
```
