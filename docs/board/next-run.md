# Next run: phase 2, features on a clean base (written 24 September 2026)

The cleanup phase is finished. This is the one current plan for Codex. Rules:
`AGENTS.md` (the nine working rules and the janitor) and SPEC.md section 0.

## Where things stand

- **Live game:** `master` at `eb879e5`, unchanged.
- **Development:** `integration/wasteland`. All ten cleanup cards are merged.
  Full tier 238 of 238 on the final cleanup commit. Build about 255 MB (was
  487 MB), no `.blend` in the build, `docs/` under 1 MB, only `master` and
  `integration/wasteland` branches, no lane folders.
- **Switches:** `wasteland2`, `hidden-road` and `career-backup` are `dev`.
- **Asset sizes:** build, Wasteland models (about 74 MB) and `wall.glb` remain
  above their advisory targets for the reasons recorded in
  `docs/ASSET_PIPELINE.md`. Revisit when the art is remade below.

## What this phase must decide and build

This phase has real design questions. Settle each one in writing before its
code: a short design section in the card's change note, with the choice, the
reason and how to reverse it, logged in `docs/board/decisions.md` when the spec
does not already answer it. Then tests, then code.

### First: tidy the board (Director, before any lane starts)

- Remove the false chain that makes GFX-01-P1, GFX-02-P1 and EGG-02-P1 wait for
  GFX-04. Art polish does not depend on the career, kits or yard.
- Close or re-slice stale cards whose branches are gone: BUG-06 and BUG-07
  (fold the remaining balance work into BAL-02 below), CREW-01 (keep only the
  perks that wait for boarding, fire and shove mechanics, as backlog), AUD-01,
  AUD-02 and TOOL-02 (finish what is left or close them with a note).

### Then these lanes, in parallel (at most five at once; the fifth is audio)

| Lane | Card | The open question to settle first | Done when |
| --- | --- | --- | --- |
| SAVE, UI | **CAR-01** Wasteland career, scrap and territory map (SPEC 0.4) | Scrap earn rates and prices; which courses form each warlord's territory; how a "hold" on a territory grows and what full hold unlocks; the `profile.wasteland` save shape and migration | A new player's career works end to end behind `wasteland2`: earn scrap, spend it, see territory progress on the map; every historical save fixture migrates without loss after a backup |
| ART, VIS | **GFX-01-P1** Crew, changed technique (SPEC 0.3) | Whether continuous body meshes with baked textures in Blender beat the round-3 approach. Prove it on one crew member (Rook) first, compared with round 3, before converting all eight | Heads joined to necks, no stretched textures, real hair and faces; likeness 4 of 5 in game for all eight, or the remaining gap and the next approach recorded |
| ART, VIS | **EGG-02-P1** Rustwall and wash polish | How to replace the repeated rock columns with natural banks, and richer wall materials without blowing the frame budget | Resemblance 4 of 5, frame cost held; `wall.glb` closer to its size target |
| AUDIO | **AUD-10** first, then the audio cards in SPEC 0.9 order | How to move every sound into a data-driven sound bank and mixer with no audible change, so later sounds are a file plus one data entry | As SPEC 0.9 AUD-10; then AUD-11 onward in order |
| CMB | **BAL-02** Combat that pays off (replaces the rest of BUG-06 and BUG-07) | Why the player wrecked no CPU car in 30 scripted races, and why the Easy CPU lands 6 hits (target 0 to 3) with `wasteland2` on | With `wasteland2` on: win rates stay in their bands, Easy CPU hits 0 to 3, and a strong scripted policy wrecks CPU cars |

### After those

- **GFX-02-P1** first-person hands follow GFX-01-P1's winning technique.
- **GFX-03** war rigs and kits on nine cars, bought with scrap (needs CAR-01).
- **GFX-04** the Scrapdome yard as the real inside of the gate and the
  Wasteland home screen, showing the territory map (needs CAR-01). Today the
  gate still leads to a temporary endpoint.

## Rules to watch

- Every art round: in-game capture compared with the reference, scored, one
  compressed sheet of 500 KB or less committed, raw captures deleted.
- If two rounds do not raise the likeness score, change the approach.
- After every merge, the janitor deletes that lane's branch, folder and used
  evidence. Never delete a branch for being idle.
- Sizes are advisory targets; record why an asset grows.
- Push `integration/wasteland` after each passing full tier (D8). Compaction
  (history rewrite) still needs Kyle's approval.

## Start prompt

Paste into Codex from `C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake`.

```
You are the Director in autonomous mode for The Duel, phase 2. Work in this folder
(integration/wasteland). Read AGENTS.md first, including the nine working rules and
the janitor, then docs/board/next-run.md, SPEC.md section 0 (especially 0.2, 0.3,
0.4 and 0.6), docs/board/STATUS.md and docs/board/decisions.md.
First tidy the board as next-run.md says: remove the false dependency of the art
polish cards on GFX-04, and close or re-slice the stale cards. Then run CAR-01,
GFX-01-P1, EGG-02-P1 and BAL-02 as parallel lanes, plus the audio lane from
SPEC 0.9 starting with AUD-10 (at most five lanes). For each card,
settle its open design question in writing before code, log choices the spec does
not settle in decisions.md, write tests first, then build. For GFX-01-P1, prove the
new technique on Rook before converting the whole crew.
Gates: lane tier and build before every merge; full tier after every 5 merges or
2 hours and at the end of the run; update STATUS.md after every merge. After every
successful merge, run the after-merge janitor. Run the janitor sweep at the end.
Never delete a branch for being idle. Never touch the live folder, port 5174 or
real saves. Keep new features behind their switches. Do not rewrite history or
release unless Kyle approves it in writing; push integration/wasteland after each
passing full tier (D8).
Budget for this run: <for example "until morning" or "about X% of my usage">.
When the budget is nearly spent: finish cards in progress, run the full tier, run
the janitor sweep, update STATUS.md, write a short handoff at the end of
run-log.md, push, and stop.
```
