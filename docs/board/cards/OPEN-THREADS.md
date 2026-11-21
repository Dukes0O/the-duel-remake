# OPEN-THREADS

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md`.

## What to build

Sections 18 and 21 (Scenes 1 and 2).

1. **The thread rule.** A thread is one file: `reads`, `writes`, `cast`, `starts`, `sign`, `beats`, `ends`.
   `validateThread` checks it when the game is built, as `validateTalkScene` does a talk. A thread's record (its beat,
   cast, night begun and marks) is kept in the open record and moved only by the `thread` effect.
2. **Casting.** A role is filled from the sites or the groups that meet its condition, by a named draw, weighted
   where the role says. Lines take a role's names: "{camp.leader}", "{camp.thing}", "{enemy.name}".
3. **Signs.** `smoke` (a column from `src/world/smoke-column.js` at the role's place, seen within its distance, for
   its nights), `call` (a line on the radio), and `words` (a row in a person's talk table). Signs do not appear while
   `signs` is held.
4. **The director.** Run when a hearth is banked and when the player first enters a region that day. At most two
   signs alive and one thread in a mission; never two threads of one kind running; nothing begun on an act's last
   night; the pick is by weight and a named draw, and a thread's weight rises each night it could have begun.
5. **A tool,** `node tools/thread-crossings.mjs`, that prints every thread's reads and writes side by side.
6. **The burned camp, Scenes 1 and 2,** exactly as written: the smoke and its two thoughts; the keeper's line when a
   tower stands; the burned state of the camp; the six things to find, each with its thought; the four questions home
   by radio; what is gone if the player comes after the smoke; the two thoughts; the three ways to leave; the marks.
   The enemy role is cast now and the Road Rats' turn is the one built. A false trail is cast and its ash is drawn,
   with Cinder's answer; driving to the Grey Camp is a later card.

## Files and locks

New: `src/story/threads/thread-rule.js`, `src/story/threads/cast.js`, `src/story/threads/director.js`,
`src/story/threads/signs.js`, `src/story/threads/content/burned-camp.js`, `src/story/scenes/burned-camp.js`,
`src/world/open/sign-view.js`, `tools/thread-crossings.mjs`, `tools/test-open-threads.mjs`,
`tools/test-burned-camp.mjs`, `tools/scenarios/open-burned-camp.mjs`. Named hooks: the director's call where the
hearth is banked (`src/story/ledger-save.js`) and in the roam step; the burned state in `src/world/open/site-view.js`.
No lock.

## Checks

1. `tools/test-open-threads.mjs`: a thread file with a missing part is refused with a sentence that names the part;
   a role is cast the same way for one seed and from the player's own ledger; the director never keeps three signs
   alive, never begins two of one kind together, and begins nothing while `signs` is held; a thread's record replays
   to the same ledger.
2. `tools/test-burned-camp.mjs`: the thread cannot begin without a found camp that is Friendly; each thing found
   writes its mark; after two banked nights the tracks, ruts and pods are gone and the lamp, frames and pump are left;
   each of the three ways to leave writes what section 21 says.
3. Laptop only: the browser scenario `open-burned-camp` (a fixed seed; see the smoke, drive to it, find all six
   things, ask Cinder, drive home).

Rule 23 (behind an off switch): the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition`
with a `--filter` for each suite named above, and `npm run build`. It merges when that is green. Claude drives it in
the merged batch.

## Sound cues

`open.smoke.seen`: wind and one low note when the smoke first comes into view. `open.clue.found`: a small find.
No cue marks a thread beginning: the player learns of it from the sign.

## Rules for every open Scablands card

Design: [docs/story/open-scablands.md](../../story/open-scablands.md), the sections this card names; it wins over this
card where they differ. Everything is behind `story-choices`, and nothing the released game does with that switch off
may change. A rule is a plain function that returns new data and reads no graphics. Every draw is a named draw from the
save's seed (`src/rng.js`, as `namedThrow` in `src/story/ledger.js`). Every position is written with `land.at` or
`land.between` (`src/world/scablands-names.js`). Content is rows in tables: adding a person, a building, a checkpoint, a
site or a thread must need no change to a rule. Every word a player reads is a whole plain sentence with no em dash.
Stay inside the files named here. If another file is needed, write the choice under "Codex decided (Claude to review)"
and carry on, unless it touches saves or a released course; then stop and say so. Before CARD DONE, search `tools/` for
every older suite and scenario that names what this card changes, and run them. Checks use memory-only saves. Do not
clean up anything in Claude's scratchpad. A commit from the lane needs approval: rerun git and ask for it. Write
`docs/changes/OPEN-THREADS.md` with a **Removed** line.
