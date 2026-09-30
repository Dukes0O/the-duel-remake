# Next run: phase 3, a Wasteland worth finding (updated 30 September 2026)

## Resume here (Claude, 30 September 2026)

Released on 27 September: crash physics and effects, the Hard Mad Max CPU
at 6 s, the one-Preview launcher and the thirty-race balance check
(docs/board/run-log.md). Kyle: get Codex moving on the existing cards, in
parallel where it is safe, while Claude designs the rest of phase 3.

### Director continuation, 30 September 2026

The original tracks below are complete except Sal, which is built and waiting
for Claude's Preview play-through. Do not restart a merged source card.

- Sal: retain `lane/cmb/war-02a-sal` at `1b5f3365a9717f477e85d6503d1f2bb88375c272`.
  Its clean lane tier passed 304/304 in 774.64 seconds, build in 1.25 seconds.
  All 23 focused tests and 12 private High/Performance captures pass. Claude
  checks fun, fairness, audible cues and the normal chase-camera callout view
  before merge. The final captures are in integration's ignored
  `.evidence/2026-09-30/WAR-02a-SAL/`.
- Claude's fitting rules/cards and Kyle's art picks are merged as 27cd169 and
  f586be4. New crew, hands, Rustwall, women's source, tanker source and Salt
  Flats venue cards are ready for the next run. Assign explicit owned files
  and hooks before starting a fitting/source card that has none.
- BALANCE-W2-OFF-RETIRE, ARENA-03 and WAR-02c wait for Sal's shared arena
  files. Verify WAR-02c's old warlords path and re-slice its actual hook before
  starting. ARS-CORE is ready, but its sound-bank.js hook belongs to the
  external audio lane; coordinate a slice or wait for that lane's merge.
- The Director is closing this run. Five integration merges have landed since
  the last full tier, including Claude's two art-documentation merges. Hold
  feature merges until the final full tier passes. Its exact result will be
  at the end of run-log.md and in the full-tier ledger.

**Stop rule (Kyle).** This is a game for one laptop, played by Kyle and his
11-year-old son. If a card cannot meet its acceptance with the tools we have
(free services, this laptop, the three-round art cap in SPEC 0.11), stop the
card, write why in its change note, set `waiting_on: kyle`, and ask: get the
tool, or change the plan. Never ship a placeholder, stub or hidden shortcut
as the finished thing.

**How the work is split.** `node tools/board.mjs` shows it. Codex starts only
cards under CODEX CAN START NOW, claims each (`status: building`,
`claimed_by`) on integration first, and never starts a card owned by Claude
or Kyle. Claude settles design in writing, judges look and feel, and prepares
releases. A design question goes to Claude in writing.

### Original parallel tracks for this run

| Track | Cards, in order | Runs beside |
| --- | --- | --- |
| A. Warlords | WAR-02a-FORMAT, then WAR-02a-SAL and WAR-02a-REWARD in two lanes | B (FORMAT only), C, D, E |
| B. Crash clean-up | CRASH-SWITCH-REMOVE | A's FORMAT, C, D, E |
| C. On-foot hints | UX-ENTRY-HINTS | everything |
| D. Art sourcing | ART-SRC-CREW, ART-SRC-HANDS, ART-SRC-RUSTWALL (three small lanes; each stops at a sheet for Kyle) | everything |
| E. Housekeeping | HK-RUSTWALL-BASELINE | everything |

**Must wait, and why:**

- WAR-02a-REWARD waits for CRASH-SWITCH-REMOVE as well as FORMAT: both edit
  car contacts (`src/sim-contacts.js`, `src/combat-armor.js`).
- WAR-02a-FORMAT keeps the warlord's 1.5 times armor inside the arena files;
  if it needs `src/combat-armor.js`, it waits for CRASH-SWITCH-REMOVE.
- WAR-02a-SAL: when built, `status: review` and `waiting_on: claude`; Claude
  plays it in the Preview before merge.
- BALANCE-W2-OFF-RETIRE has Kyle's approval. It waits until no other lane owns
  the released-switch files; Sal still owns arena dispatch and pilot files.
- WAR-02b and WAR-02c start when Claude marks DESIGN-WAR-02b and
  DESIGN-WAR-02c merged; the arsenal, crew and arena-mode build cards appear
  on the board as Claude settles their designs. Pick them up as they appear.

Up to five lanes at once. Two lanes never edit the same file; when unsure,
serialize and say why in the card.

## Where things stand

- **Live game:** Claude released the Scrapdome, Titan climbing and Muddy
  Hollow on 30 September after Kyle and Gratian approved them. The Wasteland
  remains hidden until found. Crash physics was released on 27 September.
  Player notes arrive at the top of `docs/playtest-inbox.md`. This Director
  integrated Titan handling but did not release it.
- **Development:** `integration/wasteland`. Switches `wasteland2` and
  `hidden-road`, `scrapdome`, `titan-climb` and `muddy-hollow` are `on`;
  `career-backup` and `warlords` are `dev`.
- **Phase 2 and BETA-01 are done.** Art is still at about 3 of 5 (crew, hands,
  Rustwall); SPEC 0.11 sets the new approach.
- **Integration:** WAR-02a-FORMAT and WAR-02a-REWARD are merged behind
  `warlords: dev`. Rewards, free Side Saws and the one-time territory claim
  are implemented. Sal's signature moves remain on their review lane.
- **Art:** Quaternius Modular Men is picked for crew. Claude recorded Kyle's
  picks in f586be4: WRAD Arms for hands, all three Rustwall sets, and all three
  Salt Flats groups with the plain Bus. The CC0 salt photo with mirrored UV
  tiling is approved. Source comparisons do not replace runtime assets. The
  fitting cards follow docs/WASTELAND_ART.md, Fitting existing models: gritty
  materials, comparison in the game, and a three-round cap. Female crew and
  the armored tanker need their new source cards.

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

## Order: the rest of phase 3 (settled 30 September 2026)

Every remaining phase 3 feature is settled for build:
`docs/ARSENAL.md` (car weapons), `docs/CREW.md` (gear, boarding, computer
crews) and `docs/SCRAPDOME.md` sections 5 and 10 (warlords 2 to 8, the
ladder's end, Fuel Run, Bounty Hunt, Ambush Alley, the Salt Flats, Convoy
Raid). Build on them; do not redesign them. If a number turns out wrong in
play or in the balance check, record the evidence and the change in
`docs/board/decisions.md` and keep going.

The board's `needs` lists are the order. Waves that can run side by side:

| Wave | Cards | Notes |
| --- | --- | --- |
| Now | Tracks A to E (Resume here) and ART-SRC-SALTFLATS | |
| After WAR-02a-FORMAT | WAR-02a-SAL, WAR-02c, ARENA-03 | All three touch arena dispatch: take them one at a time unless their files are proven separate |
| After WAR-02a-REWARD | ARS-CORE | Also edits the armory and car contacts |
| After ARS-CORE | WAR-02b, ARS-01, CREW-02 | Three lanes: warlord, weapons, on foot |
| After CREW-02 | CREW-03, CREW-04, ARENA-05 | CREW-04 and ARENA-05 both touch raiders: one at a time |
| After ARS-01 | ARS-02, then ARS-03 (also needs WAR-02c) | |
| After WAR-02a-SAL | WAR-03b; WAR-03a (needs ARS-02); WAR-03c (needs CREW-02) | Each warlord goes to Claude for a play-through before merge |
| After Kyle picks the Salt Flats | ARENA-06, then ARENA-07 (needs CREW-03), then WAR-03d | |
| Last | WAR-03e, then WAR-04 | |

Claude, alongside: warlord play-throughs as they reach review, the playtests
Kyle and Gratian do in the Preview (FEATURE-PLAYTEST, SCRAPDOME-PLAYTEST),
releases on Kyle's go-ahead, and P3-POLISH at the end.

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

- UX-ENTRY-HINTS and HK-RUSTWALL-BASELINE merged on 30 September. The hints
  explain the verified F/gamepad X controls and thresholds. Rustwall's frame
  test now uses a checked-in baseline instead of reading an old Git commit.
- HK-LAUNCHER-PORT merged on 30 September. Its test-only helper retries
  Windows-reserved ports without changing any launcher assertion.
- OPS-LAUNCHER-DIAG is closed: Kyle confirmed that double-click opens the game
  after the audio session refreshed shortcut metadata. The earlier cause was
  not proved; no launcher repair or root-cause task remains authorized.
- The backlog capture note is consumed. Its two current board records and
  merge verdict remain in the board and run log.
- The end sweep removed 64,392,137 bytes of reproducible release-browser
  evidence from 27 September after confirming the committed verdict. Current
  licensed sources and Sal's pending review evidence stay. DISC owns checking
  the audit's 48 literal asset candidates against dynamic references.
- Old voice auditions belong to the external audio lane's cleanup. Preserve
  audio-src/voices and do not inspect or remove that protected lane's files.

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

```
You are the Director in autonomous mode for The Duel. Work in this folder
(integration/wasteland). Read AGENTS.md (especially "Who works on what"),
docs/board/next-run.md (start at "Resume here"), docs/CODEX_PLAYBOOK.md
section 6, SPEC.md section 0, docs/SCRAPDOME.md section 5 and the top of
docs/playtest-inbox.md. Then run node tools/board.mjs.

Run these tracks side by side, up to five lanes at once, exactly as the
table in next-run.md says:
  A. WAR-02a-FORMAT, then WAR-02a-SAL and WAR-02a-REWARD in two lanes
     (REWARD also waits for CRASH-SWITCH-REMOVE).
  B. CRASH-SWITCH-REMOVE.
  C. UX-ENTRY-HINTS.
  D. ART-SRC-CREW, ART-SRC-HANDS, ART-SRC-RUSTWALL (each stops at a
     comparison sheet with waiting_on: kyle).
  E. HK-RUSTWALL-BASELINE.
Two lanes never edit the same file; if a card needs another lane's file,
wait for that lane to merge. Claude is settling the rest of phase 3 while
you work: rerun node tools/board.mjs after every merge and pick up new cards
under CODEX CAN START NOW as they appear.

Claim each card on the board before starting. Never start a card owned by
Claude or Kyle. The designs are settled by Claude: build on them, do not
redesign them; send design questions to Claude in writing. Follow Kyle's stop
rule: if a card cannot meet its acceptance with the tools we have on this
laptop, stop, write why, set waiting_on: kyle and move on. Write tests
first. Gates: lane tier and build before every merge; full tier after every
5 merges or 2 hours and at the end; build-status after every merge; janitor
after every merge with plain git worktree remove, and the sweep at the end.
The Preview builds into .preview-dist; never touch it, the live folder, port
5174 or real saves. Do not rewrite history or release; push
integration/wasteland after each passing full tier (D8). When the budget is
nearly spent: finish cards in progress, run the full tier and the janitor
sweep, update STATUS.md, write a short handoff at the end of run-log.md,
push, and stop.
```
