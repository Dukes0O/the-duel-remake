# HOME-GROUND-4B

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Sol: rules and words), Home Ground's step 4, second half: the loot a won raid leaves. Needs HOME-GROUND-4
merged. Design: `docs/HOME_GROUND.md` section 9 ("After a raid he has won"). Behind `home-ground`; it changes the save,
so it keeps the lane tier and one independent review of the save (rule 23, "Not covered").

## Design, settled by Claude before code

**What is left.** After a won raid, each wrecked raider leaves a wreck where it stopped (a bike or a buggy, drawn with
the raider's own model, dented and dark), and the Rats drop one or two crates of scrap as they flee. Each piece is worth
scrap: a bike 6, a buggy 15, a crate 4. Pieces lie outside or inside his fence where they fell and wait across sittings.

**He fetches it himself** with Tin Town's flatbed: a tap of F within 4 m puts one piece on the bed; the bed holds up to
three. A tap beside his shed sets the whole load down, and its scrap goes into his store. He keeps all of it.

**Or he sends townspeople.** F at the board offers "Press F to send Tin Town's carters for the loot. They keep a fifth
as their pay." The carters fetch every piece over 1 hour of the real clock, counted while the game is off too, and
the board says what came in: "Tin Town's carters brought in 20 scrap and kept 5 as their pay." A fifth is rounded down
to whole scrap.

**The store** gains scrap alongside eggs; F at the shed door says both in one sentence.

**The save:** version 6 adds `loot` (pieces with kind, position and worth), `scrap` and `carters` (`{began}`). Version 5
and older load unchanged after the verified backup.

**Sound cues** to name: `home.loot.on`, `home.loot.off`, `home.carters.go`, `home.carters.back`.

## Checks

- `tools/test-home-ground.mjs` gains by behaviour: a won raid leaves one wreck per wrecked raider and one or two crates;
  three pieces fill the bed; unloading at the shed adds their worth; the carters keep a fifth, rounded down, after an
  hour of the real clock; a lost raid leaves nothing; a version 5 save loads unchanged.
- The lane tier, the rule 23 guards and `npm run build`. One independent review of the save. Claude drives it by hand.

## Claude answers

## Builder's assertion changes for Claude's review

- The two exact shed sentences now require both `31 eggs` and `0 scrap`, as this card specifies. Neither check is removed or loosened.
- The career-backup fixture loop now also covers version 5. Versions 1 to 4 still require a new tower stack; version 5 must keep its existing tower load, raid counts and fallen panel.
- The hens suite's enabled upgrade now expects version 6 instead of 5. Its exact checks for the old name, pieces and marks stay in place.
