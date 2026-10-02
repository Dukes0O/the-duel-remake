# Next run: phase 3, a Wasteland worth finding (updated 30 September 2026)

## Resume here (Claude, 1 October 2026, afternoon)

**Restart resumed, 2 October:** Salt is merged with its final model, public Last
Car Rolling and Fuel Run entry, and once-only scrap and hold rewards. The lane
passed all 332 suites and build. Bounty owns the freed native entry, pay, HUD and
beacon files; the claimed Pit owns venue geometry and world composition. Claude
retains boss files and Arsenal retains audio/tuning. Exact full-tier backup follows
this checkpoint; the old timers stay paused.

**Live:** the Scrapdome (Last Car Rolling), Titan climbing and steering,
Muddy Hollow, the ramp-side fix, Sawtooth Sal with her reward and the settled
warlord pay, and the damaged-save fix. Phase 3 is the last planned phase.

**Answered this afternoon (do not reopen):**
- ARS-CORE: `rangeForTarget(actor)` per candidate is approved (card).
- ARENA-SHOVE: merge; the inherited body and rail crossings do not hold it.
- ART-FIT-TANKER: round 3, the final round, with five directions (card).
- ART-FIT-CREW-W: no system settings; a fresh empty output folder and
  create-new files close the gap (card). Kyle does not need to answer.

**Keep it proportionate (Claude, 1 October 2026).** The overnight run spent
most of its time on its own checking: a 1568-line change note for a
150-line fix, link-safety test matrices, pixel-exact tests for art, and board
notes with no spaces between words. Kyle cannot read them and the cards did
not move. From this run on:
- Board notes and review questions are one to three plain English
  sentences with spaces between words. No hashes, byte counts or commit
  strings in notes; the commit fields already hold those.
- A change note is under 100 lines: what changed, tests, replays that
  changed and why, Removed.
- Do not build new guard or safety test machinery a card does not ask for.
  A risk that cannot happen on one laptop in normal use gets one sentence,
  not a test matrix.
- Looks are judged from pictures by the critic, Claude and Kyle. Automated
  art checks cover only what can break unseen: race state, loading and
  unloading, triangle and draw budgets, frame cost. Do not hold a card on a
  pixel-exact or counter test of how something looks.
- A condition that existed before a card and is unchanged by it never holds
  that card's merge. Note it in one sentence and move on.
- Merge as soon as a card meets its acceptance and its gates. Aim for each
  open card to merge or reach Kyle in this run.

**Evening answers (Claude, 1 October; top of the inbox and cards):**
Computer loadouts need a front attack and no more than two control weapons;
rerun Arsenal balance without changing the Medium target. Every warlord keeps
its released absolute armor; tune ordinary arena cars only. Install tanker
round three after its roof border and amber lamp fixes, then show Claude the
roof with lamps off and on before merge. Salt's final generated ground and
Vesper's costume are approved. Salt finishes public entry after Arsenal and
wreck-rate free their files; both art recipes still wait for Tanker's shared
registration file. Inner-island scrap belongs to P3-POLISH. No fourth art round.

Shove is merged. Kyle's junk-car note opens ARENA-JUNK-SHOVE; his later evening
reply chooses the lower wreck rate, with Sal health unchanged.
Arsenal core and junk movement are merged. The approved ordinary-car armor
change averages 12.4 wrecks per Medium round and preserves every warlord's
health. Tanker and Vesper fitting recipes are merged after Claude's final
art approval, independent native review and current lane/build gates. Their
models stay private until Convoy Raid and WAR-04 supply the runtime callers.
Vesper's preservation tests now freeze each run's current game files, keeping
all donor pins and native art assertions unchanged.

Kyle approved all three held changes on 2 October: both CPU tests accept
Crossbow or Harpoon; Salt's trace records his ordinary-car armor change;
each arsenal or warlord card may add its own settled free CC0 cues. Existing
sounds, voice takes and protected audio lanes remain exact. These are settled.

Salt public entry, art, source metadata and native rewards are merged. The
strict audio capture is exclusive in the existing gate scheduler. Arsenal native save and Core suites pass, and
all thirty-seven runtime audio checks pass. Complete balance meets every
target except measured Smoke use; Claude reviews that gap and the cable picture.
Actual full-throttle audio passes in both qualities with no delivered clipping.
Current gates and Claude review remain.

Kyle transferred WAR-02b, WAR-02c and WAR-03b to Claude. Preserve their tests
and lanes. Codex must not edit warlords.js, sal-fight.js, warlord-event.js,
warlord-settlement.js, arena-brains.js, arena-tell-view.js or
vehicle-contact-modifiers.js. Crew and Bounty wait for their actual file owners.

Kyle lifted the morning deadline and instructed Codex to keep building.
Both obsolete overnight timers are paused. Active work continues here.

### Tracks for this run (up to five lanes)

| Track | Cards, in order | Notes |
| --- | --- | --- |
| A. Dome feel | ARENA-JUNK-SHOVE merged; ARENA-WRECK-RATE merged with Kyle's lower-rate choice; then ARENA-04 Bounty Hunt | Kyle checks the shove in the Preview |
| B. Arsenal | ARS-CORE merged; then ARS-01 | Sound permission is granted; Claude reviews the cable and coverage |
| C. Salt Flats, then the Pit | ARENA-06: generated salt ground first (Kyle), then the far edge, the sparse inner island, heat shimmer; then ARENA-PIT | Comparison sheets to Claude |
| D. Art | Tanker and Vesper fitting merged | Runtime installation follows in Convoy Raid and WAR-04 |
| E. Clean-up | BALANCE-W2-OFF-RETIRE when its files are free | The three bosses belong to Claude |

Kyle, 1 October 2026: the dome steering is kept; his evening reply chooses the
lower ordinary-car wreck rate. The parked junk-car fix proceeds first. Sal is approved as she is
(WAR-SAL-TUNE closed). The weapon sounds (AUD-ARSENAL-W1) need only ARS-CORE:
the sound bank is already live. New card ARENA-PIT (the dome's open
layout, SCRAPDOME.md section 2) follows ARENA-06 in track C. Kyle keeps the nine crew and raider voice takes as they are.

Then follow "Order: the rest of phase 3" below as cards open. Give every card
explicit owned files before starting it; when two cards need one file, take
them one at a time and say why in the card.

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

## Where things stand

- **Live game:** Claude released the Scrapdome, Titan climbing and Muddy
  Hollow on 30 September after Kyle and Gratian approved them. The Wasteland
  remains hidden until found. Crash physics was released on 27 September.
  Player notes arrive at the top of `docs/playtest-inbox.md`. This Director
  integrated Titan handling but did not release it.
- **Development:** `integration/wasteland`. Switches `wasteland2` and
  `hidden-road`, `scrapdome`, `titan-climb` and `muddy-hollow` are `on`;
  `career-backup` is `dev`; `warlords` is `on` after Claude's Sal merge.
- **Phase 2 and BETA-01 are done.** Art is still at about 3 of 5 (crew, hands,
  Rustwall); SPEC 0.11 sets the new approach.
- **Integration:** WAR-02a-FORMAT, WAR-02a-SAL, WAR-02a-REWARD and
  WAR-PAY are merged with `warlords: on`. Sal's moves, free Side Saws,
  the one-time territory claim and the corrected ladder payments are built.
  Claude owns Sal's play-through and release; do not touch that lane.
- **Art:** Quaternius Modular Men is picked for crew. Claude recorded Kyle's
  picks in f586be4: WRAD Arms for hands, all three Rustwall sets, and all three
  Salt Flats groups with the plain Bus. The tiled salt photo is replaced by
  generated salt (Kyle, 1 October 2026; SCRAPDOME.md, Salt Flats). Source comparisons do not replace runtime assets. The
  fitting cards follow docs/WASTELAND_ART.md, Fitting existing models: gritty
  materials, comparison in the game, and a three-round cap. Kyle keeps the current women; only Vesper needs fitting. The tanker
  shortlist remains a source decision with missing trailer parts.

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
| Now | Tracks A to E (Resume here) | |
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

Run the tracks in next-run.md "Resume here" side by side, up to five
lanes at once, and follow its "Keep it proportionate" rules:
  A. Merge ARENA-SHOVE (trim its change note first), then ARENA-04.
  B. Finish and merge ARS-CORE with rangeForTarget, then ARS-01.
  C. ARENA-06 Salt Flats: generated salt ground (Kyle), far edge, inner
     island, heat shimmer.
  D. ART-FIT-TANKER round 3 (final), then ART-FIT-CREW-W.
  E. WAR-02c after ARS-CORE; BALANCE-W2-OFF-RETIRE and WAR-03b when their
     files are free.
Then keep taking cards from "Order: the rest of phase 3" as they open.
Two lanes never edit the same file; if a card needs another lane's file,
wait for that lane to merge. Rerun node tools/board.mjs after every merge.
A warlord or any card with a comparison sheet goes to Claude for review
(waiting_on: claude) before merge.

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
