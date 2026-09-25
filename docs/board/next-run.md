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

## Phase 3: a Wasteland you can play (added 24 September 2026)

Phase 3 starts as soon as phase 2's remaining cards (GFX-01-P2, EGG-02-P2 and
GFX-02-P1) are merged or running in lanes; the career (CAR-01) and the
Scrapdome yard (GFX-04) it needs are already merged. The audio track (SPEC 0.9)
is not a phase: it keeps its own lane through phase 2 and phase 3.

### Order

| Order | Card | Done when |
| --- | --- | --- |
| 1 | **BETA-01** Playable beta | `wasteland2` and `hidden-road` move to `beta` so they appear under Experimental. A release candidate has the full release evidence: full tier on the exact commit, combat balance with `wasteland2` off and on, a browser scenario from the Hidden Road through the gate into the yard and a Wasteland race, frame pacing and the save budget. A short "What to try" note is in `docs/playtest-inbox.md`. **The release itself waits for Kyle's go-ahead** |
| 2 | **ARENA-01, ARENA-02** Scrapdome framework and Last Car Rolling | Free driving inside the yard's arena bounds, spawns, rounds and results, with up to three CPU cars (SPEC 3.7) |
| 3 | **WAR-01, first half of WAR-02** Warlords 1 to 3 | Warlord data and the ladder on the career's territory map, and the first three warlord fights (SPEC 3.9) |
| 4 | **ARS-01** Arsenal wave 1 | Oil Slick, Caltrops, Smoke Screen and Harpoon, each with a counter test, CPU use, and an arcade sound built to the audio rule below (SPEC 3.3) |
| 5 | Then, in this order | ARENA-03 to ARENA-05 (Fuel Run, Bounty Hunt, Ambush Alley); CREW-02 to CREW-04 (signature gear, boarding, CPU crews on foot); ARS-02 and ARS-03; the rest of WAR-02, then WAR-03 and WAR-04; ARENA-06 and ARENA-07 (Salt Flats, Convoy Raid) |
| 6 | Polish and release | Look, sound and feel rounds across the Wasteland (SPEC 10.1), then a release under D3 |

Kyle's play-test notes from the beta go to the top of the board as they arrive.

### The audio track, alongside

AUD-10 (sound bank and mixer) → AUD-11 (listening booth and checks) → wire the
kept gatekeeper line (cue `gatekeeper.welcome`) into the gate arrival → AUD-14
(combat: the approved blasts, crash and rocket launches, and crossbow **E**, the
pew whistle, with the hit-confirm sound; see `docs/changes/AUD-12.md`) →
AUD-17 (voices) → AUD-15 → AUD-16 → AUD-18.

- **Arcade rule for car weapons (Kyle):** a bright transient above the engine
  band, a tonal signature, a flight sound that travels with the projectile
  (3D and doppler) and a hit-confirm sound. Judge every weapon over the engine
  at full throttle, never alone.
- **ElevenLabs credits:** an overnight run may spend up to 1,500 credits on
  voice candidates for AUD-17. It never keeps a take; Kyle picks. Log credits
  used in the change note.
- New sounds come from Freesound (CC0 first) through `tools/audio/freesound.mjs`
  and are recorded in `tools/audio/catalog.json`.

## Start prompt

Paste into Codex from `C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake`.

```
You are the Director in autonomous mode for The Duel. Work in this folder
(integration/wasteland). Read AGENTS.md, docs/board/next-run.md (phase 2, phase 3
and the audio track), SPEC.md section 0 (especially 0.9), docs/board/STATUS.md and
docs/board/decisions.md. Finish phase 2's remaining cards, then work phase 3 in
the order given, with the audio track in its own lane throughout (at most five
lanes). Settle each card's open design question in writing before code, log
choices the spec does not settle in decisions.md, write tests first, then build.
BETA-01 prepares a release candidate; the release itself waits for Kyle.
Gates: lane tier and build before every merge; full tier after every 5 merges or
2 hours and at the end of the run; update STATUS.md after every merge. After every
successful merge run the after-merge janitor; run the sweep at the end. Never
delete a branch for being idle. Never touch the live folder, port 5174 or real
saves. Keep new features behind their switches. Do not rewrite history or
release; push integration/wasteland after each passing full tier (D8).
Budget for this run: <for example "until morning" or "about X% of my usage">.
When the budget is nearly spent: finish cards in progress, run the full tier, run
the janitor sweep, update STATUS.md, write a short handoff at the end of
run-log.md, push, and stop.
```
