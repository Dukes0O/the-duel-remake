# OPEN-BURNED-PEN

The short board entry controls current state, ownership, dependencies and locks.

[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md` on 21 November 2026.
Rewritten on 26 November 2026 by Claude (Opus session) for what exists now, as OPEN-BURNED-SCOUT's card was: the
storyline file, the shared mission runner, the Rats' Nest's look and spots, the day clock, the hearth bank and the
apprentice run. Claude builds it.

## What to build

Section 21, Scene 4, and section 23's offer after a ransom, as beats of `src/story/threads/content/burned-camp.js`
that give the stubs `alone` and `drain` their ways out. Every word a player reads is as section 21 writes it.

1. **Driving in alone** (`alone`): the kind `fight`, by car, six buggies from the Nest's six bays, boxed in for six
   seconds or wrecked is lost, four wrecks is won. Won: Sump's line, the Road Rats to Raiding, the mark, and on to
   `gate` (the road home is OPEN-BURNED-RESCUE's). Lost: Sump's two lines, and the player is taken to the pen.
2. **Going in by the drain** (`drain`): the kind `heist`, on foot, with one guard whose round is a routine row (the
   people table's `track`, read by the same `routinePose`). His lamp takes the player after two seconds in it. The
   wrench is held on the chain for eight seconds. Out: Marigold's low line, Finch and two growers out, on to `home`.
3. **The pen** (`pen`): the player stands inside the ring of wrecks with the car held at the end of the row and the
   day at dusk. Marigold's and Finch's talk, Sump's call and Auntie Solder's answer on the radio, the three
   questions, the two thoughts and the three choices, in one talk.
4. **Waiting** (`waiting`, then `ransom`): the roam ends with the hearth banked without the player (the usual bank,
   one ember burned). At first light the ransom is paid by `src/world/open/ransom-rule.js`: the player's scrap first
   (the `scrap` effect, which `spendScrap` settles), then the town's till (a `town` posting), then an ember for each
   whole hundred both are short; and embers asked by the Word on the road, one at 1 or 2, two at 3 or more, one more
   after a caught break-out. Never below nothing. The car is given back as it is. The ember change's id names the
   ransom, so the apprentice run's offer or Cinder's line follows at the hearth (section 23, OPEN-APPRENTICE-RUN).
5. **Breaking out** (`break-out`): the kind `heist` from just outside the pen, with the same guard; up to three
   growers waved along by passing their hiding places. Out: Finch's line, the mark, the car stays with Sump. Caught:
   Sump's line, the price 220 and a second ember, back to the pen.
6. **Sump's offer** (`offer`): the talk; "You have my word" writes the promise and the mark
   `burned-camp/toll-promised` that "A toll on the Mall Road" reads, and frees the car; "No" goes back to the pen.
7. **The ledger and the tie-back:** each way in and out writes section 21's marks; Sump's rider says the tie-back at
   the next Road Rats' checkpoint, beside the stranded hauler's line in `parts/checkpoints.js`.

## Decided by Claude (26 November 2026)

- **The till** is what the town lets the land read (`world.town.till`). Today the town does not join the land, so
  the till pays nothing and no posting is written; the ransom then takes the car's scrap and the embers.
- **"An ember for each hundred"** counts whole hundreds. A shortfall under a hundred is let go.
- **The car** cannot be got into while it is held (pen, waiting, break-out, offer). A held beat that is met again in a
  new roam takes the player back to the pen. After a break-out the car stays held for the rest of that roam;
  bringing it home is OPEN-BURNED-RESCUE's.
- **Six buggies set off together.** The road riders cannot yet hold four back for twenty seconds.
- **The drain's mark** has its own sentence, as section 21 gives none: "You brought Finch and two growers out of the
  Rats' Nest by the drain."
- The Ash Men's rows of kind `creep` stay waiting; the card that casts the Ash Men moves them to `heist`.

## Files

Storyline: `burned-camp.js`. New: `src/world/open/ransom-rule.js`, `src/world/open/content/burned-pen.js` (spots, the
guard's round, the captives), `tools/test-burned-camp-pen.mjs`, `tools/scenarios/open-burned-pen.mjs`. Hooks:
`mission-kinds.js` (heist guards, a continuous light limit, a start, waving along; fight taken on a loss),
`parts/missions.js` (the land's clock to a kind), `parts/threads.js` (`takes`, `frees`, `leaves`, `ransom`, one talk
for questions and choices), `check-tables.js` (those beat keys), `open-land.js` and `day-rule.js` (dusk when taken),
`parts/people.js`, `parts/checkpoints.js`, `arena/modes/world-job.js` (`threadTaken`), `onfoot-transition.js` (the
held car), `tools/run-browser-scenarios.mjs`. No lock.

## Checks

1. `tools/test-burned-camp-pen.mjs`: each way in and out writes its ledger lines; the ransom takes scrap, then the
   till, then embers, never below nothing; Word 1 one ember, Word 3 two; a caught break-out 220 and a second ember; a
   store left at one ember or none brings the offer of section 23; the promise to Sump is on the page.
2. `node tools/thread-crossings.mjs --check`: only `home` left, owned by OPEN-BURNED-RESCUE.
3. `test-burned-camp`, `test-open-missions`, `test-open-threads`, `test-open-apprentice-run`, `test-open-state`,
   `test-thread-shape`, then rule 23's set with `--jobs 2` and `npm run build`.
4. Laptop only: the browser scenario `open-burned-pen`, one way through: the drain, not seen.

## Sound cues

`open.taken`: the pen's gate shutting. `open.ransom.paid`: scrap poured out on a bonnet. `open.pen.chain`: a chain
falling. `open.guard.shout`: one shout, far off. OPEN-SOUND registers them; an unregistered cue is not played.
