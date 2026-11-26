# OPEN-THREADS

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md`.

## Re-cut on 25 November 2026: read this first

**Built at the same time as the other open Scablands cards** (Kyle, 25 November 2026). OPEN-SHARED is merged and
holds what this card once waited for. Where this section and the rest of the card differ, this section wins.

- **Read `src/world/open/open-land.js` first.** It is the contract between the parts of the open land.
- **Use these, and do not write them again:** `isTrue` and `checkFact` (`facts.js`); `applyEffects` (`open-effects.js`),
  which is the only way to change the world; the world and its readers (`open-record.js`); holds (`holds.js`); the
  register (`register.js`; a new name is a row there and in `src/story/people.js`); the table checks
  (`check-tables.js`; load every table through `requireSound`); the sample worlds (`samples.js`; every test of a rule
  starts from one of them).
- **Do not edit** `open-land.js`, `parts.js`, `open-view.js`, `content/people.js`, `content/talk-tables.js`,
  `src/app.js`, or a part, a view or a content file that belongs to another card.
- **Where this card needs something that another card is building today,** use a stand-in of your own inside your own
  files, say so under "Codex decided (Claude to review)", and the laptop joins the two at the merge.
- `node tools/test-open-shared.mjs` must still pass, and is one of this card's checks.

**Already built by OPEN-SHARED, so not this card's work:** `checkThread` in `src/world/open/check-tables.js` is
`validateThread`; the `thread` effect and a storyline's record (`world.open.threads`); the `signs` hold. **Item 5,
the tool, is OPEN-CROSSINGS's.**

**This card's rules live in its part,** `src/world/open/parts/threads.js` (the director, the signs alive and each
storyline's beats, run from the roam job), and its drawing in `src/world/open/sign-view.js`. The director also runs
where a hearth is banked (`src/story/ledger-save.js`, a named hook). A sign does not appear while
`isHeld(context.holds, 'signs')`.

**Changed from the card as first cut:**

- **The camp's burned state is a stage,** set with the `site` effect. OPEN-SITES draws a site by its stage; do not
  edit `src/world/open/site-view.js`.
- **The six things to find stand at the named spots of the Glasshouse's layout**
  (`src/world/open/looks/glasshouse-look.js`, built today in the cloud). If it has not merged, use spots of your own
  with the same names (`frames`, `lamp`, `tracks`, `ruts`, `pods`, `pump`) and say so.
- **Sites and their positions are OPEN-SITES's, built today.** Test against the sample worlds `helped-camp` and
  `after-the-smoke`, with the Glasshouse at the first position in OPEN-SITES's "Claude answers".
- The storyline's file passes `checkThread`: its marks begin with `burned-camp/`, and it names no other storyline.
- **Roles.** A storyline writes `'@camp'`, `'@camp.people'` and `'@enemy'` in its conditions and effects, and
  `{camp.leader}` in its lines. `src/world/open/roles.js` is built: the storyline rule calls `resolveRoles` with the
  cast before it asks or changes anything, and `fillLine` before it shows a line. Do not write them again.
- **Draws.** The storyline rule asks every condition of a storyline with
  `{draw: '<storyline id>/night-<night>'}` as the subject, so that a draw named `start` is drawn afresh each night.
- **Holds.** A beat that holds the checkpoints and the signs inside a roam job takes the hold through the part's
  return (`hold: {holder, systems}`) and lets go with `release`.
- **A sign that is a person's words** is a row in `src/world/open/content/talk-threads.js`.
- **The shape.** Section 18 now has a part, "The one shape of a storyline's file". Build the storyline rule to read
  that shape and nothing else, and write the burned camp's file in it: `when` for every condition, `next` for where
  anything leads (the rule itself makes the `thread` effect; a file never writes one), the conditions `reach`,
  `after`, `nights`, `seconds`, `part`, `cast`, `asked`, `found`, `chose` and `due`, the `mission` object, `later`
  and `ignored`. Nine other storylines are already written (`src/story/threads/content/`) and OPEN-THREAD-SHAPE is
  bringing them to the same shape today; do not load them or edit them in this card. The rule should need no change
  to play them later.

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
