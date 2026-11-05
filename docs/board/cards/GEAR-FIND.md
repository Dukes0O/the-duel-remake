# GEAR-FIND

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 5 November: Gratian asked what happened to the flamethrower and the run where you get out
of your car. Design section 2. This is the first piece to go live.

**Build:**
1. `src/yard-things-to-try.js` (new, no state changes): rows for Flamethrower (weapon rank 9, `src/weapon-upgrades.js`),
   Getting out (on in any career, lists Mad Max Duel, Fuel Run, Convoy Raid, Ambush Alley, and says "Hold F"),
   Hand Flamer (Cinder, rank 12) and Ambush Alley (rank 12). Each row: one line, open or "Rank 9: you are rank 4"
   with a bar, and one button. `src/screen-yard-home.js` shows it on the home page, behind `gear-find`.
2. `src/screen-armory.js`: every car weapon is listed, locked ones with the rank and what it does; a newly opened
   weapon gets NEW and one FIT press (`equipCarWeapon`).
3. The Scrapdome panel shows a mode that is not open with its rank and a bar, instead of hiding it. Update
   `docs/SCRAPDOME.md` section 10's "A locked mode is not shown" line.

Rank numbers do not change. The button reads the same action as the existing Armory and setup buttons.

**Claude's review of the changed assertion (rule 18):** a test that says a locked mode is hidden changes to say
it is shown, disabled, with its rank: this is the point of the card and loosens nothing, as a locked mode still
cannot be started. Record it in the change note.

**Checks:** new `tools/test-gear-find.mjs`: a rank 1 career sees all four rows, each with the right rank and a
button; a rank 9 career sees the flamethrower open with FIT; pressing FIT fits it in a slot; a locked mode cannot
be started from its row. Claude runs: one look in the yard and Armory.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/GEAR-FIND.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.
