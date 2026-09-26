# Next run: phase 3, a Wasteland worth finding (updated 26 September 2026, overnight)

This is the one current plan for Codex. Rules: `AGENTS.md` (the nine working
rules and the janitor) and SPEC.md section 0, especially 0.9 (audio), 0.11
(art from existing assets), 0.12 (the easter egg), 0.13 (Scrapdome) and 0.14
(crash physics and the Titan's playground).

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

- Merge `codex/ux-backlog-notes` (Kyle's two relayed requests, UX-ENTRY-HINTS
  and OPS-LAUNCHER-DIAG) with the docs lane gate. The launcher failure Kyle
  saw on 25 September was a damaged rolldown package in the live folder,
  repaired with `npm ci --offline`; OPS-LAUNCHER-DIAG should find what deleted
  its `package.json` (likely a lane cleanup through a `node_modules` link).
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
(integration/wasteland). Read AGENTS.md, docs/board/next-run.md, SPEC.md
section 0 (especially 0.9, 0.11, 0.12, 0.13 and 0.14), docs/SCRAPDOME.md,
docs/CRASH_PHYSICS.md, docs/MUDDY_HOLLOW.md, docs/board/STATUS.md,
docs/board/decisions.md and the top of docs/playtest-inbox.md. The designs are
settled by Claude: build on them, do not redesign them, and log any evidence-
based change in decisions.md. Start with CRASH-01: continue the branch
lane/arch/crash-physics (worktree C:\Users\kyleb\.codex\worktrees\crash\the-duel-remake)
exactly as docs/changes/CRASH-01.md says. Then TITAN-01, then EGG-03 Muddy
Hollow in its six phases, then the rest of next-run.md in order (at most five
lanes; art sourcing and audio in their own lanes; art starts with a short list
for Kyle). The Wasteland is live as an easter egg: never add anything to the
main menu, keep new Wasteland features hidden until a player finds the gate,
and put every new feature behind a new dev switch. Write tests first. Gates:
lane tier and build before every merge; full tier after every 5 merges or 2
hours and at the end; update STATUS.md after every merge; run the after-merge
janitor after every merge and the sweep at the end. Never delete a branch for
being idle. Never touch the live folder, port 5174 or real saves. Do not
rewrite history or release; push integration/wasteland after each passing full
tier (D8). Budget for this run: until morning.
When the budget is nearly spent: finish cards in progress, run the full tier,
run the janitor sweep, update STATUS.md, write a short handoff at the end of
run-log.md, push, and stop.
```
