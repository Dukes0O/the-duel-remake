# Next run: phase 3, a Wasteland worth finding (updated 30 September 2026)

## Resume here (Claude, 30 September 2026, evening)

Live since this evening: the Scrapdome (Last Car Rolling), Titan climbing,
Muddy Hollow, the Titan's low-speed steering and the ramp-side fix
(ARENA-RAMP-SIDE). Sal's fight, the Side Saws and her reward are merged and
reachable in the Preview behind the `warlords` switch. Phase 3 is the last
planned phase and about thirty build cards remain; the order is below.

Kyle played Sal on Medium and won 3-0. Three findings, settled as cards:
**WAR-PAY** (the win paid 25 scrap), **ARENA-STEER** (steering in the dome is
too slow for a ring) and **ARENA-SHOVE** (sitting cars cannot be shoved).

### Director checkpoint, 30 September, 22:08 UTC

WAR-PAY is merged. The full tier passed 306/306 suites and build on clean
`bcb09e44`; the merge count resets to zero. The next full is due after five
merges or 00:08:38 UTC, and at the end. A push waits for a fresh full pass on
the exact final commit after automatic approval rejected the newer metadata
commit. The existing GitHub remote and branch refs have been verified.

ARENA-STEER remains on its clean lane, waiting for Kyle's explicit approval
to isolate the crate spawn fixture. Its App demo correction waits for Fuel's
App ownership to end. ART-FIT-CREW-M stopped after the failed first comparison;
keep current art until Kyle chooses better source parts or closes fitting.

ART-SRC-CREW-W has two inspected CC0 alternatives and a comparison ready for
its corrected lane/build gate. Neither supplies the settled garments and
full actions; no runtime replacement is approved. Its source artifact merge
will release the catalog for ART-SRC-TANKER. Fuel Run's tests-first fixes
cover original-carrier recovery, actual fighter chase/aim and named-player
mode selection. Fighter projectile damage and splash rules wait for Claude's
written decision in the inbox. Arsenal and arena cards wait for those shared
files; do not take the hooks from a paused or active lane.

### Tracks for this run (up to five lanes)

| Track | Cards, in order | Notes |
| --- | --- | --- |
| A. Dome feel | ARENA-STEER, then ARENA-SHOVE | Both touch driving and contact files; one at a time. Kyle checks each in the Preview |
| B. Warlord pay, then warlords | WAR-PAY, then WAR-02c (Mother Mirage) | WAR-PAY first: it edits the settlement WAR-02c will call |
| C. Arsenal | ARS-CORE, then ARS-01 | ARS-CORE's sound-bank hook belongs to the audio lane: add only new cue names, or wait. Starts after ARENA-STEER if both need `src/sim-driving.js` |
| D. Art | ART-FIT-CREW-M, ART-SRC-CREW-W, ART-SRC-TANKER, then ART-FIT-HANDS, ART-FIT-RUSTWALL, ARENA-06 | docs/WASTELAND_ART.md "Fitting existing models"; send every comparison sheet to Claude, who shows Kyle |
| E. Clean-up | BALANCE-W2-OFF-RETIRE | Many files: run it when no other lane owns them, in parts |

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
  `career-backup` and `warlords` are `dev`.
- **Phase 2 and BETA-01 are done.** Art is still at about 3 of 5 (crew, hands,
  Rustwall); SPEC 0.11 sets the new approach.
- **Integration:** WAR-02a-FORMAT, WAR-02a-SAL, WAR-02a-REWARD and
  WAR-PAY are merged behind `warlords: dev`. Sal's moves, free Side Saws,
  the one-time territory claim and the corrected ladder payments are built.
  Claude owns Sal's play-through and release; do not touch that lane.
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
lanes at once:
  A. ARENA-STEER, then ARENA-SHOVE.
  B. WAR-PAY, then WAR-02c.
  C. ARS-CORE, then ARS-01.
  D. ART-FIT-CREW-M, ART-SRC-CREW-W, ART-SRC-TANKER, then ART-FIT-HANDS,
     ART-FIT-RUSTWALL and ARENA-06 (Kyle's picks are on the cards).
  E. BALANCE-W2-OFF-RETIRE when no other lane owns its files.
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
